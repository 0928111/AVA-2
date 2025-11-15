import { getClientConfig } from "../config/client";
import { ACCESS_CODE_PREFIX } from "../constant";
import { ChatMessage, useAccessStore } from "../store";
import { ModelType } from "../store/config";
import { ChatGPTApi } from "./platforms/openai";
import { CozeApi } from "./platforms/coze";
import React from "react";
export const ROLES = ["system", "user", "assistant"] as const;
export type MessageRole = (typeof ROLES)[number];

export const Models = ["gpt-3.5-turbo", "gpt-4"] as const;
export type ChatModel = ModelType;

export interface RequestMessage {
  role: MessageRole;
  content: string;
  animation: React.ReactNode | null;
}

export interface LLMConfig {
  model: string;
  temperature?: number;
  top_p?: number;
  stream?: boolean;
  presence_penalty?: number;
  frequency_penalty?: number;
}

export interface ChatOptions {
  messages: RequestMessage[];
  config: LLMConfig;
  conversationId?: string;

  onUpdate?: (message: string, chunk: string) => void;
  onFinish: (message: string) => void;
  onError?: (err: Error) => void;
  onController?: (controller: AbortController) => void;
}

export interface LLMUsage {
  used: number;
  total: number;
}

export interface LLMModel {
  name: string;
  available: boolean;
}

export abstract class LLMApi {
  abstract chat(options: ChatOptions): Promise<void>;
  abstract usage(): Promise<LLMUsage>;
  abstract models(): Promise<LLMModel[]>;
}

type ProviderName = "openai" | "azure" | "claude" | "palm" | "coze";

interface Model {
  name: string;
  provider: ProviderName;
  ctxlen: number;
}

interface ChatProvider {
  name: ProviderName;
  apiConfig: {
    baseUrl: string;
    apiKey: string;
    summaryModel: Model;
  };
  models: Model[];

  chat: () => void;
  usage: () => void;
}

export class ClientApi {
  public llm: LLMApi;

  constructor(provider: ProviderName = "coze") {
    switch (provider) {
      case "coze":
      default:
        this.llm = new CozeApi();
        break;
    }
  }

  config() {}

  prompts() {}

  masks() {}

  async share(messages: ChatMessage[], avatarUrl: string | null = null) {
    const msgs = messages
      .map((m) => ({
        from: m.role === "user" ? "human" : "gpt",
        value: m.content,
      }))
      .concat([
        {
          from: "human",
          value:
            "Share from [ChatGPT Next Web]: https://github.com/Yidadaa/ChatGPT-Next-Web",
        },
      ]);
    // 敬告二开开发者们，为了开源大模型的发展，请不要修改上述消息，此消息用于后续数据清洗使用
    // Please do not modify this message

    console.log("[Share]", messages, msgs);
    const clientConfig = getClientConfig();
    const proxyUrl = "/sharegpt";
    const rawUrl = "https://sharegpt.com/api/conversations";
    const shareUrl = clientConfig?.isApp ? rawUrl : proxyUrl;
    const res = await fetch(shareUrl, {
      body: JSON.stringify({
        avatarUrl,
        items: msgs,
      }),
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
    });

    const resJson = await res.json();
    console.log("[Share]", resJson);
    if (resJson.id) {
      return `https://shareg.pt/${resJson.id}`;
    }
  }
}

// 动态API客户端 - 根据模型类型自动切换平台
class DynamicApiClient {
  private openaiApi: ClientApi;
  private cozeApi: ClientApi;
  private currentProvider: ProviderName = "openai";
  private lastModelCheck: string = "";
  private lastLlm: LLMApi;

  constructor() {
    this.openaiApi = new ClientApi("openai");
    this.cozeApi = new ClientApi("coze");
    this.lastLlm = this.openaiApi.llm;
  }

