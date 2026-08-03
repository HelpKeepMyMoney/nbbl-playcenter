import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  transpilePackages: ["@nbbl/shared"],
  outputFileTracingRoot: path.join(__dirname, "../../"),
};

export default nextConfig;
