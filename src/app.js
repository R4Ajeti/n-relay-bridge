import {
  createEmailPasswordAccount,
  loadFirebaseConfig,
  readRealtimePath,
  refreshFirebaseSession,
  signInWithEmailPassword,
  writeRealtimePath
} from "./firebase-client.js";

const STORAGE = {
  profile: "nsp.profile",
  devices: "nsp.devices",
  requests: "nsp.requests",
  firebaseAuth: "nsp.firebaseAuth",
  notifiedRequests: "nsp.notifiedRequests"
};

const CHANNEL_LABELS = {
  whatsapp: "WhatsApp",
  viber: "Viber",
  sms: "SMS/iMessage"
};

const selectors = {
  appVersion: document.querySelector("#app-version"),
  swStatus: document.querySelector("#sw-status"),
  notificationStatus: document.querySelector("#notification-status"),
  cloudStatus: document.querySelector("#cloud-status"),
  notifyButton: document.querySelector("#notify-button"),
  profileForm: document.querySelector("#profile-form"),
  accountId: document.querySelector("#account-id"),
  deviceName: document.querySelector("#device-name"),
  platform: document.querySelector("#platform"),
  role: document.querySelector("#role"),
  currentDeviceLabel: document.querySelector("#current-device-label"),
  currentDeviceMeta: document.querySelector("#current-device-meta"),
  authForm: document.querySelector("#auth-form"),
  authEmail: document.querySelector("#auth-email"),
  authPassword: document.querySelector("#auth-password"),
  authSubmitButtons: document.querySelectorAll("#auth-form button[type='submit']"),
  signOutButton: document.querySelector("#sign-out-button"),
  authLabel: document.querySelector("#auth-label"),
  authMeta: document.querySelector("#auth-meta"),
  linkForm: document.querySelector("#link-form"),
  linkedDeviceName: document.querySelector("#linked-device-name"),
  linkedDevicePlatform: document.querySelector("#linked-device-platform"),
  deviceList: document.querySelector("#device-list"),
  requestForm: document.querySelector("#request-form"),
  recipient: document.querySelector("#recipient"),
  channel: document.querySelector("#channel"),
  targetDevice: document.querySelector("#target-device"),
  message: document.querySelector("#message"),
  requestList: document.querySelector("#request-list"),
  clearCompleted: document.querySelector("#clear-completed"),
  exportButton: document.querySelector("#export-button"),
  syncPayload: document.querySelector("#sync-payload"),
  copyPayload: document.querySelector("#copy-payload"),
  importButton: document.querySelector("#import-button"),
  toast: document.querySelector("#toast"),
  authScreen: document.querySelector("#auth-screen"),
  appShell: document.querySelector("#main"),
  gatedPanels: document.querySelectorAll(".gated-panel")
};

let state = {
  profile: load(STORAGE.profile, null),
  devices: load(STORAGE.devices, []),
  requests: load(STORAGE.requests, []),
  firebaseAuth: load(STORAGE.firebaseAuth, null),
  notifiedRequests: load(STORAGE.notifiedRequests, {})
};

const firebaseRuntime = {
  config: null,
  configured: false,
  reason: "loading",
  saveTimer: null,
  pushing: false,
  syncing: false,
  pollTimer: null
};

const channel = "BroadcastChannel" in window ? new BroadcastChannel("nsp-sync") : null;
const launchParams = new URLSearchParams(window.location.search);
const launchIntent = {
  view: launchParams.get("view"),
  requestId: launchParams.get("request"),
  handoff: launchParams.get("handoff") === "1",
  focused: false,
  handoffStarted: false
};

