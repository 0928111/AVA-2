import { NextRequest, NextResponse } from "next/server";
import { getPb } from "@/app/server/pb";
import { auth } from "@/app/api/auth";

// 请求体结构
interface ChatProxyRequest {
  student_id: string;
  messages: Array<{
    role: string;
    content: string;
  }>;
  bot_id?: string;
}

// 处理聊天代理请求
async function handleChatProxyRequest(req: NextRequest) {
  try {
    const body: ChatProxyRequest = await req.json();
    const { student_id, messages, bot_id } = body;

    // 验证请求参数
    if (
      !student_id ||
      !messages ||
      !Array.isArray(messages) ||
      messages.length === 0
    ) {
      return NextResponse.json(
        { error: "Missing required parameters: student_id or messages" },
        { status: 400 },
      );
    }

    console.log("[Chat Proxy] 收到请求:", {
      student_id,
      messageCount: messages.length,
    });

    // 连接 PocketBase
    let pb;
    try {
      pb = await getPb();
      if (!pb) {
        console.error("[Chat Proxy] 未能获取 PocketBase 实例");
        return NextResponse.json(
          { error: "Failed to connect to database" },
          { status: 500 },
        );
      }
      if (!pb.authStore.isValid) {
        console.warn("[Chat Proxy] PocketBase 未认证，将按集合规则访问");
      }
    } catch (authError) {
      console.error("[Chat Proxy] PocketBase 连接失败:");
      console.error(
        "错误类型:",
        authError instanceof Error
          ? authError.constructor.name
          : typeof authError,
      );
      console.error(
        "错误消息:",
        authError instanceof Error ? authError.message : String(authError),
      );
      return NextResponse.json(
        {
          error:
            authError instanceof Error
              ? authError.message
              : "Database connection failed",
        },
        { status: 500 },
      );
    }

    // 1. 查找或创建学生记录
    let student;
    try {
      // 先尝试查找学生
      const records = await pb.collection("students").getList(1, 1, {
        filter: `sutdents_id = "${student_id}"`,
      });

      if (records.items.length > 0) {
        student = records.items[0];
        console.log("[Chat Proxy] 找到学生记录:", student.id);
      } else {
        // 创建新学生记录
        student = await pb.collection("students").create({
          sutdents_id: student_id,
          quota: 100, // 默认配额
          used: 0,
          // 移除 created_at，让数据库自动生成
        });
        console.log("[Chat Proxy] 创建学生记录:", student.id);
      }
    } catch (error) {
      console.error("[Chat Proxy] 学生记录操作失败:");
      console.error(
        "错误类型:",
        error instanceof Error ? error.constructor.name : typeof error,
      );
      console.error(
        "错误消息:",
        error instanceof Error ? error.message : String(error),
      );
      // 如果是PocketBase的ClientResponseError，打印更多详情
      if (error && typeof error === "object" && "response" in error) {
        console.error("响应状态:", (error as any).response?.code || "未知");
        console.error("响应消息:", (error as any).response?.message || "未知");
        console.error("响应数据:", (error as any).response?.data || "未知");
      }
      return NextResponse.json(
        {
          error:
            error instanceof Error
              ? error.message
              : "Database operation failed",
        },
        { status: 500 },
      );
    }

    // 2. 检查配额
    if (student.used >= student.quota) {
      console.log("[Chat Proxy] 配额不足:", {
        used: student.used,
        quota: student.quota,
      });
      return NextResponse.json({ error: "本期额度已用完" }, { status: 429 });
    }

    // 3. 创建对话记录
    let conversation;
    try {
      conversation = await pb.collection("conversations").create({
        student: student.id, // 使用正确的关联字段名
        coze_conversation_id: "", // 暂时留空，后续需要时填充
        title: `对话 ${new Date().toLocaleString()}`,
        // 移除 created_at，让数据库自动生成
      });
      console.log("[Chat Proxy] 创建对话记录:", conversation.id);
    } catch (error) {
      console.error("[Chat Proxy] 对话记录创建失败:");
      console.error(
        "错误类型:",
        error instanceof Error ? error.constructor.name : typeof error,
      );
      console.error(
        "错误消息:",
        error instanceof Error ? error.message : String(error),
      );
      return NextResponse.json(
        {
          error:
            error instanceof Error
              ? error.message
              : "Failed to create conversation",
        },
        { status: 500 },
      );
    }

    // 4. 保存用户消息到 messages 表
    const lastMessage = messages[messages.length - 1];
    let userMessage;
    try {
      userMessage = await pb.collection("messages").create({
        conversation: conversation.id, // 使用正确的关联字段名
        role: "user",
        content: lastMessage.content,
        // 移除 created_at，让数据库自动生成
      });
      console.log("[Chat Proxy] 保存用户消息:", userMessage.id);
    } catch (error) {
      console.error("[Chat Proxy] 用户消息保存失败:", error);
      return NextResponse.json(
        { error: "Failed to save user message" },
        { status: 500 },
      );
    }

    // 5. 转发请求到 Coze API
    let cozeResponse;
    try {
      // 构建转发请求
      const cozePayload = {
        messages: messages,
        bot_id: bot_id,
      };

      console.log("[Chat Proxy] 转发到 Coze API...");

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/api/coze-chat`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            // 传递原始请求的认证头
            Authorization: req.headers.get("Authorization") || "",
          },
          body: JSON.stringify(cozePayload),
        },
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Coze API error: ${errorText}`);
      }

      // 检查是否是流式请求
      const isStream = req.headers.get("Accept")?.includes("text/event-stream");

      // 如果是流式响应，直接转发
      if (isStream) {
        console.log("[Chat Proxy] 流式响应，直接转发");

        // 创建新的响应，复制原始响应的头和状态
        const streamResponse = new NextResponse(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers: response.headers,
        });

        return streamResponse;
      }

      cozeResponse = await response.json();
      console.log("[Chat Proxy] Coze API 响应成功");
    } catch (error) {
      console.error("[Chat Proxy] Coze API 调用失败:", error);
      return NextResponse.json(
        { error: "Failed to get AI response" },
        { status: 500 },
      );
    }

    // 6. 保存助手回复到 messages 表
    try {
      const assistantContent =
        cozeResponse.choices?.[0]?.message?.content || "No response";
      console.log("[Chat Proxy] 准备保存助手回复:");
      console.log("- conversation:", conversation.id);
      console.log("- role: assistant");
      console.log("- content长度:", assistantContent.length);

      await pb.collection("messages").create({
        conversation: conversation.id, // 使用正确的关联字段名
        role: "assistant", // 使用正确的角色名称
        content: assistantContent,
        // 移除 created_at，让数据库自动生成
      });
      console.log("[Chat Proxy] 保存助手回复成功");
    } catch (error) {
      console.error("[Chat Proxy] 助手消息保存失败:");
      console.error(
        "错误类型:",
        error instanceof Error ? error.constructor.name : typeof error,
      );
      console.error(
        "错误消息:",
        error instanceof Error ? error.message : String(error),
      );
      if (error && typeof error === "object" && "response" in error) {
        console.error("响应状态:", (error as any).response?.code || "未知");
        console.error("响应消息:", (error as any).response?.message || "未知");
        console.error("响应数据:", (error as any).response?.data || "未知");
      }
      // 不中断流程，继续返回响应
    }

    // 7. 更新学生使用计数
    try {
      await pb.collection("students").update(student.id, {
        used: student.used + 1,
      });
      console.log("[Chat Proxy] 更新使用计数:", student.used + 1);
    } catch (error) {
      console.error("[Chat Proxy] 使用计数更新失败:", error);
      // 不中断流程，继续返回响应
    }

    // 8. 返回响应给前端
    console.log("[Chat Proxy] 请求处理完成");
    return NextResponse.json(cozeResponse);
  } catch (error) {
    console.error("[Chat Proxy] 处理失败:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    );
  }
}

// POST 请求处理
export async function POST(req: NextRequest) {
  try {
    console.log("[Chat Proxy] 收到POST请求");

    // 验证权限
    const authResult = auth(req);
    if (authResult.error) {
      console.log("[Chat Proxy] 认证失败:", authResult.error);
      return NextResponse.json(authResult, { status: 401 });
    }

    console.log("[Chat Proxy] 认证成功，处理请求");
    return await handleChatProxyRequest(req);
  } catch (error) {
    console.error("[Chat Proxy] POST error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
