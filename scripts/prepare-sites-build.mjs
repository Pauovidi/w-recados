import { copyFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const serverDir = path.join(root, "dist", "server");
const manifestDir = path.join(root, "dist", ".openai");

await mkdir(serverDir, { recursive: true });
await mkdir(manifestDir, { recursive: true });

await copyFile(
  path.join(root, "sites", "worker.js"),
  path.join(serverDir, "index.js")
);
await copyFile(
  path.join(root, ".openai", "hosting.json"),
  path.join(manifestDir, "hosting.json")
);

console.log("Sites-compatible server and hosting manifest prepared.");
