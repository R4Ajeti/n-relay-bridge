import {
  createEmailPasswordAccount,
  loadFirebaseConfig,
  readRealtimePath,
  refreshFirebaseSession,
  signInWithEmailPassword,
  writeRealtimePath
} from "./firebase-client.js?v=__APP_VERSION__";

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

const CHANNEL_ACTION_LABELS = {
  whatsapp: "WhatsApp",
  viber: "Viber",
  sms: "SMS"
};

const DEFAULT_CHANNEL = "sms";
const CHANNEL_ORDER = ["sms", "whatsapp", "viber"];
const OPTIONAL_CHANNELS = new Set(["whatsapp", "viber"]);
const DEVICE_ROLES = new Set(["control", "sender", "both"]);
const DEVICE_STALE_MS = 24 * 60 * 60 * 1000;
const DEVICE_NOTIFICATION_READY_MS = 2 * 60 * 1000;
const WEB_PUSH_MODE = "web-push";
const LOCAL_NOTIFICATION_MODE = "local";

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
  deviceList: document.querySelector("#device-list"),
  requestForm: document.querySelector("#request-form"),
  requestSubmitButton: document.querySelector("#request-form button[type='submit']"),
  recipient: document.querySelector("#recipient"),
  channel: document.querySelector("#channel"),
  optionalChannels: document.querySelectorAll("[data-optional-channel]"),
  senderAvailability: document.querySelector("#sender-availability"),
  senderAvailabilityLabel: document.querySelector("#sender-availability-label"),
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

let targetDeviceManuallySelected = false;
let profileFormDirty = false;

