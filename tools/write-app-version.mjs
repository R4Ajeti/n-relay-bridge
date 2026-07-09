import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const packageJson = JSON.parse(await readFile(path.join(rootDir, "package.json"), "utf8"));
const outputPath = path.join(rootDir, "src", "app-version.generated.json");

const appVersion = {
  name: packageJson.name,
  version: packageJson.version,
  builtAt: new Date().toISOString()
};

await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(appVersion, null, 2)}\n`, "utf8");

console.log(`App version ${appVersion.version} written to ${path.relative(rootDir, outputPath)}`);
