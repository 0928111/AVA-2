"use client";

import { useState, useEffect } from "react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

interface Conversation {
  id: string;
  title: string;
  created_at: string;
  messages: Message[];
}

export default function TestMessagesPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadConversations();
  }, []);

  const loadConversations = async () => {
    try {
      setLoading(true);
      setError("");

      // 获取学生ID
      const studentId = localStorage.getItem("student-id");
      if (!studentId) {
        setError("请先登录");
        setLoading(false);
        return;
      }

      // 这里需要创建一个API端点来获取对话历史
      // 由于安全性考虑，我们不应该直接访问PocketBase
      // 而是需要通过后端API

      setConversations([]);
      setLoading(false);
    } catch (err) {
      console.error("加载对话失败:", err);
      setError("加载对话失败");
      setLoading(false);
    }
  };

  const sendTestMessage = async () => {
    try {
      const studentId = localStorage.getItem("student-id");
      if (!studentId) {
        alert("请先登录");
        return;
      }

      const testMessage =
        "这是一条测试消息，用于验证消息保存功能 - " +
        new Date().toLocaleTimeString();

      const response = await fetch("/api/chat/proxy", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Student-ID": studentId,
        },
        body: JSON.stringify({
          messages: [
            {
              role: "user",
              content: testMessage,
            },
          ],
          bot_id: "",
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      console.log("测试消息发送成功:", data);
      alert("测试消息发送成功！请查看控制台日志确认消息是否被保存。");

      // 重新加载对话
      loadConversations();
    } catch (err) {
      console.error("发送测试消息失败:", err);
      alert("发送测试消息失败");
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">消息保存功能测试</h1>

      <div className="mb-4">
        <button
          onClick={sendTestMessage}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 mr-2"
        >
          发送测试消息
        </button>
        <button
          onClick={loadConversations}
          className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
        >
          刷新对话
        </button>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {loading && <div className="text-gray-500">加载中...</div>}

      <div className="mt-4">
        <h2 className="text-xl font-semibold mb-2">使用说明:</h2>
        <ol className="list-decimal list-inside space-y-2 text-gray-700">
          <li>确保您已登录（学生ID已设置）</li>
          <li>点击&quot;发送测试消息&quot;按钮发送一条测试消息</li>
          <li>查看浏览器控制台和后端日志，确认消息是否被保存</li>
          <li>
            如果看到&quot;用户消息保存成功&quot;和&quot;助手回复保存成功&quot;的日志，说明功能正常
          </li>
        </ol>
      </div>

      <div className="mt-4">
        <h2 className="text-xl font-semibold mb-2">注意事项:</h2>
        <ul className="list-disc list-inside space-y-2 text-gray-700">
          <li>消息保存功能在后台异步执行，不会影响对话响应速度</li>
          <li>只有非root用户的消息才会被保存</li>
          <li>如果保存失败，系统会记录错误但不会中断对话流程</li>
          <li>每条对话的第一个用户消息会作为对话标题</li>
        </ul>
      </div>
    </div>
  );
}