const firebaseRuntime = {
  config: null,
  configured: false,
  reason: "loading",
  saveTimer: null,
  pushing: false,
  syncing: false,
  pollTimer: null,
  dirtyDeviceIds: new Set(),
  dirtyRequestIds: new Set(),
  deletedDeviceIds: new Set(),
  deletedRequestIds: new Set()
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

function isSupportedChannel(value) {
  return CHANNEL_ORDER.includes(value);
}

function getSelectedChannels() {
  const channels = new Set([DEFAULT_CHANNEL]);

  selectors.optionalChannels.forEach((input) => {
    if (input.checked && OPTIONAL_CHANNELS.has(input.value)) {
      channels.add(input.value);
    }
  });

  return CHANNEL_ORDER.filter((channelName) => channels.has(channelName));
}

function getRequestChannels(request = {}) {
  const rawChannels = Array.isArray(request.channels) ? request.channels : [request.channel];
  const channels = new Set([DEFAULT_CHANNEL]);

  rawChannels.forEach((channelName) => {
    if (isSupportedChannel(channelName)) {
      channels.add(channelName);
    }
  });

  return CHANNEL_ORDER.filter((channelName) => channels.has(channelName));
}

function getPrimaryChannel(request = {}) {
  const requestedChannel = isSupportedChannel(request.channel) ? request.channel : DEFAULT_CHANNEL;
  const channels = getRequestChannels(request);

  return channels.includes(requestedChannel) ? requestedChannel : DEFAULT_CHANNEL;
}

function requestStatusLabel(status) {
  const visibleStatus = status === "sent_by_user" ? "opened" : status || "pending";
  return visibleStatus.replaceAll("_", " ");
}

function resetOptionalChannels() {
  selectors.optionalChannels.forEach((input) => {
    input.checked = false;
  });
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
  if (ua.includes("macintosh") && navigator.maxTouchPoints > 1) return "ios";
  if (ua.includes("android")) return "android";
  return "other";
}

function isIosPlatform() {
  return detectPlatform() === "ios";
}

function isStandaloneDisplayMode() {
  return window.navigator.standalone === true
    || window.matchMedia?.("(display-mode: standalone)")?.matches
    || window.matchMedia?.("(display-mode: fullscreen)")?.matches;
}

function currentInstallContext() {
  if (isIosPlatform()) {
    return isStandaloneDisplayMode() ? "ios-home-screen" : "ios-browser";
  }

  return isStandaloneDisplayMode() ? "installed" : "browser";
}

function installContextLabel(context = currentInstallContext()) {
  const labels = {
    "ios-home-screen": "Home Screen app",
    "ios-browser": "Safari/browser tab",
    installed: "installed app",
    browser: "browser tab"
  };

  return labels[context] || "browser tab";
}

function isIosBrowserMode() {
  return currentInstallContext() === "ios-browser";
}

function supportsPushSubscriptions() {
  return "serviceWorker" in navigator && "PushManager" in window;
}

function currentNotificationPermission() {
  return "Notification" in window ? Notification.permission : "unsupported";
}

function notificationModeFromPermission() {
  return currentNotificationPermission() === "granted" ? LOCAL_NOTIFICATION_MODE : "none";
}

function ensureDefaults() {
  if (!state.profile) {
    const deviceId = uid("device");
    const platform = detectPlatform();

    state.profile = {
      deviceId,
      accountId: state.firebaseAuth?.uid || `acct-${Math.random().toString(36).slice(2, 8)}`,
      deviceName: defaultDeviceName(platform, deviceId),
      platform,
      role: "control",
      roleExplicit: false,
      createdAt: now(),
      updatedAt: now()
    };
  }

  recoverLegacyCurrentDeviceRole();

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
  renderSenderAvailability();
  renderRequests();
  renderAccess();
  updateNotificationStatus();
}

function renderProfile() {
  const { profile } = state;
  selectors.accountId.value = profile.accountId;
  selectors.accountId.disabled = Boolean(state.firebaseAuth?.uid);

  if (!profileFormDirty) {
    selectors.deviceName.value = profile.deviceName;
    selectors.platform.value = profile.platform;
    selectors.role.value = profile.role;
  }

  selectors.currentDeviceLabel.textContent = profile.deviceName;
  selectors.currentDeviceMeta.textContent = `${profile.platform.toUpperCase()} / ${profile.role} / ${installContextLabel()} / device #${shortId(profile.deviceId)}`;
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
  const hasSenderTarget = getSenderTargetDevices().length > 0;
  const gatedControls = [
    ...selectors.profileForm.elements,
    selectors.notifyButton,
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

  selectors.targetDevice.disabled = !signedIn || !hasSenderTarget;
  selectors.requestSubmitButton.disabled = !signedIn || !hasSenderTarget;
}

function renderDevices() {
  const savedDevices = sortDevices(state.devices.filter(isSavedDeviceRecord));

  if (savedDevices.length === 0) {
    selectors.deviceList.innerHTML = `<div class="empty-state">No saved devices.</div>`;
    return;
  }

  selectors.deviceList.innerHTML = savedDevices.map((device) => {
    const isCurrentDevice = device.id === state.profile.deviceId;

    return `
    <article class="list-item${isCurrentDevice ? " is-current-device" : ""}">
      <div>
        <strong>${escapeHtml(device.name)}</strong>
        <p>${escapeHtml(deviceMeta(device))}</p>
      </div>
      ${isCurrentDevice
        ? `<span class="tag ready">Current device</span>`
        : `<button class="text-button" type="button" data-remove-device="${device.id}">Remove</button>`}
    </article>
  `;
  }).join("");
}

function isSavedDeviceRecord(device) {
  return device.roleExplicit === true || (
    device.role === "sender" && device.platform === "android"
  );
}

function renderTargetOptions() {
  const previousTargetId = selectors.targetDevice.value;
  const senderDevices = getSenderTargetDevices();

  if (senderDevices.length === 0) {
    selectors.targetDevice.innerHTML = `<option value="">No sender device saved</option>`;
    selectors.targetDevice.value = "";
    return;
  }

  const options = senderDevices.map((device) => `
    <option value="${device.id}">${escapeHtml(senderOptionLabel(device))}</option>
  `);

  selectors.targetDevice.innerHTML = options.join("");
  selectors.targetDevice.value = targetDeviceManuallySelected && senderDevices.some((device) => device.id === previousTargetId)
    ? previousTargetId
    : senderDevices[0].id;
}

function renderSenderAvailability() {
  const device = getSenderTargetDevices().find((item) => item.id === selectors.targetDevice.value) || null;
  const availability = getNotificationAvailability(device);

  selectors.senderAvailability.classList.toggle("is-ready", availability.ready);
  selectors.senderAvailability.classList.toggle("is-unavailable", !availability.ready);
  selectors.senderAvailabilityLabel.textContent = availability.label;
}

function getNotificationAvailability(device) {
  if (!device) {
    return { ready: false, label: "No saved sender device" };
  }

  if (device.notificationPermission !== "granted") {
    return { ready: false, label: `${device.name}: notifications not ready` };
  }

  if (device.pushSubscription?.endpoint) {
    return { ready: true, label: `${device.name}: Web Push ready` };
  }

  if (device.platform === "ios") {
    return { ready: false, label: `${device.name}: iOS Web Push not ready` };
  }

  const elapsed = Date.now() - getDeviceTime(device);
  if (!getDeviceTime(device) || elapsed > DEVICE_NOTIFICATION_READY_MS) {
    return { ready: false, label: `${device.name}: sender offline` };
  }

  return { ready: true, label: `${device.name}: local notifications ready` };
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
    const channels = getRequestChannels(request);
    const channelTags = channels
      .map((channelName) => `<span class="tag ready">${escapeHtml(CHANNEL_LABELS[channelName])}</span>`)
      .join("");
    const actionLinks = channels
      .map((channelName) => (
        `<a href="${escapeHtml(links[channelName])}" data-open-request="${escapeHtml(request.id)}" data-channel="${channelName}">${escapeHtml(CHANNEL_ACTION_LABELS[channelName])}</a>`
      ))
      .join("");

    return `
      <article class="request-card" data-request-card="${escapeHtml(request.id)}">
        <div>
          <div class="request-meta">
            ${channelTags}
            <span class="tag">${escapeHtml(requestStatusLabel(request.status))}</span>
            <span class="tag">${escapeHtml(target ? `${target.name} #${shortId(target.id)}` : "Unknown device")}</span>
          </div>
          <h3>${escapeHtml(request.recipient)}</h3>
          <p class="request-message">${escapeHtml(request.message)}</p>
        </div>
        <div class="request-actions">
          <button class="secondary-action" type="button" data-copy-message="${request.id}">Copy</button>
          ${actionLinks}
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

function getSenderTargetDevices() {
  return sortDevices(state.devices.filter(isSavedSenderDevice));
}

function isSavedSenderDevice(device) {
  const role = normalizeDeviceRole(device.role);

  if (device.roleExplicit === false || role === "control") {
    return false;
  }

  if (role === "sender") {
    return isSavedDeviceRecord(device);
  }

  if (role !== "both") {
    return false;
  }

  return device.roleExplicit === true;
}

function sortDevices(devices) {
  return [...devices].sort((a, b) => {
    const timeRank = getDeviceTime(b) - getDeviceTime(a);
    if (timeRank !== 0) return timeRank;

    const roleRank = rolePriority(a) - rolePriority(b);
    if (roleRank !== 0) return roleRank;

    return String(a.name || "").localeCompare(String(b.name || ""));
  });
}

function rolePriority(device) {
  const role = normalizeDeviceRole(device.role);
  if (role === "sender") return 0;
  if (role === "both") return 1;
  return 2;
}

function getDeviceTime(device) {
  return Date.parse(device.lastSeenAt || device.updatedAt || device.createdAt || "") || 0;
}

function deviceMeta(device) {
  const parts = [
    String(device.platform || "other").toUpperCase(),
    deviceRoleLabel(device),
    `device #${shortId(device.id)}`,
    device.installContext ? installContextLabel(device.installContext) : "",
    deviceNotificationLabel(device),
    deviceFreshnessLabel(device)
  ];

  if (device.source === "manual") {
    parts.push("manual");
  }

  return parts.filter(Boolean).join(" / ");
}

function deviceNotificationLabel(device) {
  if (device.pushSubscription?.endpoint) return "web push";
  if (device.notificationPermission === "granted") return "local notify";
  if (device.notificationPermission === "denied") return "notifications blocked";
  return "";
}

function deviceRoleLabel(device) {
  const role = normalizeDeviceRole(device.role);

  if (role === "both" && device.roleExplicit !== true) {
    return "both (not saved)";
  }

  return role;
}

function normalizeDeviceRole(role) {
  return DEVICE_ROLES.has(role) ? role : "control";
}

function defaultDeviceName(platform, deviceId) {
  const platformName = platform === "ios" ? "iPhone" : platform === "android" ? "Android" : "Browser";
  return `${platformName} Control #${shortId(deviceId)}`;
}

function senderOptionLabel(device) {
  return `${device.name} (${device.platform || "other"} #${shortId(device.id)}, ${deviceFreshnessLabel(device)})`;
}

function deviceFreshnessLabel(device) {
  const timestamp = getDeviceTime(device);
  if (!timestamp) return "not seen yet";

  const elapsed = Date.now() - timestamp;
  const relative = formatElapsed(elapsed);
  return elapsed > DEVICE_STALE_MS ? `stale ${relative}` : `seen ${relative}`;
}

function formatElapsed(elapsed) {
  if (elapsed < 2 * 60 * 1000) return "just now";
  if (elapsed < 60 * 60 * 1000) return `${Math.round(elapsed / 60000)}m ago`;
  if (elapsed < 24 * 60 * 60 * 1000) return `${Math.round(elapsed / 3600000)}h ago`;
  return `${Math.round(elapsed / 86400000)}d ago`;
}

function recoverLegacyCurrentDeviceRole() {
  const profile = state.profile;
  const isLegacyDesktopPromotion = profile
    && profile.role === "both"
    && profile.roleExplicit == null
    && profile.platform === "other";

  if (!isLegacyDesktopPromotion) {
    return;
  }

  state.profile = {
    ...profile,
    role: "control",
    roleExplicit: false,
    updatedAt: now()
  };
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
  state.devices = mergeById([], state.devices);
  const index = state.devices.findIndex((device) => device.id === state.profile.deviceId);
  const existingDevice = index >= 0 ? state.devices[index] : null;
  const existingPushSubscription = existingDevice?.pushSubscription || null;
  const currentDevice = {
    id: state.profile.deviceId,
    accountId: state.profile.accountId,
    name: state.profile.deviceName,
    platform: state.profile.platform,
    role: normalizeDeviceRole(state.profile.role),
    roleExplicit: state.profile.roleExplicit,
    notificationPermission: currentNotificationPermission(),
    notificationMode: existingPushSubscription ? WEB_PUSH_MODE : notificationModeFromPermission(),
    installContext: currentInstallContext(),
    supportsPush: supportsPushSubscriptions(),
    pushSubscription: existingPushSubscription,
    pushSubscriptionUpdatedAt: existingDevice?.pushSubscriptionUpdatedAt || "",
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
  (payload.devices || []).forEach((device) => firebaseRuntime.dirtyDeviceIds.add(device.id));
  (payload.requests || []).forEach((request) => firebaseRuntime.dirtyRequestIds.add(request.id));
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

  const wasAlreadySaved = state.devices.some((device) => (
    device.id === state.profile.deviceId && device.roleExplicit === true
  ));

  state.profile = {
    ...state.profile,
    accountId: state.firebaseAuth?.uid || text(selectors.accountId.value),
    deviceName: text(selectors.deviceName.value),
    platform: selectors.platform.value,
    role: normalizeDeviceRole(selectors.role.value),
    roleExplicit: true,
    updatedAt: now()
  };

  upsertCurrentDevice();
  profileFormDirty = false;
  firebaseRuntime.dirtyDeviceIds.add(state.profile.deviceId);
  save();
  render();
  toast(wasAlreadySaved ? "Device updated" : "Device saved");
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
    await hydrateExistingPushSubscription();
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
  profileFormDirty = false;
  save({ remote: false });
}

async function handleRequestSubmit(event) {
  event.preventDefault();

  if (!requireSignIn()) return;

  if (!selectors.targetDevice.value) {
    toast("Save a sender device first");
    return;
  }

  const channels = getSelectedChannels();
  const request = {
    id: uid("request"),
    userId: state.profile.accountId,
    createdByDeviceId: state.profile.deviceId,
    targetDeviceId: selectors.targetDevice.value || state.profile.deviceId,
    channel: DEFAULT_CHANNEL,
    channels,
    recipient: text(selectors.recipient.value),
    message: text(selectors.message.value),
    status: "pending",
    createdAt: now(),
    updatedAt: now()
  };

  state.requests.push(request);
  firebaseRuntime.dirtyRequestIds.add(request.id);
  targetDeviceManuallySelected = false;
  selectors.requestForm.reset();
  selectors.channel.value = DEFAULT_CHANNEL;
  resetOptionalChannels();
  save();
  render();
  toast("Request created");

  try {
    await pushCloudState();
  } catch (error) {
    setCloudStatus("Cloud sync failed", "warn");
    console.warn(error);
    toast("Request saved locally. Cloud sync failed");
  }
}

function handleDeviceListClick(event) {
  if (!requireSignIn()) return;

  const id = event.target.closest("[data-remove-device]")?.dataset.removeDevice;
  if (!id) return;

  state.devices = state.devices.filter((device) => device.id !== id);
  firebaseRuntime.dirtyDeviceIds.delete(id);
  firebaseRuntime.deletedDeviceIds.add(id);
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
  const cancelId = event.target.closest("[data-cancel-request]")?.dataset.cancelRequest;
  const openElement = event.target.closest("[data-open-request]");

  if (copyId) {
    const request = state.requests.find((item) => item.id === copyId);
    if (request) await copyText(request.message, "Message copied");
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

async function openExternalRequest(request, channelName = getPrimaryChannel(request), options = {}) {
  const { copySms = true } = options;
  const links = buildLinks(request);
  const selectedChannel = isSupportedChannel(channelName) ? channelName : "";
  const targetUrl = links[selectedChannel];

  if (!targetUrl) {
    toast("Unsupported channel");
    return;
  }

  if (selectedChannel === DEFAULT_CHANNEL && copySms) {
    await copyText(request.message, "Message copied for SMS");
  }

  updateRequestStatus(request.id, "opened");
  toast(`Opening ${CHANNEL_LABELS[selectedChannel] || "message app"}`);

  window.setTimeout(() => {
    window.location.href = targetUrl;
  }, 80);
}

function updateRequestStatus(id, status) {
  if (!requireSignIn()) return;

  state.requests = state.requests.map((request) => (
    request.id === id ? { ...request, status, updatedAt: now() } : request
  ));
  firebaseRuntime.dirtyRequestIds.add(id);
  save();
  render();
}

function clearCompleted() {
  if (!requireSignIn()) return;

  const doneRequestIds = state.requests
    .filter((request) => ["sent_by_user", "cancelled"].includes(request.status))
    .map((request) => request.id);

  doneRequestIds.forEach((id) => firebaseRuntime.deletedRequestIds.add(id));
  doneRequestIds.forEach((id) => firebaseRuntime.dirtyRequestIds.delete(id));
  state.requests = state.requests.filter((request) => !doneRequestIds.includes(request.id));
  save();
  render();
  toast("Done requests cleared");
}

function updateNotificationStatus() {
  if (isIosBrowserMode()) {
    selectors.notificationStatus.textContent = "Install PWA for iOS notifications";
    selectors.notificationStatus.className = "status-pill warn";
    selectors.notifyButton.textContent = "Install to Home Screen";
    selectors.notifyButton.disabled = !isSignedIn();
    selectors.notifyButton.title = "Open this app from the iPhone Home Screen before enabling iOS notifications.";
    return;
  }

  if (!("Notification" in window)) {
    selectors.notificationStatus.textContent = "Notifications unsupported";
    selectors.notificationStatus.className = "status-pill warn";
    selectors.notifyButton.textContent = "Notifications Unsupported";
    selectors.notifyButton.disabled = true;
    return;
  }

  const permission = Notification.permission;
  const currentDevice = getCurrentDevice();
  const hasPushSubscription = Boolean(currentDevice?.pushSubscription?.endpoint);
  const hasPushConfig = Boolean(firebaseRuntime.config?.webPushPublicKey);
  const needsWebPush = isIosPlatform();

  if (permission === "granted" && hasPushSubscription) {
    selectors.notificationStatus.textContent = "Web Push ready";
  } else if (permission === "granted" && needsWebPush && hasPushConfig) {
    selectors.notificationStatus.textContent = "Web Push not subscribed";
  } else if (permission === "granted" && needsWebPush) {
    selectors.notificationStatus.textContent = "Web Push config missing";
  } else if (permission === "granted" && hasPushConfig && supportsPushSubscriptions()) {
    selectors.notificationStatus.textContent = "Notifications ready";
  } else if (permission === "granted") {
    selectors.notificationStatus.textContent = "Local notifications ready";
  } else {
    selectors.notificationStatus.textContent = `Notifications ${permission}`;
  }

  selectors.notificationStatus.className = permission === "granted" && (!needsWebPush || hasPushSubscription)
    ? "status-pill ready"
    : "status-pill warn";
  selectors.notifyButton.textContent = permission === "granted"
    ? "Test / Sync Push"
    : permission === "denied"
      ? "Notifications Blocked"
      : "Enable Notifications";
  selectors.notifyButton.disabled = !isSignedIn() || permission === "denied";
  selectors.notifyButton.title = "";
}

async function enableNotifications() {
  if (!requireSignIn()) return;

  if (isIosBrowserMode()) {
    toast("Open the app from the iPhone Home Screen to enable iOS notifications");
    return;
  }

  if (!("Notification" in window)) {
    toast("Notifications unsupported");
    return;
  }

  if (Notification.permission === "granted") {
    const subscribed = await syncPushSubscription();
    const shown = await showTestNotification();
    await syncAfterNotificationChange();
    toast(notificationToastMessage({ shown, subscribed }));
    return;
  }

  const permission = await Notification.requestPermission();
  updateNotificationStatus();
  let subscribed = false;
  let shown = false;
  if (permission === "granted") {
    subscribed = await syncPushSubscription();
    shown = await showTestNotification();
    await syncAfterNotificationChange();
  }
  toast(permission === "granted" ? notificationToastMessage({ shown, subscribed }) : "Notifications not enabled");
}

function notificationToastMessage({ shown, subscribed }) {
  if (subscribed && isIosPlatform()) {
    return shown
      ? "Local test sent. Lock iPhone and create a request to test Web Push"
      : "Web Push synced. Create a request to test locked iPhone delivery";
  }

  if (subscribed) {
    return shown ? "Test sent. Web Push synced" : "Web Push synced";
  }

  if (isIosPlatform()) {
    return shown ? "Local test sent. Web Push not configured" : "Web Push not configured";
  }

  return shown ? "Test notification sent" : "Test notification unavailable";
}

async function syncPushSubscription() {
  const subscription = await ensurePushSubscription();
  if (!subscription) {
    updateNotificationStatus();
    return false;
  }

  applyCurrentPushSubscription(subscription);
  save({ remote: false });
  updateNotificationStatus();
  return true;
}

async function ensurePushSubscription() {
  if (!supportsPushSubscriptions()) {
    return null;
  }

  const publicKey = firebaseRuntime.config?.webPushPublicKey;
  if (!publicKey) {
    return null;
  }

  const registration = await navigator.serviceWorker?.ready.catch(() => null);
  if (!registration?.pushManager) {
    return null;
  }

  const existingSubscription = await registration.pushManager.getSubscription();
  if (existingSubscription) {
    return existingSubscription;
  }

  try {
    return await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey)
    });
  } catch (error) {
    console.warn(error);
    return null;
  }
}

function applyCurrentPushSubscription(subscription) {
  const serializedSubscription = serializePushSubscription(subscription);
  if (!serializedSubscription) return false;

  upsertCurrentDevice();
  state.devices = state.devices.map((device) => (
    device.id === state.profile.deviceId
      ? {
        ...device,
        notificationPermission: currentNotificationPermission(),
        notificationMode: WEB_PUSH_MODE,
        supportsPush: supportsPushSubscriptions(),
        installContext: currentInstallContext(),
        pushSubscription: serializedSubscription,
        pushSubscriptionUpdatedAt: now(),
        updatedAt: now()
      }
      : device
  ));

  return true;
}

function serializePushSubscription(subscription) {
  const json = typeof subscription.toJSON === "function" ? subscription.toJSON() : subscription;
  const endpoint = json?.endpoint;
  const p256dh = json?.keys?.p256dh;
  const auth = json?.keys?.auth;

  if (!endpoint || !p256dh || !auth) {
    return null;
  }

  return {
    endpoint,
    expirationTime: json.expirationTime ?? null,
    keys: { p256dh, auth }
  };
}

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = `${base64String}${padding}`.replaceAll("-", "+").replaceAll("_", "/");
  const rawData = window.atob(base64);

  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

async function hydrateExistingPushSubscription() {
  if (!supportsPushSubscriptions()) return;

  const registration = await navigator.serviceWorker?.ready.catch(() => null);
  const subscription = registration?.pushManager
    ? await registration.pushManager.getSubscription().catch(() => null)
    : null;
  if (!subscription) return;

  applyCurrentPushSubscription(subscription);
  save({ remote: false });
  updateNotificationStatus();
}

function getCurrentDevice() {
  return state.devices.find((device) => device.id === state.profile.deviceId) || null;
}

async function syncAfterNotificationChange() {
  try {
    await syncCloudState({ notify: true, push: false });
  } catch (error) {
    setCloudStatus("Cloud sync failed", "warn");
    console.warn(error);
  }

  await notifyPendingRequests();
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
    && !hasDeliveredWebPush(request)
    && state.notifiedRequests[request.id] !== "shown";
}

function hasDeliveredWebPush(request) {
  const delivery = request.notificationDelivery?.[state.profile.deviceId];
  return delivery?.mode === WEB_PUSH_MODE && delivery?.status === "sent";
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

  const links = buildLinks(request);
  const channelName = getPrimaryChannel(request);
  const appUrl = `/?view=pending&request=${encodeURIComponent(request.id)}&handoff=1`;
  const handoffUrl = links[channelName] || "";
  const notificationOptions = buildNotificationOptions({
    body: `${CHANNEL_LABELS[channelName]} / ${request.recipient}`,
    appUrl,
    handoffUrl,
    tag: `n-smart-request-${request.id}`,
    requestId: request.id,
    channel: channelName
  });

  await showNotificationViaWorker(registration, `${CHANNEL_LABELS[channelName]} message request`, notificationOptions);

  return true;
}

async function showTestNotification() {
  if (!("Notification" in window) || Notification.permission !== "granted") return false;

  const registration = await navigator.serviceWorker?.ready.catch(() => null);
  if (!registration) return false;

  try {
    await showNotificationViaWorker(registration, "N Smart notification test", buildNotificationOptions({
      body: `${notificationTestLabel()} notification check for device #${shortId(state.profile.deviceId)}`,
      appUrl: "/?view=pending",
      tag: `n-smart-test-${Date.now()}`
    }));
  } catch (error) {
    console.warn(error);
    return false;
  }

  return true;
}

function notificationTestLabel() {
  if (isIosPlatform()) return "iOS Home Screen";
  const platform = detectPlatform();
  return platform === "android" ? "Android" : "Browser";
}

function buildNotificationOptions(options) {
  const appUrl = options.appUrl || options.url || "/";

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
      url: appUrl,
      appUrl,
      handoffUrl: options.handoffUrl || "",
      requestId: options.requestId || "",
      channel: options.channel || ""
    }
  };
}

async function showNotificationViaWorker(registration, title, options) {
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
    await navigator.serviceWorker.ready;
    await hydrateExistingPushSubscription();
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
  updateNotificationStatus();

  if (!result.configured) {
    return;
  }

  if (state.firebaseAuth?.refreshToken) {
    try {
      await getValidFirebaseIdToken();
      await hydrateExistingPushSubscription();
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

    state.devices = mergeCloudItems({
      localItems: state.devices,
      cloudItems: Object.values(cloudState?.devices || {}),
      dirtyIds: firebaseRuntime.dirtyDeviceIds,
      deletedIds: firebaseRuntime.deletedDeviceIds,
      preserveId: state.profile.deviceId
    });
    state.requests = mergeCloudItems({
      localItems: state.requests,
      cloudItems: Object.values(cloudState?.messageRequests || {}),
      dirtyIds: firebaseRuntime.dirtyRequestIds,
      deletedIds: firebaseRuntime.deletedRequestIds
    });

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
      await pushCurrentDeviceHeartbeat(token);
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
    const changedDeviceIds = new Set(firebaseRuntime.dirtyDeviceIds);
    const changedRequestIds = new Set(firebaseRuntime.dirtyRequestIds);
    const deletedDeviceIds = new Set(firebaseRuntime.deletedDeviceIds);
    const deletedRequestIds = new Set(firebaseRuntime.deletedRequestIds);
    const patch = serializeCloudPatch({
      changedDeviceIds,
      changedRequestIds,
      deletedDeviceIds,
      deletedRequestIds
    });

    await writeRealtimePath(firebaseRuntime.config, userPath(), token, patch, "PATCH");
    changedDeviceIds.forEach((id) => firebaseRuntime.dirtyDeviceIds.delete(id));
    changedRequestIds.forEach((id) => firebaseRuntime.dirtyRequestIds.delete(id));
    deletedDeviceIds.forEach((id) => firebaseRuntime.deletedDeviceIds.delete(id));
    deletedRequestIds.forEach((id) => firebaseRuntime.deletedRequestIds.delete(id));
    setCloudStatus("Cloud synced", "ready");
  } finally {
    firebaseRuntime.pushing = false;
  }
}

function serializeCloudPatch(changes) {
  const patch = {
    account: {
      uid: state.firebaseAuth.uid,
      email: state.firebaseAuth.email || "",
      updatedAt: now()
    }
  };

  changes.changedDeviceIds.forEach((id) => {
    const device = state.devices.find((item) => item.id === id);
    if (device && shouldSyncDevice(device)) {
      patch[`devices/${id}`] = device;
    }
  });

  changes.changedRequestIds.forEach((id) => {
    const request = state.requests.find((item) => item.id === id);
    if (request) {
      patch[`messageRequests/${id}`] = request;
    }
  });

  changes.deletedDeviceIds.forEach((id) => {
    patch[`devices/${id}`] = null;
  });

  changes.deletedRequestIds.forEach((id) => {
    patch[`messageRequests/${id}`] = null;
  });

  return patch;
}

function mergeCloudItems({ localItems, cloudItems, dirtyIds, deletedIds, preserveId = "" }) {
  const localPendingItems = localItems.filter((item) => (
    item.id === preserveId || (dirtyIds.has(item.id) && !deletedIds.has(item.id))
  ));

  return mergeById(localPendingItems, cloudItems);
}

function shouldSyncDevice(device) {
  return isSavedDeviceRecord(device);
}

async function pushCurrentDeviceHeartbeat(token) {
  const currentDevice = state.devices.find((device) => device.id === state.profile.deviceId);
  if (!currentDevice || !isSavedSenderDevice(currentDevice)) {
    return;
  }

  const heartbeat = {
    ...currentDevice,
    notificationPermission: currentNotificationPermission(),
    notificationMode: currentDevice.pushSubscription?.endpoint ? WEB_PUSH_MODE : notificationModeFromPermission(),
    installContext: currentInstallContext(),
    supportsPush: supportsPushSubscriptions(),
    lastSeenAt: now(),
    updatedAt: now()
  };

  state.devices = state.devices.map((device) => (
    device.id === heartbeat.id ? heartbeat : device
  ));
  await writeRealtimePath(
    firebaseRuntime.config,
    `${userPath()}/devices/${heartbeat.id}`,
    token,
    heartbeat,
    "PUT"
  );
}

function userPath() {
  return `users/${state.firebaseAuth.uid}`;
}

function bindEvents() {
  selectors.profileForm.addEventListener("input", () => {
    profileFormDirty = true;
  });
  selectors.profileForm.addEventListener("change", () => {
    profileFormDirty = true;
  });
  selectors.profileForm.addEventListener("submit", handleProfileSubmit);
  selectors.authForm.addEventListener("submit", handleAuthSubmit);
  selectors.signOutButton.addEventListener("click", handleSignOut);
  selectors.targetDevice.addEventListener("change", () => {
    targetDeviceManuallySelected = true;
    renderSenderAvailability();
  });
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

  navigator.serviceWorker?.addEventListener("message", (event) => {
    if (event.data?.type !== "notification-clicked") return;

    const request = state.requests.find((item) => item.id === event.data.requestId);
    if (!request || !isCurrentDeviceTarget(request) || request.status !== "pending") return;

    updateRequestStatus(request.id, "opened");
  });

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState !== "visible" || !isSignedIn()) return;

    syncCloudState({ notify: true, push: false }).catch((error) => {
      setCloudStatus("Cloud sync failed", "warn");
      console.warn(error);
    });
  });

  window.addEventListener("offline", () => {
    if (isSignedIn()) {
      setCloudStatus("Cloud offline", "warn");
    }
  });

  window.addEventListener("online", () => {
    if (!isSignedIn()) return;

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
  await openExternalRequest(request, getPrimaryChannel(request), { copySms: false });
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
