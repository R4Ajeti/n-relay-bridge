import { createReadStream } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getEnvValue, readDotEnv } from "./env-utils.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const port = Number(process.env.PORT || 4173);
const host = process.env.HOST || "0.0.0.0";
const dotEnv = await readDotEnv(path.join(rootDir, ".env"));

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url || "/", `http://${request.headers.host || "localhost"}`);

    if (url.pathname === "/health") {
      await handleHealth(response);
      return;
    }

    await serveStatic(url.pathname, response);
  } catch (error) {
    writeJson(response, 500, {
      ok: false,
      status: "error",
      error: error.message || "Unexpected server error"
    });
  }
});

server.listen(port, host, () => {
  console.log(`n-relay-bridge running at http://localhost:${port}/`);
  console.log(`Health check available at http://localhost:${port}/health`);
});

async function handleHealth(response) {
  const startedAt = Date.now();
  const result = {
    ok: false,
    status: "checking",
    server: "ok",
    checkedAt: new Date().toISOString(),
    firebase: {
      config: "missing",
      projectId: null,
      databaseURL: null,
      databaseReachable: false,
      databaseRules: "unknown",
      authenticatedSmokeTest: "skipped"
    }
  };

  try {
    const config = await readFirebaseBrowserConfig();
    result.firebase.config = "loaded";
    result.firebase.projectId = config.projectId;
    result.firebase.databaseURL = config.databaseURL;

    const databaseCheck = await checkDatabaseReachability(config);
    result.firebase.databaseReachable = databaseCheck.reachable;
    result.firebase.databaseRules = databaseCheck.rules;
    result.firebase.databaseHttpStatus = databaseCheck.httpStatus;

    const healthEmail = getEnvValue(dotEnv, "N_RELAY_FIREBASE_HEALTH_EMAIL");
    const healthPassword = getEnvValue(dotEnv, "N_RELAY_FIREBASE_HEALTH_PASSWORD");

    if (healthEmail && healthPassword) {
      result.firebase.authenticatedSmokeTest = await runAuthenticatedSmokeTest(config, healthEmail, healthPassword);
    }

    result.ok = result.firebase.databaseReachable
      && result.firebase.config === "loaded"
      && !String(result.firebase.authenticatedSmokeTest).startsWith("failed");
    result.status = result.ok ? "ok" : "degraded";
  } catch (error) {
    result.status = "error";
    result.error = error.message || "Health check failed";
  }

  result.durationMs = Date.now() - startedAt;
  writeJson(response, result.ok ? 200 : 503, result);
}

async function readFirebaseBrowserConfig() {
  const configPath = path.join(rootDir, "src/firebase-config.generated.json");
  const config = JSON.parse(await readFile(configPath, "utf8"));
  const requiredFields = ["apiKey", "authDomain", "databaseURL", "projectId", "appId"];
  const missingFields = requiredFields.filter((field) => !config[field] || typeof config[field] !== "string");

  if (missingFields.length > 0) {
    throw new Error(`Firebase generated config missing: ${missingFields.join(", ")}`);
  }

  return {
    ...config,
    databaseURL: config.databaseURL.replace(/\/+$/, "")
  };
}

async function checkDatabaseReachability(config) {
  const response = await fetch(`${config.databaseURL}/.json?shallow=true`, {
    headers: { Accept: "application/json" }
  });
  const payload = await response.json().catch(() => null);

  if (response.ok) {
    return {
      reachable: true,
      rules: "public-read-or-open",
      httpStatus: response.status
    };
  }

  const errorMessage = String(payload?.error || "");

  if ([401, 403].includes(response.status) || errorMessage.toLowerCase().includes("permission")) {
    return {
      reachable: true,
      rules: "protected",
      httpStatus: response.status
    };
  }

  return {
    reachable: false,
    rules: "unknown",
    httpStatus: response.status
  };
}

async function runAuthenticatedSmokeTest(config, email, password) {
  try {
    const auth = await signIn(config, email, password);
    const uid = encodeURIComponent(auth.uid);
    const healthPath = `${config.databaseURL}/users/${uid}/health.json?auth=${encodeURIComponent(auth.idToken)}`;
    const payload = {
      checkedAt: new Date().toISOString(),
      source: "n-relay-bridge-health"
    };

    const writeResponse = await fetch(healthPath, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!writeResponse.ok) {
      const writePayload = await writeResponse.json().catch(() => null);
      return `failed-write-${writeResponse.status}-${writePayload?.error || "unknown"}`;
    }

    const readResponse = await fetch(healthPath, {
      headers: { Accept: "application/json" }
    });
    const readPayload = await readResponse.json().catch(() => null);

    if (!readResponse.ok || readPayload?.source !== payload.source) {
      return `failed-read-${readResponse.status}`;
    }

    return "passed";
  } catch (error) {
    return `failed-${error.message || "unknown"}`;
  }
}

async function signIn(config, email, password) {
  const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${encodeURIComponent(config.apiKey)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email,
      password,
      returnSecureToken: true
    })
  });
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(payload?.error?.message || `auth-${response.status}`);
  }

  return {
    uid: payload.localId,
    idToken: payload.idToken
  };
}

async function serveStatic(pathname, response) {
  const safePath = normalizePath(pathname);
  const filePath = await resolveFilePath(safePath);
  const fileInfo = await stat(filePath).catch(() => null);

  if (!fileInfo || !fileInfo.isFile()) {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Not found");
    return;
  }

  response.writeHead(200, {
    "Content-Type": contentType(filePath),
    "Cache-Control": filePath.endsWith("firebase-config.generated.json") ? "no-store" : "no-cache"
  });
  createReadStream(filePath).pipe(response);
}

async function resolveFilePath(safePath) {
  const requestedPath = path.join(rootDir, safePath);
  const normalized = path.normalize(requestedPath);

  if (!normalized.startsWith(rootDir)) {
    return path.join(rootDir, "404");
  }

  const fileInfo = await stat(normalized).catch(() => null);
  if (fileInfo?.isDirectory()) return path.join(normalized, "index.html");
  return normalized;
}

function normalizePath(pathname) {
  const decodedPath = decodeURIComponent(pathname);
  if (decodedPath === "/") return "index.html";
  return decodedPath.replace(/^\/+/, "");
}

function contentType(filePath) {
  const extension = path.extname(filePath);
  const types = {
    ".css": "text/css; charset=utf-8",
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".svg": "image/svg+xml",
    ".webmanifest": "application/manifest+json; charset=utf-8"
  };

  return types[extension] || "application/octet-stream";
}

function writeJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  });
  response.end(`${JSON.stringify(payload, null, 2)}\n`);
}
