import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const packagePath = path.join(__dirname, "..", "package.json");
const packageJson = JSON.parse(await readFile(packagePath, "utf8"));
const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(packageJson.version || "");

if (!match) {
  throw new Error(`package.json version must be plain semver X.Y.Z. Received: ${packageJson.version}`);
}

const [, major, minor, patch] = match;
const previousVersion = packageJson.version;
packageJson.version = `${major}.${minor}.${Number(patch) + 1}`;

await writeFile(packagePath, `${JSON.stringify(packageJson, null, 2)}\n`, "utf8");

console.log(`Version bumped ${previousVersion} -> ${packageJson.version}`);
