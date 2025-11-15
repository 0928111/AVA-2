import { BuildConfig, getBuildConfig } from "./build";

export function getClientConfig() {
  if (typeof document !== "undefined") {
    // client side
    try {
      const configStr = queryMeta("config");
      if (configStr && configStr !== "") {
        return JSON.parse(configStr) as BuildConfig;
      }
    } catch (e) {
      console.warn("[Client Config] Failed to parse config from meta tag", e);
    }
    // Return default config if parsing fails
    return {
      version: "unknown",
      commitDate: "unknown",
      commitHash: "unknown",
      buildMode: "standalone",
      isApp: false,
      cozeApiKey: "",
      cozeBotId: "",
      cozeBaseUrl: "https://api.coze.com",
    } as BuildConfig;
  }

  if (typeof process !== "undefined") {
    // server side
    return getBuildConfig();
  }

  // Default fallback
  return {
    version: "unknown",
    commitDate: "unknown",
    commitHash: "unknown",
    buildMode: "standalone",
    isApp: false,
    cozeApiKey: "",
    cozeBotId: "",
    cozeBaseUrl: "https://api.coze.com",
  } as BuildConfig;
}

function queryMeta(key: string, defaultValue?: string): string {
  let ret: string;
  if (document) {
    const meta = document.head.querySelector(
      `meta[name='${key}']`,
    ) as HTMLMetaElement;
    ret = meta?.content ?? "";
  } else {
    ret = defaultValue ?? "";
  }

  return ret;
}
