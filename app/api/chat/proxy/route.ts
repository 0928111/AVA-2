import { NextRequest, NextResponse } from "next/server";
import { auth } from "../../auth";
import PocketBase from "pocketbase";

// 使用 Node.js runtime 避免 Edge runtime 的网络限制
export const runtime = "nodejs";

// 验证学生ID是否有效
async function validateStudentId(student_id: string): Promise<boolean> {
  // 特殊用户：root用户始终有效
  if (student_id === "root") {
    console.log("[Chat Proxy] root用户验证通过");
    return true;
  }

  // 检查格式：8位数字
  if (!/^\d{8}$/.test(student_id)) {
    console.log("[Chat Proxy] 学生ID格式无效:", student_id);
    return false;
  }

  // 检查年份：前4位应该是合理的年份（2010-2029）
  const year = parseInt(student_id.substring(0, 4));
  const currentYear = new Date().getFullYear();
  if (year < 2010 || year > currentYear + 5) {
    console.log("[Chat Proxy] 学生ID年份无效:", year);
    return false;
  }

  return true;
}

export async function POST(req: NextRequest) {
  console.log("[Chat Proxy] 收到新的聊天请求");

  try {
    // 提前读取请求体，后续复用，避免重复读取
    let requestBody: any = null;
    try {
      requestBody = await req.json();
    } catch (error) {
      console.warn("[Chat Proxy] 解析请求体失败，可能为空:", error);
    }

    // 基础参数校验：消息列表必填
    if (
      !requestBody ||
      !requestBody.messages ||
      !Array.isArray(requestBody.messages) ||
      requestBody.messages.length === 0
    ) {
      console.error("[Chat Proxy] 请求体缺少消息列表");
      return NextResponse.json(
        { error: "Invalid request: messages required" },
        { status: 400 },
      );
    }

    // 1. 获取并验证学生ID
    const student_id =
      req.headers.get("X-Student-ID") ||
      requestBody?.student_id ||
      requestBody?.studentId;
    console.log("[Chat Proxy] 学生ID:", student_id);

    if (!student_id) {
      console.error("[Chat Proxy] 缺少学生ID");
      return NextResponse.json(
        { error: "Missing student ID" },
        { status: 401 },
      );
    }

    if (!(await validateStudentId(student_id))) {
      console.error("[Chat Proxy] 学生ID验证失败");
      return NextResponse.json(
        { error: "Invalid student ID format" },
        { status: 401 },
      );
    }

    // 2. 验证用户认证
    const authResult = await auth(req);
    console.log("[Chat Proxy] 认证结果:", authResult ? "成功" : "失败");

    if (!authResult) {
      console.error("[Chat Proxy] 用户认证失败");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // root用户特殊处理：直接转发到coze-chat，跳过所有数据库操作
    if (student_id === "root") {
      console.log(
        "[Proxy Route] Root user detected, bypassing database operations",
      );

      try {
        // 直接转发到coze-chat路由，保持原有的消息格式
        const cozeResponse = await fetch(
          `http://localhost:3000/api/coze-chat`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              messages: requestBody.messages, // 传递完整的messages数组
              bot_id: "coze-bot",
            }),
          },
        );

        if (!cozeResponse.ok) {
          const errorText = await cozeResponse.text();
          console.error("[Proxy Route] Coze chat error:", errorText);
          throw new Error(`Coze chat failed: ${cozeResponse.status}`);
        }

        const cozeData = await cozeResponse.json();

        // 直接返回coze-chat的响应数据，保持格式一致
        return NextResponse.json(cozeData);
      } catch (error) {
        console.error("[Proxy Route] Root user request failed:", error);
        return NextResponse.json(
          { error: "Root user request failed" },
          { status: 500 },
        );
      }
    }

    // 对于普通用户，进行数据库验证
    // 3. 连接PocketBase
    const pbUrl = process.env.POCKETBASE_URL || "http://127.0.0.1:8090";
    const pb = new PocketBase(pbUrl);
    console.log("[Chat Proxy] PocketBase连接成功:", pbUrl);

    // 4. 管理员认证
    try {
      await pb.admins.authWithPassword(
        process.env.POCKETBASE_ADMIN_EMAIL || "admin@example.com",
        process.env.POCKETBASE_ADMIN_PASSWORD || "admin123",
      );
      console.log("[Chat Proxy] 管理员认证成功");
    } catch (error) {
      console.error("[Chat Proxy] 管理员认证失败:", error);
      return NextResponse.json(
        { error: "Database authentication failed" },
        { status: 500 },
      );
    }

    // 5. 查找学生记录
    let student;
    try {
      const records = await pb.collection("students").getList(1, 1, {
        filter: `student_id = "${student_id}"`,
      });

      if (records.items.length === 0) {
        console.log("[Chat Proxy] 学生记录不存在，创建新记录");
        student = await pb.collection("students").create({
          student_id: student_id,
          used: 0,
          max_usage: 100,
        });
        console.log("[Chat Proxy] 学生记录创建成功");
      } else {
        student = records.items[0];
        console.log("[Chat Proxy] 找到学生记录，当前使用次数:", student.used);
      }
    } catch (error) {
      console.error("[Chat Proxy] 查找学生记录失败:", error);
      return NextResponse.json(
        { error: "Failed to find student record" },
        { status: 500 },
      );
    }

    // 6. 检查使用限制
    if (student.used >= student.max_usage) {
      console.log("[Chat Proxy] 使用次数已达上限");
      return NextResponse.json(
        { error: "Usage limit exceeded" },
        { status: 403 },
      );
    }

    // 7. 获取请求体中的消息内容
    let userMessage = "";
    try {
      if (
        requestBody.messages &&
        Array.isArray(requestBody.messages) &&
        requestBody.messages.length > 0
      ) {
        const lastMessage =
          requestBody.messages[requestBody.messages.length - 1];
        userMessage = lastMessage.content || "";
      }
      console.log(
        "[Chat Proxy] 用户消息:",
        userMessage.substring(0, 100) + (userMessage.length > 100 ? "..." : ""),
      );
    } catch (error) {
      console.error("[Chat Proxy] 解析请求体失败:", error);
      userMessage = "";
    }

    // 8. 保存用户消息到数据库（异步，不影响主流程，root用户跳过）
    let conversationId = null;
    if (userMessage) {
      try {
        // 创建对话记录
        const conversation = await pb.collection("conversations").create({
          student_id: student_id,
          title:
            userMessage.substring(0, 50) +
            (userMessage.length > 50 ? "..." : ""),
          created_at: new Date().toISOString(),
        });
        conversationId = conversation.id;
        console.log("[Chat Proxy] 对话记录创建成功:", conversationId);

        // 保存用户消息
        await pb.collection("messages").create({
          conversation_id: conversationId,
          role: "user",
          content: userMessage,
          created_at: new Date().toISOString(),
        });
        console.log("[Chat Proxy] 用户消息保存成功");
      } catch (error) {
        console.error("[Chat Proxy] 保存用户消息失败:", error);
        // 不中断主流程
      }
    }

    // 9. 转发请求到coze-chat路由
    console.log("[Chat Proxy] 转发请求到coze-chat路由");

    try {
      const { POST: cozeChatHandler } = await import("../../coze-chat/route");

      // 重新构建请求（因为我们已经读取了请求体）
      const newRequest = new NextRequest(req.url, {
        method: req.method,
        headers: req.headers,
        body: JSON.stringify(requestBody || {}),
      });

      // 调用处理器
      const response = await cozeChatHandler(newRequest);

      // 10. 如果响应成功，保存助手回复并更新使用计数（root用户跳过）
      if (response.ok) {
        try {
          // 读取响应内容
          const responseData = await response.clone().json();
          let assistantMessage = "";

          // 提取助手回复内容
          if (
            responseData.choices &&
            responseData.choices[0] &&
            responseData.choices[0].message
          ) {
            assistantMessage = responseData.choices[0].message.content || "";
          }

          // 保存助手回复
          if (assistantMessage && conversationId) {
            await pb.collection("messages").create({
              conversation_id: conversationId,
              role: "assistant",
              content: assistantMessage,
              created_at: new Date().toISOString(),
            });
            console.log("[Chat Proxy] 助手回复保存成功");
          }

          // 更新使用计数
          await pb.collection("students").update(student.id, {
            used: student.used + 1,
          });
          console.log("[Chat Proxy] 使用计数更新成功:", student.used + 1);
        } catch (error) {
          console.error("[Chat Proxy] 保存助手回复或更新计数失败:", error);
          // 不中断流程，继续返回响应
        }
      }

      // 返回coze-chat的响应
      return response;
    } catch (error) {
      console.error("[Chat Proxy] 转发到coze-chat失败:", error);
      return NextResponse.json(
        { error: "Failed to process AI request" },
        { status: 500 },
      );
    }
  } catch (error) {
    console.error("[Chat Proxy] 请求处理失败:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
