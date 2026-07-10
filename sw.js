const APP_VERSION = "__APP_VERSION__";
const CACHE_NAME = `n-smart-phone-${APP_VERSION}`;
const HANDOFF_PROTOCOLS = new Set(["sms:", "viber:"]);
const HANDOFF_HOSTS = new Set(["wa.me"]);

const APP_SHELL = [
  "/",
  "/index.html",
  "/offline.html",
  "/manifest.webmanifest",
  `/src/app.js?v=${APP_VERSION}`,
  `/src/firebase-client.js?v=${APP_VERSION}`,
  `/src/styles.css?v=${APP_VERSION}`,
  "/icons/icon.svg"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const requestUrl = new URL(request.url);

  if (requestUrl.pathname === "/src/firebase-config.generated.json") {
    event.respondWith(fetch(request));
    return;
  }

  if (requestUrl.pathname === "/src/app-version.generated.json") {
    event.respondWith(fetch(request));
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() => caches.match("/offline.html"))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        if (!response || response.status !== 200 || response.type !== "basic") {
          return response;
        }

        const responseClone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
        return response;
      });
    })
  );
});

self.addEventListener("push", (event) => {
  let payload = {
    title: "Pending message request",
    body: "Open N Smart Phone to review it.",
    url: "/?view=pending"
  };

  if (event.data) {
    try {
      payload = { ...payload, ...event.data.json() };
    } catch {
      payload.body = event.data.text();
    }
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: "/icons/icon.svg",
      badge: "/icons/icon.svg",
      data: {
        url: payload.appUrl || payload.url || "/?view=pending",
        appUrl: payload.appUrl || payload.url || "/?view=pending",
        handoffUrl: payload.handoffUrl || "",
        requestId: payload.requestId || "",
        channel: payload.channel || ""
      }
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const data = event.notification.data || {};
  const appUrl = resolveAppUrl(data.appUrl || data.url || "/");
  const handoffUrl = resolveHandoffUrl(data.handoffUrl || "");

  event.waitUntil(
    handleNotificationClick({ ...data, appUrl, handoffUrl })
  );
});

async function handleNotificationClick(data) {
  await notifyOpenClients(data);

  if (data.handoffUrl) {
    const opened = await tryOpenWindow(data.handoffUrl);
    if (opened) return undefined;
  }

  return focusOrOpenApp(data.appUrl);
}

async function notifyOpenClients(data) {
  const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });

  for (const client of clients) {
    client.postMessage({
      type: "notification-clicked",
      requestId: data.requestId || "",
      channel: data.channel || "",
      appUrl: data.appUrl || "",
      handoffUrl: data.handoffUrl || ""
    });
  }

  return clients;
}

async function focusOrOpenApp(appUrl) {
  const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });

  for (const client of clients) {
    if ("navigate" in client) {
      try {
        const navigatedClient = await client.navigate(appUrl);
        return (navigatedClient || client).focus();
      } catch {
        return client.focus();
      }
    }

    if ("focus" in client) {
      return client.focus();
    }
  }

  return tryOpenWindow(appUrl);
}

async function tryOpenWindow(url) {
  if (!self.clients.openWindow || !url) return false;

  try {
    await self.clients.openWindow(url);
    return true;
  } catch {
    return false;
  }
}

function resolveAppUrl(value) {
  try {
    const url = new URL(value || "/", self.location.origin);
    return url.origin === self.location.origin ? url.href : new URL("/", self.location.origin).href;
  } catch {
    return new URL("/", self.location.origin).href;
  }
}

function resolveHandoffUrl(value) {
  if (!value) return "";

  try {
    const url = new URL(value, self.location.origin);

    if (url.protocol === "https:" && HANDOFF_HOSTS.has(url.hostname)) {
      return url.href;
    }

    if (HANDOFF_PROTOCOLS.has(url.protocol)) {
      return url.href;
    }
  } catch {
    return "";
  }

  return "";
}
