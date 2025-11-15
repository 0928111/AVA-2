import { NextRequest, NextResponse } from "next/server";
import { getServerSideConfig } from "@/app/config/server";
import { auth } from "../auth";

// 获取配置信息
function getConfig() {
  const config = getServerSideConfig();
  return {
    openaiApiKey: config.openaiApiKey,
    cozeApiKey: config.cozeApiKey,
    cozeBotId: config.cozeBotId,
    cozeBaseUrl: config.cozeBaseUrl || "https://api.coze.com",
  };
}

// 处理聊天请求
async function handleChatRequest(req: NextRequest) {
  try {
    const body = await req.json();
    const { messages, bot_id } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      throw new Error("Invalid messages format");
    }

    const config = getConfig();

    // 只使用Coze API，移除所有OpenAI相关内容
    if (!config.cozeApiKey) {
      throw new Error("Coze API key is not configured");
    }

    const lastMessage = messages[messages.length - 1];
    const cozePayload = {
      bot_id: bot_id || config.cozeBotId || "default_bot",
      user_id: "user",
      stream: false, // 暂时禁用流式输出，等待后续实现
      auto_save_history: true,
      additional_messages: [
        {
          role: "user",
          content_type: "text",
          content: lastMessage.content,
        },
      ],
    };

    console.log("[Chat Route] Coze request:", cozePayload);

    // 创建聊天任务
    const response = await fetch(`${config.cozeBaseUrl}/v3/chat`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.cozeApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(cozePayload),
    });

    const chatResponse = await response.json();
    console.log("[Chat Route] Chat task created:", chatResponse);

    if (chatResponse.code !== 0) {
      throw new Error(
        `Coze API error: ${chatResponse.msg || `Code ${chatResponse.code}`}`,
      );
    }

    const { conversation_id, id: chat_id } = chatResponse.data;

    // 轮询获取结果
    let retries = 0;
    const maxRetries = 30; // 最多等待30秒

    while (retries < maxRetries) {
      await new Promise((resolve) => setTimeout(resolve, 1000)); // 等待1秒

      const statusResponse = await fetch(
        `${config.cozeBaseUrl}/v3/chat/retrieve?conversation_id=${conversation_id}&chat_id=${chat_id}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${config.cozeApiKey}`,
            "Content-Type": "application/json",
          },
        },
      );

      const statusData = await statusResponse.json();
      console.log(`[Chat Route] Status check ${retries + 1}:`, statusData);

      if (statusData.code === 0) {
        const { status } = statusData.data;

        if (status === "completed") {
          // 获取消息列表
          const messagesResponse = await fetch(
            `${config.cozeBaseUrl}/v1/conversation/message/list?conversation_id=${conversation_id}`,
            {
              method: "GET",
              headers: {
                Authorization: `Bearer ${config.cozeApiKey}`,
                "Content-Type": "application/json",
              },
            },
          );

          const messagesData = await messagesResponse.json();
          console.log("[Chat Route] Messages retrieved:", messagesData);

          if (
            messagesData.code === 0 &&
            messagesData.data &&
            messagesData.data.length > 0
          ) {
            // 找到助手的回复
            const assistantMessage = messagesData.data.find(
              (msg: any) => msg.role === "assistant",
            );
            if (assistantMessage) {
              // 返回格式化的响应
              console.log(
                "[Chat Route] Final response content:",
                assistantMessage.content,
              );

              return NextResponse.json({
                id: `chatcmpl-${Date.now()}`,
                object: "chat.completion",
                created: Math.floor(Date.now() / 1000),
                model: "coze-bot",
                choices: [
                  {
                    index: 0,
                    message: {
                      role: "assistant",
                      content:
                        assistantMessage.content ||
                        assistantMessage.answer ||
                        "No content",
                    },
                    finish_reason: "stop",
                  },
                ],
                usage: {
                  prompt_tokens: 0,
                  completion_tokens: 0,
                  total_tokens: 0,
                },
              });
            }
          }
          break;
        } else if (status === "failed") {
          throw new Error("Chat task failed");
        }
      }

      retries++;
    }

    throw new Error("Chat task timeout");
  } catch (error) {
    console.error("[Chat Route] Error:", error);
    return NextResponse.json(
      {
        error: {
          message: error instanceof Error ? error.message : "Unknown error",
          type: "api_error",
        },
      },
      {
        status: 500,
      },
    );
  }
}

// 处理函数
async function handle(req: NextRequest) {
  try {
    // 验证权限
    const authResult = auth(req);
    if (authResult.error) {
      return NextResponse.json(authResult, {
        status: 401,
      });
    }

    // 处理聊天请求
    return await handleChatRequest(req);
  } catch (error) {
    console.error("[Chat Route] Handle error:", error);
    return NextResponse.json(
      {
        error: {
          message: error instanceof Error ? error.message : "Unknown error",
          type: "internal_error",
        },
      },
      {
        status: 500,
      },
    );
  }
}

export const POST = handle;
export const runtime = "edge";
