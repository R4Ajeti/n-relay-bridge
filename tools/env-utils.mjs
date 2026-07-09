import { readFile } from "node:fs/promises";

export async function readDotEnv(filePath = ".env") {
  try {
    const contents = await readFile(filePath, "utf8");
    return Object.fromEntries(contents
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#"))
      .map(parseEnvLine));
  } catch (error) {
    if (error.code === "ENOENT") return {};
    throw error;
  }
}

export function getEnvValue(dotEnv, key) {
  return process.env[key] || dotEnv[key] || "";
}

function parseEnvLine(line) {
  const separator = line.indexOf("=");
  if (separator === -1) return [line, ""];

  const key = line.slice(0, separator).trim();
  const value = line.slice(separator + 1).trim().replace(/^['"]|['"]$/g, "");
  return [key, value];
}