function load(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function save(options = {}) {
  const { remote = true } = options;

  localStorage.setItem(STORAGE.profile, JSON.stringify(state.profile));
  localStorage.setItem(STORAGE.devices, JSON.stringify(state.devices));
  localStorage.setItem(STORAGE.requests, JSON.stringify(state.requests));
  localStorage.setItem(STORAGE.notifiedRequests, JSON.stringify(state.notifiedRequests));

  if (state.firebaseAuth) {
    localStorage.setItem(STORAGE.firebaseAuth, JSON.stringify(state.firebaseAuth));
  } else {
    localStorage.removeItem(STORAGE.firebaseAuth);
  }

  if (remote) {
    scheduleCloudSave();
  }
}

function uid(prefix) {
  if ("crypto" in window && "randomUUID" in crypto) {
    return `${prefix}_${crypto.randomUUID()}`;
  }

  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function now() {
  return new Date().toISOString();
}

function shortId(id) {
  return String(id || "").replace(/[^a-zA-Z0-9]/g, "").slice(-6) || "unknown";
}

function text(value) {
  return String(value ?? "").trim();
}

function toast(message) {
  selectors.toast.textContent = message;
  selectors.toast.classList.add("show");
  window.clearTimeout(toast.timer);
  toast.timer = window.setTimeout(() => selectors.toast.classList.remove("show"), 2400);
}

function detectPlatform() {
  const ua = navigator.userAgent.toLowerCase();

  if (ua.includes("iphone") || ua.includes("ipad") || ua.includes("ipod")) return "ios";
  if (ua.includes("android")) return "android";
  return "other";
}

function ensureDefaults() {
  if (!state.profile) {
    state.profile = {
      deviceId: uid("device"),
      accountId: state.firebaseAuth?.uid || `acct-${Math.random().toString(36).slice(2, 8)}`,
      deviceName: detectPlatform() === "ios" ? "iPhone Sender" : "Android Control",
      platform: detectPlatform(),
      role: detectPlatform() === "ios" ? "sender" : "control",
      createdAt: now(),
      updatedAt: now()
    };
  }

  if (state.firebaseAuth?.uid) {
    state.profile.accountId = state.firebaseAuth.uid;
    upsertCurrentDevice();
  }

  save({ remote: false });
}

function render() {
  renderProfile();
  renderAuth();
  renderDevices();
  renderTargetOptions();
  renderRequests();
  renderAccess();
  updateNotificationStatus();
}

function renderProfile() {
  const { profile } = state;
  selectors.accountId.value = profile.accountId;
  selectors.accountId.disabled = Boolean(state.firebaseAuth?.uid);
  selectors.deviceName.value = profile.deviceName;
  selectors.platform.value = profile.platform;
  selectors.role.value = profile.role;
  selectors.currentDeviceLabel.textContent = profile.deviceName;
  selectors.currentDeviceMeta.textContent = `${profile.platform.toUpperCase()} / ${profile.role} / device #${shortId(profile.deviceId)}`;
}

function renderAuth() {
  const signedIn = Boolean(state.firebaseAuth?.uid);
  const configured = firebaseRuntime.configured;

  selectors.authSubmitButtons.forEach((button) => {
    button.disabled = !configured || signedIn;
  });

  selectors.signOutButton.disabled = !signedIn;
  selectors.signOutButton.classList.toggle("is-visible", signedIn);
  selectors.signOutButton.hidden = !signedIn;

  if (state.firebaseAuth?.email && document.activeElement !== selectors.authEmail) {
    selectors.authEmail.value = state.firebaseAuth.email;
  }

  if (signedIn) {
    selectors.authLabel.textContent = "Firebase signed in";
    selectors.authMeta.textContent = `${state.firebaseAuth.email || "Firebase user"} / ${state.firebaseAuth.uid}`;
    setCloudStatus("Cloud signed in", "ready");
    return;
  }

  if (configured) {
    selectors.authLabel.textContent = "Firebase ready";
    selectors.authMeta.textContent = "Sign in to sync devices and requests.";
    setCloudStatus("Cloud ready", "warn");
    return;
  }

  selectors.authLabel.textContent = "Local mode";
  selectors.authMeta.textContent = firebaseRuntime.reason === "loading"
    ? "Checking Firebase config."
    : "Firebase config not generated.";
  setCloudStatus("Cloud local", "warn");
}

function renderAccess() {
  const signedIn = isSignedIn();
  const gatedControls = [
    ...selectors.profileForm.elements,
    selectors.notifyButton,
    ...selectors.linkForm.elements,
    ...selectors.requestForm.elements,
    selectors.clearCompleted,
    selectors.exportButton,
    selectors.syncPayload,
    selectors.copyPayload,
    selectors.importButton,
    ...selectors.deviceList.querySelectorAll("button"),
    ...selectors.requestList.querySelectorAll("button, a")
  ].filter(Boolean);

  selectors.appShell.classList.toggle("is-locked", !signedIn);
  selectors.appShell.classList.toggle("is-hidden", !signedIn);
  selectors.appShell.hidden = !signedIn;
  selectors.authScreen.classList.toggle("is-hidden", signedIn);
  selectors.authScreen.hidden = signedIn;
  selectors.gatedPanels.forEach((panel) => panel.setAttribute("aria-disabled", String(!signedIn)));

  gatedControls.forEach((control) => {
    if (control.tagName === "A") {
      control.setAttribute("aria-disabled", String(!signedIn));
      control.tabIndex = signedIn ? 0 : -1;
      return;
    }

    control.disabled = !signedIn;
  });
}

function renderDevices() {
  if (state.devices.length === 0) {
    selectors.deviceList.innerHTML = `<div class="empty-state">No linked devices.</div>`;
    return;
  }

  selectors.deviceList.innerHTML = state.devices.map((device) => `
    <article class="list-item">
      <div>
        <strong>${escapeHtml(device.name)}</strong>
        <p>${escapeHtml(device.platform.toUpperCase())} / ${escapeHtml(device.role || "sender")} / #${escapeHtml(shortId(device.id))}${device.id === state.profile.deviceId ? " / current" : ""}${device.source === "manual" ? " / manual" : ""}</p>
      </div>
      ${device.id === state.profile.deviceId ? "" : `<button class="text-button" type="button" data-remove-device="${device.id}">Remove</button>`}
    </article>
  `).join("");
}

function renderTargetOptions() {
  const senderDevices = state.devices.filter((device) => ["sender", "both"].includes(device.role || "sender"));
  const devices = senderDevices.length ? senderDevices : state.devices;
  const options = devices.map((device) => `
    <option value="${device.id}">${escapeHtml(device.name)} (${escapeHtml(device.platform)} #${escapeHtml(shortId(device.id))}${device.source === "manual" ? " manual" : ""})</option>
  `);

  selectors.targetDevice.innerHTML = options.join("");
}

function renderRequests() {
  const visibleRequests = [...state.requests].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  if (visibleRequests.length === 0) {
    selectors.requestList.innerHTML = `<div class="empty-state">No message requests.</div>`;
    return;
  }

  selectors.requestList.innerHTML = visibleRequests.map((request) => {
    const target = state.devices.find((device) => device.id === request.targetDeviceId);
    const links = buildLinks(request);

    return `
      <article class="request-card ${request.status === "sent_by_user" ? "done" : ""}" data-request-card="${escapeHtml(request.id)}">
        <div>
          <div class="request-meta">
            <span class="tag ready">${escapeHtml(CHANNEL_LABELS[request.channel])}</span>
            <span class="tag">${escapeHtml(request.status.replaceAll("_", " "))}</span>
            <span class="tag">${escapeHtml(target ? `${target.name} #${shortId(target.id)}` : "Unknown device")}</span>
          </div>
          <h3>${escapeHtml(request.recipient)}</h3>
          <p class="request-message">${escapeHtml(request.message)}</p>
        </div>
        <div class="request-actions">
          <button class="secondary-action" type="button" data-copy-message="${request.id}">Copy</button>
          <a href="${links.whatsapp}" data-open-request="${request.id}" data-channel="whatsapp">WhatsApp</a>
          <a href="${links.viber}" data-open-request="${request.id}" data-channel="viber">Viber</a>
          <a href="${links.sms}" data-open-request="${request.id}" data-channel="sms">SMS</a>
          <button class="secondary-action" type="button" data-mark-sent="${request.id}">Sent</button>
          <button class="danger-action" type="button" data-cancel-request="${request.id}">Cancel</button>
        </div>
      </article>
    `;
  }).join("");
}

function buildLinks(request) {
  const message = encodeURIComponent(request.message);
  const phoneForWhatsapp = request.recipient.replace(/[^\d]/g, "");
  const phoneForSms = request.recipient.replace(/[^\d+.-]/g, "");
  const smsBodySeparator = phoneForSms && detectPlatform() === "ios" ? "&" : "?";

  return {
    whatsapp: phoneForWhatsapp ? `https://wa.me/${phoneForWhatsapp}?text=${message}` : `https://wa.me/?text=${message}`,
    viber: `viber://forward?text=${message}`,
    sms: `sms:${phoneForSms}${message ? `${smsBodySeparator}body=${message}` : ""}`
  };
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function copyText(value, successMessage) {
  try {
    await navigator.clipboard.writeText(value);
    toast(successMessage);
  } catch {
    selectors.syncPayload.value = value;
    selectors.syncPayload.select();
    toast("Text selected");
  }
}

function upsertCurrentDevice() {
  const index = state.devices.findIndex((device) => device.id === state.profile.deviceId);
  const currentDevice = {
    id: state.profile.deviceId,
    accountId: state.profile.accountId,
    name: state.profile.deviceName,
    platform: state.profile.platform,
    role: state.profile.role,
    trusted: true,
    current: true,
    source: "self",
    lastSeenAt: now(),
    createdAt: state.profile.createdAt,
    updatedAt: now()
  };

  state.devices = state.devices.map((device) => ({ ...device, current: device.id === state.profile.deviceId }));

  if (index >= 0) {
    state.devices[index] = { ...state.devices[index], ...currentDevice };
  } else {
    state.devices.unshift(currentDevice);
  }
}

function exportPayload() {
  return JSON.stringify({
    schema: "n-smart-phone/sync-v1",
    exportedAt: now(),
    accountId: state.profile.accountId,
    devices: state.devices,
    requests: state.requests
  }, null, 2);
}

function mergePayload(payload, options = {}) {
  const { broadcast = true } = options;

  if (!payload || payload.schema !== "n-smart-phone/sync-v1") {
    throw new Error("Unsupported payload");
  }

  if (payload.accountId && payload.accountId !== state.profile.accountId) {
    throw new Error("Account ID mismatch");
  }

  state.devices = mergeById(state.devices, payload.devices || []);
  state.requests = mergeById(state.requests, payload.requests || []);
  upsertCurrentDevice();
  save();
  render();

  if (broadcast) {
    channel?.postMessage({ type: "sync", payload: exportPayload() });
  }
}

function mergeById(localItems, remoteItems) {
  const itemMap = new Map(localItems.map((item) => [item.id, item]));

  for (const remoteItem of remoteItems) {
    const localItem = itemMap.get(remoteItem.id);
    itemMap.set(remoteItem.id, chooseNewest(localItem, remoteItem));
  }

  return [...itemMap.values()];
}

function chooseNewest(localItem, remoteItem) {
  if (!localItem) return remoteItem;

  const localTime = localItem.updatedAt || localItem.createdAt || "";
  const remoteTime = remoteItem.updatedAt || remoteItem.createdAt || "";
  return remoteTime > localTime ? { ...localItem, ...remoteItem } : localItem;
}

function handleProfileSubmit(event) {
  event.preventDefault();

  if (!requireSignIn()) return;

  state.profile = {
    ...state.profile,
    accountId: state.firebaseAuth?.uid || text(selectors.accountId.value),
    deviceName: text(selectors.deviceName.value),
    platform: selectors.platform.value,
    role: selectors.role.value,
    updatedAt: now()
  };

  upsertCurrentDevice();
  save();
  render();
  toast("Device saved");
}

async function handleAuthSubmit(event) {
  event.preventDefault();

  if (!firebaseRuntime.configured) {
    toast("Firebase config missing");
    return;
  }

  const email = text(selectors.authEmail.value);
  const password = selectors.authPassword.value;
  const action = event.submitter?.value || "sign-in";

  if (!email || !password) {
    toast("Email and password required");
    return;
  }

  try {
    setCloudStatus(action === "create" ? "Cloud creating" : "Cloud signing in", "warn");
    const session = action === "create"
      ? await createEmailPasswordAccount(firebaseRuntime.config, email, password)
      : await signInWithEmailPassword(firebaseRuntime.config, email, password);

    state.firebaseAuth = session;
    state.profile.accountId = session.uid;
    upsertCurrentDevice();
    selectors.authPassword.value = "";
    save({ remote: false });
    render();
    await syncCloudState({ notify: true, push: true });
    startRequestWatcher();
    focusRequestedView();
    toast(action === "create" ? "Account created" : "Signed in");
  } catch (error) {
    setCloudStatus("Cloud auth failed", "warn");
    toast(error.message || "Firebase login failed");
  }
}

function handleSignOut() {
  clearSession();
  render();
  toast("Signed out");
}

function clearSession() {
  stopRequestWatcher();
  window.clearTimeout(firebaseRuntime.saveTimer);
  state.firebaseAuth = null;
  state.devices = [];
  state.requests = [];
  state.notifiedRequests = {};
  save({ remote: false });
}

function handleLinkSubmit(event) {
  event.preventDefault();

  if (!requireSignIn()) return;

  const name = text(selectors.linkedDeviceName.value);

  if (!name) {
    toast("Device label required");
    return;
  }

  state.devices.push({
    id: uid("device"),
    accountId: state.profile.accountId,
    name,
    platform: selectors.linkedDevicePlatform.value,
    role: "sender",
    trusted: true,
    current: false,
    source: "manual",
    createdAt: now(),
    updatedAt: now()
  });

  selectors.linkedDeviceName.value = "";
  save();
  render();
  toast("Device linked");
}

function handleRequestSubmit(event) {
  event.preventDefault();

  if (!requireSignIn()) return;

  const request = {
    id: uid("request"),
    userId: state.profile.accountId,
    createdByDeviceId: state.profile.deviceId,
    targetDeviceId: selectors.targetDevice.value || state.profile.deviceId,
    channel: selectors.channel.value,
    recipient: text(selectors.recipient.value),
    message: text(selectors.message.value),
    status: "pending",
    createdAt: now(),
    updatedAt: now()
  };

  state.requests.push(request);
  selectors.requestForm.reset();
  selectors.channel.value = request.channel;
  save();
  render();
  toast("Request created");
}

function handleDeviceListClick(event) {
  if (!requireSignIn()) return;

  const id = event.target.closest("[data-remove-device]")?.dataset.removeDevice;
  if (!id) return;

  state.devices = state.devices.filter((device) => device.id !== id);
  save();
  render();
  toast("Device removed");
}

async function handleRequestListClick(event) {
  if (!requireSignIn()) {
    event.preventDefault();
    return;
  }

  const copyId = event.target.closest("[data-copy-message]")?.dataset.copyMessage;
  const sentId = event.target.closest("[data-mark-sent]")?.dataset.markSent;
  const cancelId = event.target.closest("[data-cancel-request]")?.dataset.cancelRequest;
  const openElement = event.target.closest("[data-open-request]");

  if (copyId) {
    const request = state.requests.find((item) => item.id === copyId);
    if (request) await copyText(request.message, "Message copied");
    return;
  }

  if (sentId) {
    updateRequestStatus(sentId, "sent_by_user");
    toast("Marked sent");
    return;
  }

  if (cancelId) {
    updateRequestStatus(cancelId, "cancelled");
    toast("Request cancelled");
    return;
  }

  if (openElement) {
    event.preventDefault();
    const request = state.requests.find((item) => item.id === openElement.dataset.openRequest);
    if (!request) return;

    await openExternalRequest(request, openElement.dataset.channel);
  }
}

async function openExternalRequest(request, channelName = request.channel, options = {}) {
  const { copySms = true } = options;
  const links = buildLinks(request);
  const targetUrl = links[channelName];

  if (!targetUrl) {
    toast("Unsupported channel");
    return;
  }

  if (channelName === "sms" && copySms) {
    await copyText(request.message, "Message copied for SMS");
  }

  updateRequestStatus(request.id, "opened");
  toast(`Opening ${CHANNEL_LABELS[channelName] || "message app"}`);

  window.setTimeout(() => {
    window.location.href = targetUrl;
  }, 80);
}

function updateRequestStatus(id, status) {
  if (!requireSignIn()) return;

  state.requests = state.requests.map((request) => (
    request.id === id ? { ...request, status, updatedAt: now() } : request
  ));
  save();
  render();
}

function clearCompleted() {
  if (!requireSignIn()) return;

  state.requests = state.requests.filter((request) => !["sent_by_user", "cancelled"].includes(request.status));
  save();
  render();
  toast("Done requests cleared");
}

function updateNotificationStatus() {
  if (!("Notification" in window)) {
    selectors.notificationStatus.textContent = "Notifications unsupported";
    selectors.notificationStatus.className = "status-pill warn";
    selectors.notifyButton.textContent = "Notifications Unsupported";
    selectors.notifyButton.disabled = true;
    return;
  }

  const permission = Notification.permission;
  selectors.notificationStatus.textContent = permission === "granted" ? "Notifications ready" : `Notifications ${permission}`;
  selectors.notificationStatus.className = permission === "granted" ? "status-pill ready" : "status-pill warn";
  selectors.notifyButton.textContent = permission === "granted"
    ? "Test Notification"
    : permission === "denied"
      ? "Notifications Blocked"
      : "Enable Notifications";
  selectors.notifyButton.disabled = !isSignedIn() || permission === "denied";
}

async function enableNotifications() {
  if (!requireSignIn()) return;

  if (!("Notification" in window)) {
    toast("Notifications unsupported");
    return;
  }

  if (Notification.permission === "granted") {
    const shown = await showTestNotification();
    await syncCloudState({ notify: true, push: false });
    toast(shown ? "Test notification sent" : "Test notification unavailable");
    return;
  }

  const permission = await Notification.requestPermission();
  updateNotificationStatus();
  if (permission === "granted") {
    await showTestNotification();
    await syncCloudState({ notify: true, push: false });
  }
  toast(permission === "granted" ? "Notifications enabled. Test sent" : "Notifications not enabled");
}

async function notifyPendingRequests() {
  if (!("Notification" in window) || Notification.permission !== "granted") return;

  const candidates = state.requests.filter(shouldNotifyRequest);

  if (candidates.length === 0) {
    pruneNotifiedRequests();
    save({ remote: false });
    return;
  }

  for (const request of candidates) {
    try {
      const shown = await showRequestNotification(request);
      if (shown) {
        state.notifiedRequests[request.id] = "shown";
      }
    } catch (error) {
      console.warn(error);
    }
  }

  pruneNotifiedRequests();
  save({ remote: false });
}

function shouldNotifyRequest(request) {
  return isSignedIn()
    && request.status === "pending"
    && isCurrentDeviceTarget(request)
    && request.createdByDeviceId !== state.profile.deviceId
    && state.notifiedRequests[request.id] !== "shown";
}

function isCurrentDeviceTarget(request) {
  return request.targetDeviceId === state.profile.deviceId;
}

function pruneNotifiedRequests() {
  const requestIds = new Set(state.requests.map((request) => request.id));
  state.notifiedRequests = Object.fromEntries(
    Object.entries(state.notifiedRequests).filter(([id]) => requestIds.has(id))
  );
}

async function showRequestNotification(request) {
  if (!("Notification" in window) || Notification.permission !== "granted") return;

  const registration = await navigator.serviceWorker?.ready.catch(() => null);
  if (!registration) return false;

  const url = `/?view=pending&request=${encodeURIComponent(request.id)}&handoff=1`;
  const notificationOptions = buildNotificationOptions({
    body: `${CHANNEL_LABELS[request.channel]} / ${request.recipient}`,
    url,
    tag: `n-smart-request-${request.id}`,
    requestId: request.id,
    channel: request.channel
  });

  await showNotificationViaWorker(registration, `${CHANNEL_LABELS[request.channel]} message request`, notificationOptions);

  return true;
}

async function showTestNotification() {
  if (!("Notification" in window) || Notification.permission !== "granted") return false;

  const registration = await navigator.serviceWorker?.ready.catch(() => null);
  if (!registration) return false;

  try {
    await showNotificationViaWorker(registration, "N Smart notification test", buildNotificationOptions({
      body: `Android notification check for device #${shortId(state.profile.deviceId)}`,
      url: "/?view=pending",
      tag: `n-smart-test-${Date.now()}`
    }));
  } catch (error) {
    console.warn(error);
    return false;
  }

  return true;
}

function buildNotificationOptions(options) {
  return {
    body: options.body,
    icon: "/icons/icon.svg",
    badge: "/icons/icon.svg",
    requireInteraction: true,
    renotify: true,
    silent: false,
    tag: options.tag,
    timestamp: Date.now(),
    vibrate: [180, 80, 180],
    data: {
      url: options.url || "/",
      requestId: options.requestId || "",
      channel: options.channel || ""
    }
  };
}

async function showNotificationViaWorker(registration, title, options) {
  if (navigator.serviceWorker?.controller) {
    navigator.serviceWorker.controller.postMessage({
      type: "show-notification",
      title,
      options
    });
    return;
  }

  await registration.showNotification(title, options);
}

async function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) {
    selectors.swStatus.textContent = "Service worker unsupported";
    selectors.swStatus.className = "status-pill warn";
    return;
  }

  try {
    await navigator.serviceWorker.register("/sw.js");
    selectors.swStatus.textContent = "Service worker ready";
    selectors.swStatus.className = "status-pill ready";
  } catch {
    selectors.swStatus.textContent = "Service worker failed";
    selectors.swStatus.className = "status-pill warn";
  }
}

async function loadAppVersion() {
  try {
    const response = await fetch(`/src/app-version.generated.json?t=${Date.now()}`, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`Version request failed with ${response.status}`);
    }

    const appVersion = await response.json();
    selectors.appVersion.textContent = `v${appVersion.version}`;
    selectors.appVersion.className = "status-pill ready";
    selectors.appVersion.title = appVersion.builtAt ? `Built ${appVersion.builtAt}` : "App version";
  } catch (error) {
    selectors.appVersion.textContent = "Version local";
    selectors.appVersion.className = "status-pill warn";
    selectors.appVersion.title = "Run npm run build to generate the app version file.";
    console.warn(error);
  }
}

async function initFirebase() {
  const result = await loadFirebaseConfig();

  firebaseRuntime.configured = result.configured;
  firebaseRuntime.config = result.config || null;
  firebaseRuntime.reason = result.reason || "";
  renderAuth();

  if (!result.configured) {
    return;
  }

  if (state.firebaseAuth?.refreshToken) {
    try {
      await getValidFirebaseIdToken();
      await syncCloudState({ notify: true, push: true });
      startRequestWatcher();
      focusRequestedView();
    } catch (error) {
      clearSession();
      render();
      setCloudStatus("Cloud auth failed", "warn");
      toast("Session expired. Sign in again.");
    }
  }
}

function setCloudStatus(message, tone) {
  selectors.cloudStatus.textContent = message;
  selectors.cloudStatus.className = tone === "ready" ? "status-pill ready" : "status-pill warn";
}

async function getValidFirebaseIdToken() {
  if (!firebaseRuntime.config || !state.firebaseAuth?.refreshToken) {
    return null;
  }

  if (state.firebaseAuth.idToken && Date.now() < Number(state.firebaseAuth.expiresAt || 0) - 120000) {
    return state.firebaseAuth.idToken;
  }

  const refreshed = await refreshFirebaseSession(firebaseRuntime.config, state.firebaseAuth.refreshToken);
  state.firebaseAuth = {
    ...state.firebaseAuth,
    ...refreshed
  };
  save({ remote: false });
  renderAuth();

  return state.firebaseAuth.idToken;
}

function scheduleCloudSave() {
  if (!firebaseRuntime.configured || !state.firebaseAuth?.uid) {
    return;
  }

  window.clearTimeout(firebaseRuntime.saveTimer);
  firebaseRuntime.saveTimer = window.setTimeout(() => {
    pushCloudState().catch((error) => {
      setCloudStatus("Cloud sync failed", "warn");
      console.warn(error);
    });
  }, 450);
}

function startRequestWatcher() {
  if (firebaseRuntime.pollTimer || !isSignedIn()) {
    return;
  }

  firebaseRuntime.pollTimer = window.setInterval(() => {
    syncCloudState({ notify: true, push: false }).catch((error) => {
      setCloudStatus("Cloud sync failed", "warn");
      console.warn(error);
    });
  }, 6000);
}

function stopRequestWatcher() {
  if (!firebaseRuntime.pollTimer) {
    return;
  }

  window.clearInterval(firebaseRuntime.pollTimer);
  firebaseRuntime.pollTimer = null;
}

async function syncCloudState(options = {}) {
  const { notify = false, push = true } = options;

  if (!firebaseRuntime.configured || !state.firebaseAuth?.uid) {
    return;
  }

  if (firebaseRuntime.syncing) {
    return;
  }

  firebaseRuntime.syncing = true;

  try {
    setCloudStatus("Cloud syncing", "warn");
    const token = await getValidFirebaseIdToken();
    const cloudState = await readRealtimePath(firebaseRuntime.config, userPath(), token);

    if (cloudState?.devices) {
      state.devices = mergeById(state.devices, Object.values(cloudState.devices));
    }

    if (cloudState?.messageRequests) {
      state.requests = mergeById(state.requests, Object.values(cloudState.messageRequests));
    }

    state.profile.accountId = state.firebaseAuth.uid;
    upsertCurrentDevice();
    save({ remote: false });
    render();

    if (notify) {
      await notifyPendingRequests();
    }

    focusRequestedView();

    if (push) {
      await pushCloudState();
    } else {
      setCloudStatus("Cloud synced", "ready");
    }
  } finally {
    firebaseRuntime.syncing = false;
  }
}

async function pushCloudState() {
  if (firebaseRuntime.pushing || !firebaseRuntime.configured || !state.firebaseAuth?.uid) {
    return;
  }

  firebaseRuntime.pushing = true;
  setCloudStatus("Cloud syncing", "warn");

  try {
    const token = await getValidFirebaseIdToken();
    await writeRealtimePath(firebaseRuntime.config, userPath(), token, serializeCloudState(), "PUT");
    setCloudStatus("Cloud synced", "ready");
  } finally {
    firebaseRuntime.pushing = false;
  }
}

function serializeCloudState() {
  return {
    account: {
      uid: state.firebaseAuth.uid,
      email: state.firebaseAuth.email || "",
      updatedAt: now()
    },
    devices: objectById(state.devices),
    messageRequests: objectById(state.requests)
  };
}

function objectById(items) {
  return Object.fromEntries(items.filter((item) => item.id).map((item) => [item.id, item]));
}

function userPath() {
  return `users/${state.firebaseAuth.uid}`;
}

function bindEvents() {
  selectors.profileForm.addEventListener("submit", handleProfileSubmit);
  selectors.authForm.addEventListener("submit", handleAuthSubmit);
  selectors.signOutButton.addEventListener("click", handleSignOut);
  selectors.linkForm.addEventListener("submit", handleLinkSubmit);
  selectors.requestForm.addEventListener("submit", handleRequestSubmit);
  selectors.deviceList.addEventListener("click", handleDeviceListClick);
  selectors.requestList.addEventListener("click", handleRequestListClick);
  selectors.notifyButton.addEventListener("click", enableNotifications);
  selectors.clearCompleted.addEventListener("click", clearCompleted);

  selectors.exportButton.addEventListener("click", () => {
    if (!requireSignIn()) return;

    selectors.syncPayload.value = exportPayload();
    toast("Payload exported");
  });

  selectors.copyPayload.addEventListener("click", () => {
    if (!requireSignIn()) return;

    copyText(selectors.syncPayload.value || exportPayload(), "Payload copied");
  });

  selectors.importButton.addEventListener("click", () => {
    if (!requireSignIn()) return;

    try {
      mergePayload(JSON.parse(selectors.syncPayload.value));
      toast("Payload imported");
    } catch (error) {
      toast(error.message || "Import failed");
    }
  });

  channel?.addEventListener("message", (event) => {
    if (event.data?.type !== "sync") return;
    try {
      mergePayload(JSON.parse(event.data.payload), { broadcast: false });
    } catch {
      // Ignore malformed tab sync messages.
    }
  });

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState !== "visible" || !isSignedIn()) return;

    syncCloudState({ notify: true, push: false }).catch((error) => {
      setCloudStatus("Cloud sync failed", "warn");
      console.warn(error);
    });
  });
}

