import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { getEnvValue, readDotEnv } from "./env-utils.mjs";

const envName = "N_RELAY_FIREBASE_WEB_CONFIG_BASE64";
const dotEnv = await readDotEnv(".env");
const outputPath = process.env.N_RELAY_FIREBASE_CONFIG_OUTPUT
  || dotEnv.N_RELAY_FIREBASE_CONFIG_OUTPUT
  || "src/firebase-config.generated.json";
const encodedConfig = getEnvValue(dotEnv, envName);
const webPushPublicKey = getEnvValue(dotEnv, "N_RELAY_WEB_PUSH_PUBLIC_KEY");

if (!encodedConfig) {
  throw new Error(`${envName} is required. See .env.example for the expected base64 JSON.`);
}

let config;

try {
  const decoded = Buffer.from(encodedConfig, "base64").toString("utf8");
  config = JSON.parse(decoded);
} catch (error) {
  throw new Error(`${envName} must be valid base64-encoded JSON. ${error.message}`);
}

const requiredFields = ["apiKey", "authDomain", "databaseURL", "projectId", "appId"];
const missingFields = requiredFields.filter((field) => !config[field] || typeof config[field] !== "string");

if (missingFields.length > 0) {
  throw new Error(`Firebase config is missing required field(s): ${missingFields.join(", ")}`);
}

const browserConfig = {
  apiKey: config.apiKey,
  authDomain: config.authDomain,
  databaseURL: config.databaseURL.replace(/\/+$/, ""),
  projectId: config.projectId,
  appId: config.appId,
  messagingSenderId: config.messagingSenderId || "",
  storageBucket: config.storageBucket || "",
  webPushPublicKey
};

const resolvedOutput = path.resolve(outputPath);
await mkdir(path.dirname(resolvedOutput), { recursive: true });
await writeFile(resolvedOutput, `${JSON.stringify(browserConfig, null, 2)}\n`, "utf8");

console.log(`Firebase browser config written to ${outputPath}`);
