import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const currentDir = dirname(fileURLToPath(import.meta.url));
const candidatePaths = [
  resolve(process.cwd(), ".env"),
  resolve(process.cwd(), "..", ".env"),
  resolve(currentDir, "..", "..", ".env"),
  resolve(currentDir, "..", "..", "..", ".env"),
];

const envPath = candidatePaths.find((path) => existsSync(path));

dotenv.config(envPath ? { path: envPath, quiet: true } : { quiet: true });
