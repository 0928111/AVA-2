import { getClientConfig } from "@/app/config/client";
import { useAccessStore, useAppConfig, useChatStore } from "@/app/store";

import { ChatOptions, LLMApi } from "../api";
import Locale from "../../locales";
import {
  EventStreamContentType,
  fetchEventSource,
} from "@fortaine/fetch-event-source";
import { prettyObject } from "@/app/utils/format";
import { getStudentId } from "@/app/utils/student-id";

// 注意：这些接口定义保留用于向后兼容性，
// 但新的实现使用OpenAI兼容格式通过 /api/coze-chat 路由
export interface CozeChatRequest {
  bot_id: string;
  user_id: string;
  additional_messages: Array<{
    role: string;
    content_type: string;
    content: string;
  }>;
  stream?: boolean;
  auto_save_history?: boolean;
  custom_variables?: Record<string, any>;
}

export interface CozeChatResponse {
  code: number;
  msg: string;
  data: {
    conversation_id: string;
    id: string;
    status: string;
    created_at: number;
    updated_at: number;
    messages?: Array<{
      id: string;
      conversation_id: string;
      content: string;
      role: string;
      type: string;
      created_at: number;
    }>;
  };
}

export class CozeApi implements LLMApi {
  private botId: string;
  private baseUrl: string;
  private apiKey: string;

  constructor() {
    const clientConfig = getClientConfig();
    this.botId = (clientConfig as any)?.cozeBotId || "";
    // 使用 /api/coze-chat 路由，不再使用旧的 /api/coze
    this.baseUrl = "/api/coze";
    this.apiKey = "";
  }

  // 从localStorage获取学号
  private getStudentIdFromStorage(): string | null {
    try {
      return getStudentId();
    } catch (error) {
      console.warn("[Coze] Failed to get student ID from storage:", error);
      return null;
    }
  }

  path(path: string): string {
    // 这个方法现在主要用于向后兼容性
    // 新的实现直接使用 /api/coze-chat 路由
    let cozeUrl = this.baseUrl;

    if (cozeUrl.endsWith("/")) {
      cozeUrl = cozeUrl.slice(0, cozeUrl.length - 1);
    }

    return [cozeUrl, path].join("/");
  }

  extractMessage(res: CozeChatResponse): string {
    // 这个方法现在主要用于向后兼容性
    // 新的实现通过 /api/coze-chat 路由直接返回完整消息
    if (res.data?.messages && res.data.messages.length > 0) {
      const assistantMessage = res.data.messages.find(
        (msg) => msg.role === "assistant",
      );
      return assistantMessage?.content ?? "";
    }
    return "";
  }

