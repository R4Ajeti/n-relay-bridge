import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const envName = "N_RELAY_FIREBASE_WEB_CONFIG_BASE64";
const dotEnv = await readDotEnv(".env");
const outputPath = process.env.N_RELAY_FIREBASE_CONFIG_OUTPUT
  || dotEnv.N_RELAY_FIREBASE_CONFIG_OUTPUT
  || "src/firebase-config.generated.json";
const encodedConfig = process.env[envName] || dotEnv[envName];

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
  storageBucket: config.storageBucket || ""
};

const resolvedOutput = path.resolve(outputPath);
await mkdir(path.dirname(resolvedOutput), { recursive: true });
await writeFile(resolvedOutput, `${JSON.stringify(browserConfig, null, 2)}\n`, "utf8");

console.log(`Firebase browser config written to ${outputPath}`);

async function readDotEnv(filePath) {
  try {
    const contents = await readFile(filePath, "utf8");
    return Object.fromEntries(contents
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#"))
      .map((line) => {
        const separator = line.indexOf("=");
        if (separator === -1) return [line, ""];

        const key = line.slice(0, separator).trim();
        const value = line.slice(separator + 1).trim().replace(/^['"]|['"]$/g, "");
        return [key, value];
      }));
  } catch (error) {
    if (error.code === "ENOENT") return {};
    throw error;
  }
}
