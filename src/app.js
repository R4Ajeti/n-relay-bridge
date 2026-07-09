const STORAGE = {
  profile: "nsp.profile",
  devices: "nsp.devices",
  requests: "nsp.requests"
};

const CHANNEL_LABELS = {
  whatsapp: "WhatsApp",
  viber: "Viber",
  sms: "SMS/iMessage"
};

const selectors = {
  swStatus: document.querySelector("#sw-status"),
  notificationStatus: document.querySelector("#notification-status"),
  notifyButton: document.querySelector("#notify-button"),
  profileForm: document.querySelector("#profile-form"),
  accountId: document.querySelector("#account-id"),
  deviceName: document.querySelector("#device-name"),
  platform: document.querySelector("#platform"),
  role: document.querySelector("#role"),
  currentDeviceLabel: document.querySelector("#current-device-label"),
  currentDeviceMeta: document.querySelector("#current-device-meta"),
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
  toast: document.querySelector("#toast")
};

let state = {
  profile: load(STORAGE.profile, null),
  devices: load(STORAGE.devices, []),
  requests: load(STORAGE.requests, [])
};

const channel = "BroadcastChannel" in window ? new BroadcastChannel("nsp-sync") : null;

function load(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function save() {
  localStorage.setItem(STORAGE.profile, JSON.stringify(state.profile));
  localStorage.setItem(STORAGE.devices, JSON.stringify(state.devices));
  localStorage.setItem(STORAGE.requests, JSON.stringify(state.requests));
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
      accountId: `acct-${Math.random().toString(36).slice(2, 8)}`,
      deviceName: detectPlatform() === "ios" ? "iPhone Sender" : "Android Control",
      platform: detectPlatform(),
      role: detectPlatform() === "ios" ? "sender" : "control",
      createdAt: now(),
      updatedAt: now()
    };
  }

  if (!state.devices.some((device) => device.id === state.profile.deviceId)) {
    state.devices.unshift({
      id: state.profile.deviceId,
      accountId: state.profile.accountId,
      name: state.profile.deviceName,
      platform: state.profile.platform,
      role: state.profile.role,
      trusted: true,
      current: true,
      createdAt: state.profile.createdAt
    });
  }

  save();
}

function render() {
  renderProfile();
  renderDevices();
  renderTargetOptions();
  renderRequests();
  updateNotificationStatus();
}

function renderProfile() {
  const { profile } = state;
  selectors.accountId.value = profile.accountId;
  selectors.deviceName.value = profile.deviceName;
  selectors.platform.value = profile.platform;
  selectors.role.value = profile.role;
  selectors.currentDeviceLabel.textContent = profile.deviceName;
  selectors.currentDeviceMeta.textContent = `${profile.platform.toUpperCase()} / ${profile.role} / ${profile.accountId}`;
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
        <p>${escapeHtml(device.platform.toUpperCase())} / ${escapeHtml(device.role || "sender")}${device.id === state.profile.deviceId ? " / current" : ""}</p>
      </div>
      ${device.id === state.profile.deviceId ? "" : `<button class="text-button" type="button" data-remove-device="${device.id}">Remove</button>`}
    </article>
  `).join("");
}

function renderTargetOptions() {
  const senderDevices = state.devices.filter((device) => ["sender", "both"].includes(device.role || "sender"));
  const options = (senderDevices.length ? senderDevices : state.devices).map((device) => `
    <option value="${device.id}">${escapeHtml(device.name)} (${escapeHtml(device.platform)})</option>
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
      <article class="request-card ${request.status === "sent_by_user" ? "done" : ""}">
        <div>
          <div class="request-meta">
            <span class="tag ready">${escapeHtml(CHANNEL_LABELS[request.channel])}</span>
            <span class="tag">${escapeHtml(request.status.replaceAll("_", " "))}</span>
            <span class="tag">${escapeHtml(target?.name || "Unknown device")}</span>
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

  return {
    whatsapp: phoneForWhatsapp ? `https://wa.me/${phoneForWhatsapp}?text=${message}` : `https://wa.me/?text=${message}`,
    viber: `viber://forward?text=${message}`,
    sms: `sms:${phoneForSms}`
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
    createdAt: state.profile.createdAt
  };

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

function mergePayload(payload) {
  if (!payload || payload.schema !== "n-smart-phone/sync-v1") {
    throw new Error("Unsupported payload");
  }

  if (payload.accountId && payload.accountId !== state.profile.accountId) {
    throw new Error("Account ID mismatch");
  }

  const deviceMap = new Map(state.devices.map((device) => [device.id, device]));
  for (const device of payload.devices || []) {
    deviceMap.set(device.id, { ...deviceMap.get(device.id), ...device, current: device.id === state.profile.deviceId });
  }

  const requestMap = new Map(state.requests.map((request) => [request.id, request]));
  for (const request of payload.requests || []) {
    requestMap.set(request.id, { ...requestMap.get(request.id), ...request });
  }

  state.devices = [...deviceMap.values()];
  state.requests = [...requestMap.values()];
  upsertCurrentDevice();
  save();
  render();
  channel?.postMessage({ type: "sync", payload: exportPayload() });
}

function handleProfileSubmit(event) {
  event.preventDefault();

  state.profile = {
    ...state.profile,
    accountId: text(selectors.accountId.value),
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

function handleLinkSubmit(event) {
  event.preventDefault();
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
    createdAt: now()
  });

  selectors.linkedDeviceName.value = "";
  save();
  render();
  toast("Device linked");
}

function handleRequestSubmit(event) {
  event.preventDefault();

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
  showLocalNotification(request);
  toast("Request created");
}

function handleDeviceListClick(event) {
  const id = event.target.closest("[data-remove-device]")?.dataset.removeDevice;
  if (!id) return;

  state.devices = state.devices.filter((device) => device.id !== id);
  save();
  render();
  toast("Device removed");
}

async function handleRequestListClick(event) {
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
    const request = state.requests.find((item) => item.id === openElement.dataset.openRequest);
    if (!request) return;

    if (openElement.dataset.channel === "sms") {
      await copyText(request.message, "Message copied for SMS");
    }

    updateRequestStatus(request.id, "opened");
  }
}

