import md5 from "spark-md5";

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      OPENAI_API_KEY?: string;
      COZE_API_KEY?: string;
      COZE_BOT_ID?: string;
      COZE_BASE_URL?: string;
      CODE?: string;
      BASE_URL?: string;
      PROXY_URL?: string;
      VERCEL?: string;
      HIDE_USER_API_KEY?: string; // disable user's api key input
      DISABLE_GPT4?: string; // allow user to use gpt-4 or not
      BUILD_MODE?: "standalone" | "export";
      BUILD_APP?: string; // is building desktop app
      HIDE_BALANCE_QUERY?: string; // allow user to query balance or not
      MODEL?: string; // default model
      OPENAI_URL?: string; // custom openai url
      COZE_URL?: string; // custom coze url
    }
  }
}

const ACCESS_CODES = (function getAccessCodes(): Set<string> {
  const code = process.env.CODE;

  try {
    const codes = (code?.split(",") ?? [])
      .filter((v) => !!v)
      .map((v) => md5.hash(v.trim()));
    return new Set(codes);
  } catch (e) {
    return new Set();
  }
})();

export const getServerSideConfig = () => {
  if (typeof process === "undefined") {
    throw Error(
      "[Server Config] you are importing a nodejs-only module outside of nodejs",
    );
  }

  const accessCodes = process.env.CODE;
  const isVercel = !!process.env.VERCEL;
  const cozeApiKey = process.env.COZE_API_KEY;
  const cozeBotId = process.env.COZE_BOT_ID;
  const cozeUrl = process.env.COZE_URL || "https://api.coze.cn";
  const cozeBaseUrl = process.env.COZE_BASE_URL || "https://api.coze.cn";

  return {
    apiKey: "", // 移除OpenAI API Key
    openaiApiKey: "", // 移除OpenAI API Key
    openaiApiKeys: [], // 移除OpenAI API Keys
    openaiOrgId: "", // 移除OpenAI Org ID
    azureUrl: "", // 移除Azure配置
    azureApiKey: "",
    azureApiVersion: "",
    googleApiKey: "", // 移除Google配置
    googleUrl: "",
    anthropicApiKey: "", // 移除Anthropic配置
    anthropicApiVersion: "",
    cozeApiKey,
    cozeBotId,
    code: process.env.CODE,
    codes: ACCESS_CODES,
    needCode: ACCESS_CODES.size > 0,
    baseUrl: process.env.BASE_URL,
    proxyUrl: process.env.PROXY_URL,
    isVercel,
    hideUserApiKey: !!process.env.HIDE_USER_API_KEY,
    disableGPT4: !!process.env.DISABLE_GPT4,
    hideBalanceQuery: !!process.env.HIDE_BALANCE_QUERY,
    buildMode: process.env.BUILD_MODE || "standalone",
    model: process.env.MODEL || "gpt-3.5-turbo",
    openaiUrl: "", // 移除OpenAI URL
    cozeUrl,
    cozeBaseUrl,
    customModels: "", // 移除自定义模型
    accessCodes,
  };
};
