import type { NextConfig } from "next";
import fs from "fs";
import path from "path";
import { loadEnvConfig } from "@next/env";

// ローカルは親フォルダの .env.local。Vercel はアプリ直下の環境変数。
loadEnvConfig(process.cwd());
const repoRoot = path.resolve(process.cwd(), "..");
if (fs.existsSync(path.join(repoRoot, "package.json"))) {
  loadEnvConfig(repoRoot);
}

const nextConfig: NextConfig = {
  /* config options here */
};

export default nextConfig;
