import { NextResponse } from "next/server";
import { getServerSideConfig } from "../../config/server";

const serverConfig = getServerSideConfig();

// 扩展配置信息，用于测试和调试
const API_CONFIG = {
  // 安全配置（不暴露敏感信息）
  needCode: serverConfig.needCode,
  hideUserApiKey: serverConfig.hideUserApiKey,
  disableGPT4: serverConfig.disableGPT4,
  hideBalanceQuery: serverConfig.hideBalanceQuery,

  // API配置信息
  defaultModel: serverConfig.model || "gpt-3.5-turbo",
  openaiUrl: serverConfig.openaiUrl || "https://api.openai.com",
  cozeUrl: serverConfig.cozeUrl || "https://api.coze.com",
  hasApiKey: !!(
    serverConfig.apiKey ||
    serverConfig.openaiApiKey ||
    serverConfig.cozeApiKey
  ),

  // 环境信息
  buildMode: serverConfig.buildMode || "standalone",
  isVercel: !!process.env.VERCEL,
  nodeEnv: process.env.NODE_ENV || "development",

  // 平台支持状态
  openaiEnabled: !!(serverConfig.openaiApiKey || process.env.OPENAI_API_KEY),
  cozeEnabled: !!(
    serverConfig.cozeApiKey ||
    process.env.COZE_API_KEY ||
    serverConfig.cozeBotId
  ),

  // Coze详细配置（用于调试）
  cozeApiKey: serverConfig.cozeApiKey ? "已配置" : "未配置",
  cozeBotId: serverConfig.cozeBotId || "未设置",
  cozeBaseUrl: serverConfig.cozeBaseUrl || "https://api.coze.com",
};

declare global {
  type DangerConfig = typeof API_CONFIG;
}

async function handle() {
  return NextResponse.json(API_CONFIG, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}

export const GET = handle;
export const POST = handle;

export const runtime = "edge";
