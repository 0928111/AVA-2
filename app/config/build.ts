import tauriConfig from "../../src-tauri/tauri.conf.json";

export const getBuildConfig = () => {
  if (typeof process === "undefined") {
    throw Error(
      "[Server Config] you are importing a nodejs-only module outside of nodejs",
    );
  }

  const buildMode = process.env.BUILD_MODE ?? "standalone";
  const isApp = !!process.env.BUILD_APP;
  const version = "v" + tauriConfig.package.version;

  // Default commit info - use environment variables or fallback to unknown
  // These can be set during build time in CI/CD environment
  const commitDate =
    process.env.GIT_COMMIT_DATE ||
    process.env.NEXT_PUBLIC_GIT_COMMIT_DATE ||
    "unknown";
  const commitHash =
    process.env.GIT_COMMIT_HASH ||
    process.env.NEXT_PUBLIC_GIT_COMMIT_HASH ||
    "unknown";

  return {
    version,
    commitDate,
    commitHash,
    buildMode,
    isApp,
    // Coze configuration from environment variables
    cozeApiKey: process.env.COZE_API_KEY || "",
    cozeBotId: process.env.COZE_BOT_ID || "",
    cozeBaseUrl: process.env.COZE_BASE_URL || "https://api.coze.com",
  };
};

export type BuildConfig = ReturnType<typeof getBuildConfig>;