  async chat(options: ChatOptions) {
    const messages = options.messages;

    // 提取用户ID（使用会话ID或默认值）
    const sessionId = useChatStore.getState().currentSession().id;
    const userId = `user_${sessionId}`;

    // 获取学号信息（从ChatOptions中获取）
    const studentId = options.studentId || this.getStudentIdFromStorage();

    const shouldStream = !!options.config.stream;
    const controller = new AbortController();
    options.onController?.(controller);

    try {
      // 使用新的聊天代理路由 - 支持配额管理和消息存档
      const chatPath = "/api/chat/proxy";

      // 构建请求payload - 适配新的代理路由格式
      const requestPayload = {
        student_id: studentId, // 学号放在顶层
        messages: messages,
        bot_id: this.botId,
      };

      console.log("[Coze-Chat] Request payload: ", requestPayload);

      // 前端只发送 JSON 请求体，认证信息由后端 /api/coze-chat 统一处理
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        Accept: "application/json",
      };

      const chatPayload = {
        method: "POST",
        body: JSON.stringify(requestPayload),
        signal: controller.signal,
        headers: headers,
      };

      // 设置请求超时
      const requestTimeoutId = setTimeout(
        () => controller.abort(),
        30000, // 30秒超时
      );

      if (shouldStream) {
        // 流式响应处理
        let responseText = "";
        let finished = false;

        const finish = () => {
          if (!finished) {
            options.onFinish(responseText);
            finished = true;
          }
        };

        controller.signal.onabort = finish;

        fetchEventSource(chatPath, {
          ...chatPayload,
          async onopen(res) {
            clearTimeout(requestTimeoutId);
            const contentType = res.headers.get("content-type");
            console.log("[Coze-Chat] Response content type: ", contentType);

            if (contentType?.startsWith("text/plain")) {
              responseText = await res.clone().text();
              return finish();
            }

            if (
              !res.ok ||
              !res.headers
                .get("content-type")
                ?.startsWith(EventStreamContentType) ||
              res.status !== 200
            ) {
              const responseTexts = [responseText];
              let extraInfo = await res.clone().text();
              try {
                const resJson = await res.clone().json();
                extraInfo = prettyObject(resJson);
              } catch {}

              if (res.status === 401) {
                responseTexts.push(Locale.Error.Unauthorized);
              }

              // 处理配额不足的情况
              if (res.status === 429) {
                responseTexts.push("本期额度已用完，请稍后再试");
              }

              if (extraInfo) {
                responseTexts.push(extraInfo);
              }

              responseText = responseTexts.join("\n\n");
              return finish();
            }
          },
          onmessage(msg) {
            if (msg.data === "[DONE]" || finished) {
              return finish();
            }

            const text = msg.data;
            try {
              const json = JSON.parse(text);

              // 新的API路由返回OpenAI兼容格式
              if (json.choices && json.choices[0] && json.choices[0].message) {
                const content = json.choices[0].message.content;
                if (content) {
                  const delta = content.substring(responseText.length);
                  responseText = content;
                  options.onUpdate?.(responseText, delta);
                }
              } else {
                console.error("[Coze-Chat] Unexpected response format:", json);
                responseText = `API返回格式错误`;
              }
            } catch (e) {
              console.error("[Coze-Chat] Parse error", text, msg);
              // 如果不是JSON格式，直接作为文本处理
              if (text && responseText.length === 0) {
                responseText = text;
                options.onUpdate?.(responseText, text);
              }
            }
          },
          onclose() {
            finish();
          },
          onerror(e) {
            options.onError?.(e);
            throw e;
          },
          openWhenHidden: true,
        });
      } else {
        // 非流式响应
        const res = await fetch(chatPath, chatPayload);
        clearTimeout(requestTimeoutId);

        if (!res.ok) {
          const errorText = await res.text();
          console.error(`[Coze-Chat] HTTP ${res.status} error:`, errorText);

          // 处理配额不足的情况
          if (res.status === 429) {
            throw new Error("本期额度已用完，请稍后再试");
          }

          throw new Error(`HTTP ${res.status}: ${errorText}`);
        }

        const resJson = await res.json();

        // 新的API路由返回OpenAI兼容格式
        if (
          resJson.choices &&
          resJson.choices[0] &&
          resJson.choices[0].message
        ) {
          const message = resJson.choices[0].message.content;
          console.log("[Coze-Chat] Received complete response:", message);
          options.onFinish(message);
        } else if (resJson.error) {
          const errorMsg = resJson.error.message || "Unknown error";
          console.error("[Coze-Chat] API error:", errorMsg);
          options.onError?.(new Error(`API Error: ${errorMsg}`));
        } else {
          console.error("[Coze-Chat] Unexpected response format:", resJson);
          options.onError?.(new Error("Unexpected response format from API"));
        }
      }
    } catch (e) {
      console.error("[Coze-Chat] Request failed:", e);
      options.onError?.(e as Error);
    }
  }

  // 前端不再需要直接获取 Coze API Key，统一由后端 /api/coze-chat 处理
  private getApiKey(): string {
    return "";
  }

  async usage() {
    // Coze暂不支持用量查询，返回模拟数据
    return {
      used: 0,
      total: 1000,
    };
  }

  async models() {
    // Coze返回固定模型列表
    return [
      {
        name: "coze-bot",
        available: true,
      },
    ];
  }
}
