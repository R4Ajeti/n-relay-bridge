const CONFIG_PATH = "/src/firebase-config.generated.json";
const IDENTITY_TOOLKIT_BASE = "https://identitytoolkit.googleapis.com/v1";
const SECURE_TOKEN_BASE = "https://securetoken.googleapis.com/v1";

export async function loadFirebaseConfig() {
  try {
    const response = await fetch(CONFIG_PATH, { cache: "no-store" });

    if (!response.ok) {
      return {
        configured: false,
        reason: response.status === 404 ? "missing" : `HTTP ${response.status}`
      };
    }

    const config = normalizeConfig(await response.json());
    return { configured: true, config };
  } catch (error) {
    return { configured: false, reason: error.message || "Unable to load Firebase config" };
  }
}

export async function createEmailPasswordAccount(config, email, password) {
  return authRequest(config, "accounts:signUp", {
    email,
    password,
    returnSecureToken: true
  });
}

export async function signInWithEmailPassword(config, email, password) {
  return authRequest(config, "accounts:signInWithPassword", {
    email,
    password,
    returnSecureToken: true
  });
}

export async function refreshFirebaseSession(config, refreshToken) {
  const url = `${SECURE_TOKEN_BASE}/token?key=${encodeURIComponent(config.apiKey)}`;
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken
  });

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body
  });
  const payload = await readJsonResponse(response);

  return {
    uid: payload.user_id,
    idToken: payload.id_token,
    refreshToken: payload.refresh_token,
    expiresAt: Date.now() + Number(payload.expires_in || 3600) * 1000
  };
}

export async function readRealtimePath(config, path, idToken) {
  const response = await fetch(databaseUrl(config, path, idToken), {
    method: "GET",
    headers: { Accept: "application/json" }
  });

  return readJsonResponse(response);
}

export async function writeRealtimePath(config, path, idToken, value, method = "PUT") {
  const response = await fetch(databaseUrl(config, path, idToken), {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(value)
  });

  return readJsonResponse(response);
}

function normalizeConfig(config) {
  const requiredFields = ["apiKey", "databaseURL", "projectId"];
  const missingFields = requiredFields.filter((field) => !config[field] || typeof config[field] !== "string");

  if (missingFields.length > 0) {
    throw new Error(`Firebase config missing: ${missingFields.join(", ")}`);
  }

  return {
    ...config,
    databaseURL: config.databaseURL.replace(/\/+$/, "")
  };
}

async function authRequest(config, action, body) {
  const url = `${IDENTITY_TOOLKIT_BASE}/${action}?key=${encodeURIComponent(config.apiKey)}`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });

  const payload = await readJsonResponse(response);

  return {
    uid: payload.localId,
    email: payload.email || body.email,
    idToken: payload.idToken,
    refreshToken: payload.refreshToken,
    expiresAt: Date.now() + Number(payload.expiresIn || 3600) * 1000
  };
}

async function readJsonResponse(response) {
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(formatFirebaseError(payload?.error?.message || `Firebase request failed: ${response.status}`));
  }

  return payload;
}

function databaseUrl(config, path, idToken) {
  const encodedPath = path
    .split("/")
    .filter(Boolean)
    .map((part) => encodeURIComponent(part))
    .join("/");

  return `${config.databaseURL}/${encodedPath}.json?auth=${encodeURIComponent(idToken)}`;
}

function formatFirebaseError(message) {
  const cleanMessage = String(message || "").split(" : ")[0];
  const messages = {
    EMAIL_EXISTS: "Email is already registered",
    EMAIL_NOT_FOUND: "Email was not found",
    INVALID_LOGIN_CREDENTIALS: "Invalid email or password",
    INVALID_PASSWORD: "Invalid email or password",
    MISSING_PASSWORD: "Password is required",
    WEAK_PASSWORD: "Password should be at least 6 characters",
    USER_DISABLED: "This account is disabled",
    TOKEN_EXPIRED: "Firebase session expired"
  };

  return messages[cleanMessage] || cleanMessage.replaceAll("_", " ").toLowerCase();
}
