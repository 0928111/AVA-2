import { NextRequest, NextResponse } from "next/server";
import { getServerSideConfig } from "@/app/config/server";
import { auth } from "../auth";

// 获取配置信息
function getCozeConfig() {
  const config = getServerSideConfig();
  const apiKey = config.cozeApiKey;
  const botId = config.cozeBotId;
  const baseUrl = config.cozeBaseUrl || "https://api.coze.com";

  if (!apiKey || !botId) {
    throw new Error("Missing Coze API configuration in environment variables");
  }

  return {
    apiKey,
    botId,
    baseUrl,
  };
}

// 使用原生fetch API实现createAndPoll功能
async function createAndPoll(cozeConfig: any, payload: any) {
  const { apiKey, baseUrl } = cozeConfig;

  // 1. 创建聊天任务
  const createResponse = await fetch(`${baseUrl}/v3/chat`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const createData = await createResponse.json();
  console.log("[Coze Chat Route] Chat task created:", createData);

  if (createData.code !== 0) {
    throw new Error(
      `Coze API error: ${createData.msg || `Code ${createData.code}`}`,
    );
  }

  const { conversation_id, id: chat_id } = createData.data;

  // 2. 轮询获取结果 - 增加超时时间和优化重试逻辑
  let retries = 0;
  const maxRetries = 60; // 最多等待60秒
  const pollInterval = 1000; // 每秒检查一次

  while (retries < maxRetries) {
    await new Promise((resolve) => setTimeout(resolve, pollInterval));

    try {
      const statusResponse = await fetch(
        `${baseUrl}/v3/chat/retrieve?conversation_id=${conversation_id}&chat_id=${chat_id}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
        },
      );

      const statusData = await statusResponse.json();

      if (retries % 10 === 0) {
        // 每10次记录一次状态
        console.log(
          `[Coze Chat Route] Status check ${retries + 1}/${maxRetries}:`,
          statusData,
        );
      }

      if (statusData.code === 0) {
        const { status } = statusData.data;

        if (status === "completed") {
          console.log(
            `[Coze Chat Route] Chat completed after ${retries + 1} checks`,
          );
          return {
            conversationId: conversation_id,
            chatId: chat_id,
            status: "completed",
          };
        } else if (status === "failed") {
          throw new Error("Chat task failed");
        }
      }
    } catch (error) {
      console.error(
        `[Coze Chat Route] Status check error on retry ${retries + 1}:`,
        error,
      );
      // 继续重试，除非达到最大重试次数
    }

    retries++;
  }

  throw new Error(`Chat task timeout after ${maxRetries} seconds`);
}

// 处理聊天请求 - 使用轮询确保获取完整回复
async function handleCozeChatRequest(req: NextRequest) {
  try {
    const body = await req.json();
    const { messages, bot_id } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      throw new Error("Invalid messages format");
    }

    const config = getCozeConfig();

    // 获取最后一条用户消息
    const lastMessage = messages[messages.length - 1];

    console.log("[Coze Chat Route] Starting chat with polling:");
    console.log("- Bot ID:", bot_id || config.botId);
    console.log("- User message:", lastMessage.content);

    // 构建请求payload
    const cozePayload = {
      bot_id: bot_id || config.botId,
      user_id: "user",
      stream: false,
      auto_save_history: true,
      additional_messages: [
        {
          role: "user",
          content_type: "text",
          content: lastMessage.content,
        },
      ],
    };

    // 使用createAndPoll功能 - 等待对话完成
    const result = await createAndPoll(config, cozePayload);

    console.log("[Coze Chat Route] Chat completed:", {
      conversationId: result.conversationId,
      chatId: result.chatId,
      status: result.status,
    });

    // 获取完整的对话消息
    const messagesResponse = await fetch(
      `${config.baseUrl}/v1/conversation/message/list?conversation_id=${result.conversationId}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          "Content-Type": "application/json",
        },
      },
    );

    const messagesData = await messagesResponse.json();
    console.log("[Coze Chat Route] Messages retrieved:", messagesData);

    if (
      messagesData.code !== 0 ||
      !messagesData.data ||
      messagesData.data.length === 0
    ) {
      throw new Error("Failed to retrieve messages");
    }

    // 提取助手的回复
    const assistantMessage = messagesData.data.find(
      (msg: any) => msg.role === "assistant",
    );

    if (!assistantMessage) {
      throw new Error("No assistant message found in the conversation");
    }

    const responseContent =
      assistantMessage.content || assistantMessage.answer || "No content";

    console.log("[Coze Chat Route] Final assistant message:", responseContent);

    // 返回OpenAI兼容格式的响应
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
            content: responseContent,
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
  } catch (error) {
    console.error("[Coze Chat Route] Error:", error);
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

// 主处理函数
async function handle(req: NextRequest) {
  try {
    // 验证权限
    const authResult = auth(req);
    if (authResult.error) {
      return NextResponse.json(authResult, {
        status: 401,
      });
    }

    // 处理Coze聊天请求
    return await handleCozeChatRequest(req);
  } catch (error) {
    console.error("[Coze Chat Route] Handle error:", error);
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