function isSignedIn() {
  return Boolean(state.firebaseAuth?.uid);
}

function requireSignIn() {
  if (isSignedIn()) return true;

  toast("Sign in first");
  selectors.authEmail.focus();
  return false;
}

async function attemptNotificationHandoff(requestId) {
  if (!isSignedIn()) return;

  const request = state.requests.find((item) => item.id === requestId);
  if (!request) {
    launchIntent.handoffStarted = false;
    return;
  }

  if (!isCurrentDeviceTarget(request)) {
    toast("Request is assigned to another device");
    return;
  }

  clearHandoffParam();
  await openExternalRequest(request, request.channel, { copySms: false });
}

function clearHandoffParam() {
  if (!launchIntent.handoff || !("history" in window)) return;

  const url = new URL(window.location.href);
  url.searchParams.delete("handoff");
  window.history.replaceState(null, "", url);
  launchIntent.handoff = false;
}

function focusRequestedView() {
  if (!isSignedIn()) return;

  const requestCard = launchIntent.requestId
    ? [...document.querySelectorAll("[data-request-card]")].find((card) => card.dataset.requestCard === launchIntent.requestId)
    : null;
  const target = requestCard
    || (launchIntent.view === "pending"
      ? document.querySelector("#pending-title")
      : launchParams.get("action") === "new-request"
        ? document.querySelector("#compose-title")
        : null);

  if (target && !launchIntent.focused) {
    target.scrollIntoView({ block: "start" });
    launchIntent.focused = true;
  }

  if (!launchIntent.handoff || !launchIntent.requestId || launchIntent.handoffStarted) {
    return;
  }

  const request = state.requests.find((item) => item.id === launchIntent.requestId);
  if (!request) return;

  launchIntent.handoffStarted = true;
  window.setTimeout(() => {
    attemptNotificationHandoff(request.id);
  }, 350);
}

ensureDefaults();
bindEvents();
render();
registerServiceWorker();
loadAppVersion();
focusRequestedView();
initFirebase();