function updateRequestStatus(id, status) {
  state.requests = state.requests.map((request) => (
    request.id === id ? { ...request, status, updatedAt: now() } : request
  ));
  save();
  render();
}

function clearCompleted() {
  state.requests = state.requests.filter((request) => !["sent_by_user", "cancelled"].includes(request.status));
  save();
  render();
  toast("Done requests cleared");
}

function updateNotificationStatus() {
  if (!("Notification" in window)) {
    selectors.notificationStatus.textContent = "Notifications unsupported";
    selectors.notificationStatus.className = "status-pill warn";
    selectors.notifyButton.disabled = true;
    return;
  }

  const permission = Notification.permission;
  selectors.notificationStatus.textContent = permission === "granted" ? "Notifications ready" : `Notifications ${permission}`;
  selectors.notificationStatus.className = permission === "granted" ? "status-pill ready" : "status-pill warn";
}

async function enableNotifications() {
  if (!("Notification" in window)) {
    toast("Notifications unsupported");
    return;
  }

  const permission = await Notification.requestPermission();
  updateNotificationStatus();
  toast(permission === "granted" ? "Notifications enabled" : "Notifications not enabled");
}

async function showLocalNotification(request) {
  if (!("Notification" in window) || Notification.permission !== "granted") return;

  const registration = await navigator.serviceWorker?.ready.catch(() => null);
  if (!registration) return;

  registration.showNotification("Pending message request", {
    body: `${CHANNEL_LABELS[request.channel]} / ${request.recipient}`,
    icon: "/icons/icon.svg",
    badge: "/icons/icon.svg",
    data: { url: "/?view=pending" }
  });
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

function bindEvents() {
  selectors.profileForm.addEventListener("submit", handleProfileSubmit);
  selectors.linkForm.addEventListener("submit", handleLinkSubmit);
  selectors.requestForm.addEventListener("submit", handleRequestSubmit);
  selectors.deviceList.addEventListener("click", handleDeviceListClick);
  selectors.requestList.addEventListener("click", handleRequestListClick);
  selectors.notifyButton.addEventListener("click", enableNotifications);
  selectors.clearCompleted.addEventListener("click", clearCompleted);

  selectors.exportButton.addEventListener("click", () => {
    selectors.syncPayload.value = exportPayload();
    toast("Payload exported");
  });

  selectors.copyPayload.addEventListener("click", () => copyText(selectors.syncPayload.value || exportPayload(), "Payload copied"));

  selectors.importButton.addEventListener("click", () => {
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
      mergePayload(JSON.parse(event.data.payload));
    } catch {
      // Ignore malformed tab sync messages.
    }
  });
}

function focusRequestedView() {
  const params = new URLSearchParams(window.location.search);
  const target = params.get("view") === "pending"
    ? document.querySelector("#pending-title")
    : params.get("action") === "new-request"
      ? document.querySelector("#compose-title")
      : null;

  target?.scrollIntoView({ block: "start" });
}

ensureDefaults();
bindEvents();
render();
registerServiceWorker();
focusRequestedView();