  get llm(): LLMApi {
    // 根据当前模型类型选择对应的API客户端
    const currentModel = this.getCurrentModel();

    // 如果模型没有变化，返回缓存的LLM实例
    if (currentModel === this.lastModelCheck) {
      return this.lastLlm;
    }

    // 模型发生变化，重新选择API客户端
    this.lastModelCheck = currentModel;

    if (currentModel === "coze-bot") {
      this.currentProvider = "coze";
      this.lastLlm = this.cozeApi.llm;
      return this.cozeApi.llm;
    } else {
      this.currentProvider = "openai";
      this.lastLlm = this.openaiApi.llm;
      return this.openaiApi.llm;
    }
  }

  private getCurrentModel(): string {
    // 强制使用coze-bot模型，移除所有OpenAI相关内容
    return "coze-bot";
  }

  // 代理其他方法到对应的API客户端
  config() {
    return this.currentProvider === "coze"
      ? this.cozeApi.config()
      : this.openaiApi.config();
  }

  prompts() {
    return this.currentProvider === "coze"
      ? this.cozeApi.prompts()
      : this.openaiApi.prompts();
  }

  masks() {
    return this.currentProvider === "coze"
      ? this.cozeApi.masks()
      : this.openaiApi.masks();
  }

  async share(messages: ChatMessage[], avatarUrl?: string | null) {
    return this.currentProvider === "coze"
      ? this.cozeApi.share(messages, avatarUrl)
      : this.openaiApi.share(messages, avatarUrl);
  }
}

export const api = new DynamicApiClient();

export function getHeaders() {
  const accessStore = useAccessStore.getState();
  let headers: Record<string, string> = {
    "Content-Type": "application/json",
    "x-requested-with": "XMLHttpRequest",
  };

  const makeBearer = (token: string) => `Bearer ${token.trim()}`;
  const validString = (x: string) => x && x.length > 0;

  // ASCII字符验证函数，确保所有HTTP请求头只包含ASCII字符
  const isAsciiOnly = (str: string) => {
    if (!str || typeof str !== "string") return false;
    for (let i = 0; i < str.length; i++) {
      if (str.charCodeAt(i) > 127) {
        console.warn(
          `[Headers] Non-ASCII character detected at position ${i}: "${str[i]}", skipping Authorization header`,
        );
        return false;
      }
    }
    return true;
  };

  // 验证所有header值都是ASCII字符
  Object.entries(headers).forEach(([key, value]) => {
    if (!isAsciiOnly(value)) {
      console.error(
        `[Headers] CRITICAL: Default header "${key}" contains non-ASCII characters: ${JSON.stringify(value)}`,
      );
      headers[key] = ""; // 清空非ASCII字符的header值
    }
  });

  // use user's api key first
  if (validString(accessStore.token) && isAsciiOnly(accessStore.token)) {
    const bearerToken = makeBearer(accessStore.token);
    if (isAsciiOnly(bearerToken)) {
      headers.Authorization = bearerToken;
    } else {
      console.error(
        "[Headers] Generated Authorization header contains non-ASCII characters, skipping",
      );
    }
  } else if (
    accessStore.enabledAccessControl() &&
    validString(accessStore.accessCode) &&
    isAsciiOnly(accessStore.accessCode)
  ) {
    const bearerToken = makeBearer(ACCESS_CODE_PREFIX + accessStore.accessCode);
    if (isAsciiOnly(bearerToken)) {
      headers.Authorization = bearerToken;
    } else {
      console.error(
        "[Headers] Generated Authorization header contains non-ASCII characters, skipping",
      );
    }
  }

  // 最终验证：确保所有header值都是纯ASCII
  Object.entries(headers).forEach(([key, value]) => {
    if (!isAsciiOnly(value)) {
      console.error(
        `[Headers] FINAL VALIDATION FAILED: Header "${key}" still contains non-ASCII characters, removing it`,
      );
      delete headers[key];
    }
  });

  console.log("[Headers] Final headers:", Object.keys(headers));
  return headers;
}
