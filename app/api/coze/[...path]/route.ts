import { NextRequest, NextResponse } from "next/server";
import { getServerSideConfig } from "@/app/config/server";
import { auth } from "../../auth";

// 支持 Coze 子路径
enum CozePath {
  ChatPath = "v3/chat",
  BotPath = "v3/bot",
}

const ALLOWED_PATH = new Set<string>(Object.values(CozePath));

type CozeConfig = {
  apiKey: string;
  baseUrl: string;
  botId: string;
};

function getCozeConfig(): CozeConfig {
  const serverConfig = getServerSideConfig();
  const apiKey = serverConfig.cozeApiKey;
  const botId = serverConfig.cozeBotId;
  const baseUrl = serverConfig.cozeBaseUrl || "https://api.coze.com";

  if (!apiKey || !botId) {
    throw new Error("Missing Coze API configuration in environment variables");
  }

  return {
    apiKey,
    botId,
    baseUrl,
  };
}

// 内部请求 Coze 的工具函数
async function requestCoze(req: NextRequest, path: string) {
  const config = getCozeConfig();

  if (!config.apiKey) {
    throw new Error("Coze API key is not configured");
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5 * 60 * 1000);

  try {
    const base = config.baseUrl.replace(/\/+$/, "");
    const url = `${base}/${path}`;

    let body: string | null = null;

    if (req.method !== "GET") {
      const raw = await req.text();
      if (raw) {
        try {
          const jsonBody: any = JSON.parse(raw);

          // 如果没有 bot_id，使用配置中的 botId
          if (path === CozePath.ChatPath && !jsonBody.bot_id && config.botId) {
            jsonBody.bot_id = config.botId;
          }

          // 某些字段会导致 4000 错误，提前删除
          if ("shortcut_command" in jsonBody) {
            delete jsonBody.shortcut_command;
          }

          body = JSON.stringify(jsonBody);
        } catch {
          // 不是 JSON，就原样转发
          body = raw;
        }
      }
    }

    const headers: Record<string, string> = {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    };

    const response = await fetch(url, {
      method: req.method,
      headers,
      body: body ?? undefined,
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      throw new Error(
        `HTTP ${response.status} from Coze: ${
          errorText || response.statusText
        }`,
      );
    }

    const text = await response.text();

    return new NextResponse(text, {
      status: response.status,
      headers: {
        "Content-Type":
          response.headers.get("content-type") || "application/json",
      },
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

async function handle(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  try {
    const resolvedParams = await params;
    const subpath = resolvedParams.path.join("/");

    if (req.method === "OPTIONS") {
      return NextResponse.json({ body: "OK" }, { status: 200 });
    }

    if (!ALLOWED_PATH.has(subpath)) {
      return NextResponse.json(
        {
          error: true,
          msg: `you are not allowed to request ${subpath}`,
        },
        { status: 403 },
      );
    }

    // 访问控制（和原项目逻辑保持一致）
    const authResult = auth(req);
    if (authResult.error) {
      return NextResponse.json(authResult, { status: 401 });
    }

    const response = await requestCoze(req, subpath);
    return response;
  } catch (error) {
    let message = "Unknown error";

    if (error instanceof Error) {
      message = error.message;
    }

    return NextResponse.json(
      {
        error: true,
        msg: message,
      },
      { status: 500 },
    );
  }
}

export const GET = handle;
export const POST = handle;
export const runtime = "edge";
