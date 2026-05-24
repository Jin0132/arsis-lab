import type { NextConfig } from "next";
import path from "path";
import { loadEnvConfig } from "@next/env";

// npm スクリプトは `cd arsis-lab && next *` のため cwd はこのフォルダ。
// 一方 .env.local がリポジトリ直下にある場合、ここで親の env を読み込む。
const repoRoot = path.resolve(process.cwd(), "..");
loadEnvConfig(repoRoot);

const nextConfig: NextConfig = {
  /* config options here */
};

export default nextConfig;
