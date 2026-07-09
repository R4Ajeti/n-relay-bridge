import { cp, mkdir, rm, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const distDir = path.join(rootDir, "dist");

const requiredFiles = [
  "index.html",
  "offline.html",
  "manifest.webmanifest",
  "sw.js",
  "icons/icon.svg",
  "src/app.js",
  "src/firebase-client.js",
  "src/firebase-config.generated.json",
  "src/styles.css"
];

for (const file of requiredFiles) {
  const filePath = path.join(rootDir, file);
  const fileInfo = await stat(filePath).catch(() => null);

  if (!fileInfo?.isFile()) {
    throw new Error(`Missing deploy file: ${file}. Run npm run firebase:config first if Firebase config is missing.`);
  }
}

await rm(distDir, { force: true, recursive: true });
await mkdir(distDir, { recursive: true });

for (const file of requiredFiles) {
  const source = path.join(rootDir, file);
  const target = path.join(distDir, file);
  await mkdir(path.dirname(target), { recursive: true });
  await cp(source, target);
}

console.log(`Firebase Hosting artifact written to ${path.relative(rootDir, distDir)}`);
