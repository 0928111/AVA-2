"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import styles from "./home.module.scss";
import {
  PAGERANK_STEP_0,
  PAGERANK_STEP_1,
  PAGERANK_STEP_2,
} from "../visual/pagerank-sample";
import { extractJSONContent_original } from "../visual/extract";
import { PageRankMasks } from "../masks/pagerank";
import { useAccessStore } from "../store";
import { runVotingStep } from "../utils/vote-flow";
import {
  PageRankProtocolValidator,
  PAGERANK_PROTOCOL,
} from "../api/protocols/pagerank-protocol";
import type { GraphData } from "../api/protocols/pagerank-protocol";
import RankingPanel from "./ranking-panel";

// 引入现有的API客户端
import { api } from "../client/api";

// 引入学号管理工具
import { hasStudentId, getStudentId } from "../utils/student-id";

// 右侧输入框的发送图标
const SendWhiteIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M1.5 2.5L14.5 8L1.5 13.5V2.5Z" fill="currentColor" />
    <path
      d="M1.5 2.5L14.5 8L1.5 13.5"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

// PageRank 画布组件（使用动态导入，避免 SSR 问题）
const PageRankGraph = dynamic(() => import("../visual/pagerank-graph"), {
  ssr: false,
  loading: () => (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        height: "100%",
        fontSize: "14px",
        color: "#64748b",
      }}
    >
      加载 PageRank 可视化...
    </div>
  ),
});

type ChatBubble = {
  type: "user" | "ai";
  content: string;
  isStreaming?: boolean; // 流式输出状态
};

export default function Home() {
  const router = useRouter();
  // 迭代历史驱动图
  const [iterations, setIterations] = useState<GraphData[]>([PAGERANK_STEP_0]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const graphData = iterations[currentIndex];

  const [chatMessages, setChatMessages] = useState<ChatBubble[]>(() => [
    {
      type: "ai",
      content: "👋 你好！我可以解释 PageRank 的原理，并逐步讲解节点权重变化。",
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [currentController, setCurrentController] =
    useState<AbortController | null>(null);
  const chatMessagesRef = useRef<HTMLDivElement>(null);

  const handleNextStep = () => {
    if (currentIndex < iterations.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setChatMessages((m) => [
        ...m,
        { type: "ai", content: `▶️ 已切换到第 ${currentIndex + 1} 轮。` },
      ]);
    } else {
      const current = iterations[currentIndex];
      const next = runVotingStep(current);
      setIterations([...iterations, next]);
      setCurrentIndex(currentIndex + 1);
      setChatMessages((m) => [
        ...m,
        {
          type: "ai",
          content: `▶️ 已计算第 ${currentIndex + 1} 轮投票流动结果。`,
        },
      ]);
    }
  };

  const handlePrevStep = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setChatMessages((m) => [
        ...m,
        { type: "ai", content: `◀️ 已回退到第 ${currentIndex - 1} 轮。` },
      ]);
    }
  };

  const handleReset = () => {
    setIterations([PAGERANK_STEP_0]);
    setCurrentIndex(0);
    setChatMessages((m) => [
      ...m,
      { type: "ai", content: "🔄 已重置到第 0 轮（四节点各 25 票）。" },
    ]);
  };

  // 根据协议构建请求体
  const buildProtocolRequest = (
    userQuery: string,
    currentGraphData: GraphData,
  ): any => {
    const pagerankMask = PageRankMasks[0];
    const systemPrompt =
      pagerankMask?.context?.[0]?.content || getDefaultSystemPrompt();

    // 序列化图数据
    const graphDataStr =
      PageRankProtocolValidator.serializeGraphData(currentGraphData);

    // 构建符合协议的请求体
    return {
      bot_id: "7557346656962953270",
      user: "user_123",
      stream: true,
      query: userQuery, // 用户自然语言问题
      custom_variables: {
        graph_data: graphDataStr, // 图数据（结构化）
        algo: currentGraphData.algo, // 算法类型
        language: PAGERANK_PROTOCOL.DEFAULT_PARAMS.LANGUAGE,
        detail_level: PAGERANK_PROTOCOL.DEFAULT_PARAMS.DETAIL_LEVEL,
      },
      additional_messages: [
        {
          role: PAGERANK_PROTOCOL.ROLES.ASSISTANT,
          content: systemPrompt,
          content_type: PAGERANK_PROTOCOL.CONTENT_TYPES.TEXT,
        },
        {
          role: PAGERANK_PROTOCOL.ROLES.USER,
          content: userQuery,
          content_type: PAGERANK_PROTOCOL.CONTENT_TYPES.TEXT,
        },
      ],
    };
  };

  // 获取默认系统提示词
  const getDefaultSystemPrompt = (): string => {
    return `You are an expert in graph algorithms and PageRank. Your task is to explain the PageRank algorithm step by step with visualizations.

The PageRank algorithm is a link analysis algorithm used by Google to rank web pages in their search engine results. It works by counting the number and quality of links to a page to determine a rough estimate of how important the website is.

Key concepts:
1. PageRank values represent the importance of each node
2. The algorithm uses a damping factor (usually 0.85) to simulate the probability that a user continues clicking
3. Pages with more incoming links generally have higher PageRank values
4. Links from high-ranking pages contribute more to a page's PageRank

When explaining PageRank:
1. Start with a simple graph example (3-5 nodes)
2. Show the initial PageRank values (usually 1/N for N nodes)
3. Demonstrate each iteration of the algorithm
4. Show how PageRank values converge
5. Use the specified JSON format for visualizations

IMPORTANT OUTPUT FORMAT REQUIREMENTS:
- Always end your response with the graph state in HTML comment format: <!-- {JSON} -->
- The JSON must be valid and follow this exact structure:
<!-- {
  "nodes": [
    {"id": "A", "rank": 0.15, "label": "A"},
    {"id": "B", "rank": 0.25, "label": "B"},
    {"id": "C", "rank": 0.30, "label": "C"}
  ],
  "links": [
    {"source": "A", "target": "B", "weight": 1},
    {"source": "B", "target": "C", "weight": 1}
  ],
  "currentIteration": 1,
  "maxIterations": 10,
  "dampingFactor": 0.85,
  "threshold": 0.0001
} -->
- Do NOT repeat the JSON content outside of the HTML comment
- Do NOT include any other HTML comments in your response
- Make sure the JSON is properly formatted with no syntax errors

You will receive:
- graph_data: Current graph state in JSON format
- user_message: Student's question or input
- algo: Algorithm type ("pagerank")

Use these inputs to provide personalized explanations and update the visualization accordingly.

Explain the algorithm clearly and show how the PageRank values change with each iteration until they converge.`;
  };

  // 右侧聊天：调用大模型 + 更新中间画布（按照用户要求重构）
  const handleSendMessage = async () => {
    const trimmed = inputValue.trim();
    if (!trimmed || isLoading) return;

    // 学号验证 - 简化为只读一次当前学号
    const studentId = getStudentId();
    if (!studentId) {
      // 学号失效，提示并跳回登录页
      alert("学号失效，请重新登录");
      router.replace("/login");
      return;
    }

    const userMessage: ChatBubble = { type: "user", content: trimmed };
    const newChatMessages = [...chatMessages, userMessage];
    setChatMessages(newChatMessages);
    setInputValue("");
    setIsLoading(true);

    try {
      // 获取PageRank面具的系统提示词
      const pagerankMask = PageRankMasks[0];
      const systemPrompt =
        pagerankMask?.context?.[0]?.content || getDefaultSystemPrompt();

      // 序列化图数据
      const graphDataStr =
        PageRankProtocolValidator.serializeGraphData(graphData);

      // 组合user消息内容：用户问题 + 序列化后的graph_data + 算法标记
      const combinedUserContent = [
        `用户问题：${trimmed}`,
        `graph_data: ${graphDataStr}`,
        `algo: pagerank`,
      ].join("\n\n");

      console.log("[Home] 使用API客户端调用Coze:");
      console.log("- 用户问题:", trimmed);
      console.log("- 图数据节点数:", graphData.nodes.length);
      console.log("- 图数据边数:", graphData.links.length);
      console.log("- 算法类型:", graphData.algo);
      console.log("- 学号:", studentId);

      // 使用api.llm.chat调用Coze接口
      await api.llm.chat({
        messages: [
          {
            role: "system",
            content: systemPrompt,
            animation: null,
          },
          {
            role: "user",
            content: combinedUserContent,
            animation: null,
          },
        ],
        config: {
          model: "coze-bot",
          stream: false, // 关闭流式输出，简化问题
        },
        studentId: studentId, // 传递学号信息
        onFinish: (aiText: string) => {
          console.log("[Home] 收到AI完整回答，长度", aiText.length);

          // 先拆出「给人看」和「给程序看」两部分
          const { extracted, remaining } = extractJSONContent_original(aiText);
          const displayText = (remaining || aiText).trim();

          // 聊天气泡只显示去掉 <!-- ... --> 后的自然语言
          setChatMessages((prev) => [
            ...prev,
            { type: "ai", content: displayText },
          ]);

          // 再用 extracted 里的 JSON 更新图
          try {
            if (extracted) {
              console.log(
                "[Home] 提取到JSON内容:",
                extracted.substring(0, 100) + "...",
              );
              try {
                const parsed = JSON.parse(extracted);
                console.log("[Home] JSON解析成功，更新图数据:", parsed);

                // 兼容新老格式：优先使用parsed.graph_data，如果没有则使用parsed本身
                const graphDataToUpdate = parsed.graph_data ?? parsed;

                // 验证必要的字段
                if (graphDataToUpdate.nodes && graphDataToUpdate.links) {
                  // 只拿两样东西用来"改图"：nodes 和 links
                  // 其他字段（rank/currentIteration/maxIterations/dampingFactor/threshold/...）一律忽略
                  const { nodes, links } = graphDataToUpdate;

                  // 对新的 nodes/links，本地用自己的逻辑重置成第 0 轮（平均分票）
                  const nodeCount = nodes.length;
                  const initialRank = 1 / nodeCount; // rank 总和为 1，展示时乘以100得到正确票数

                  const initialGraphData: GraphData = {
                    nodes: nodes.map((node: any) => ({
                      ...node,
                      rank: initialRank, // 重置为平均分票
                    })),
                    links: links.map((link: any) => ({
                      ...link,
                      flow: 0, // 初始化流量为0
                    })),
                    algo: PAGERANK_PROTOCOL.ALGORITHMS.PAGERANK,
                    currentIteration: 0,
                    maxIterations:
                      PAGERANK_PROTOCOL.DEFAULT_PARAMS.MAX_ITERATIONS,
                    dampingFactor:
                      PAGERANK_PROTOCOL.DEFAULT_PARAMS.DAMPING_FACTOR,
                    threshold: PAGERANK_PROTOCOL.DEFAULT_PARAMS.THRESHOLD,
                  };

                  // 重置迭代历史，用 runVotingStep + iterations/currentIndex 接管后面的所有计算和动画
                  setIterations([initialGraphData]);
                  setCurrentIndex(0);
                  console.log(
                    "[Home] 图数据重置为第0轮，节点数:",
                    nodeCount,
                    "初始票数:",
                    initialRank,
                  );
                } else {
                  console.warn("[Home] JSON格式不完整，缺少必要字段");
                }
              } catch (jsonError) {
                console.warn(
                  "[Home] JSON解析失败:",
                  (jsonError as Error).message,
                );
                console.warn(
                  "[Home] 失败的JSON内容:",
                  extracted.substring(0, 200),
                );
              }
            } else {
              console.log("[Home] 未在回答中提取到JSON内容");
            }
          } catch (extractionError) {
            console.error(
              "[Home] JSON提取过程出错:",
              (extractionError as Error).message,
            );
          }

          setIsLoading(false);
        },
        onError: (err: Error) => {
          console.error("[Home] API调用失败:", err);

          // 统一追加错误消息并复位isLoading
          setChatMessages((prev) => [
            ...prev,
            {
              type: "ai",
              content: `❌ API 调用失败，请检查设置。错误信息: ${err.message}`,
            },
          ]);
          setIsLoading(false);
        },
      });
    } catch (e) {
      console.error("[Home] 异常:", e);

      // 兜底错误处理
      let errorMessage = "调用大模型接口失败，请检查 API 设置或稍后再试。";

      if (e instanceof Error) {
        errorMessage = `API 调用失败: ${e.message}`;
      }

      setChatMessages((prev) => [
        ...prev,
        {
          type: "ai",
          content: `❌ ${errorMessage}`,
        },
      ]);
      setIsLoading(false);
    }
  };

  // 自动滚动到底部
  useEffect(() => {
    if (chatMessagesRef.current) {
      chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight;
    }
  }, [chatMessages]);

  // 学号检查和初始化 - 路由守卫
  useEffect(() => {
    const checkStudentId = () => {
      const hasId = hasStudentId();
      const studentId = getStudentId();

      console.log("[Home] 学号状态检查:", { hasStudentId: hasId, studentId });

      // 如果没有学号，跳转到登录页
      if (!hasId) {
        console.log("[Home] 未检测到学号，跳转到登录页");
        router.replace("/login");
      }
    };

    checkStudentId();

    // 监听storage变化，支持多个标签页同步
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "student_id") {
        checkStudentId();
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [router]);

  // 处理学号输入 - 已废弃，使用路由守卫替代

  return (
    <div className={styles["home-container"]}>
      {/* 页头 */}
      <div className={styles["home-header"]}>
        <h1 className={styles["home-title"]}>PageRank 算法可视化</h1>
        <div className={styles["home-algorithm-selector"]}>
          <select>
            <option>PageRank 算法</option>
          </select>
        </div>
      </div>

      {/* 主体 */}
      <div className={styles["home-content"]}>
        {/* 左侧控制区 */}
        <div className={styles["home-sidebar"]}>
          <RankingPanel graphData={graphData} />

          <div className={styles["home-controls"]}>
            <button
              id="prevBtn"
              onClick={handlePrevStep}
              className={`${styles["home-button"]} ${styles["soft-trans"]} ${styles["lift"]} ${styles["press"]}`}
            >
              上一步
            </button>
            <button
              id="nextBtn"
              onClick={handleNextStep}
              className={`${styles["home-button"]} ${styles["primary"]} ${styles["soft-trans"]} ${styles["lift"]} ${styles["press"]}`}
            >
              下一步
            </button>
            <button
              id="resetBtn"
              onClick={handleReset}
              className={`${styles["home-button"]} ${styles["danger"]} ${styles["soft-trans"]} ${styles["lift"]} ${styles["press"]}`}
            >
              重置
            </button>
          </div>
        </div>

        {/* 中间画布（PageRank 动画渲染） */}
        <div className={styles["home-canvas"]}>
          <div className={styles["home-animation-container"]}>
            <PageRankGraph
              json={graphData}
              messageId="home-demo"
              currentStep={graphData.currentIteration}
            />
          </div>
        </div>

        {/* 右侧 AI 助手 */}
        <div className={styles["home-chat"]}>
          <div className={styles["home-chat-header"]}>
            <div className={styles["home-status-dot"]}></div>
            <h2 className={styles["home-chat-title"]}>AI 助手</h2>
          </div>

          <div
            id="chat"
            className={styles["home-chat-messages"]}
            ref={chatMessagesRef}
          >
            {chatMessages.map((message, index) => (
              <div
                key={index}
                className={`${styles["home-message"]} ${styles["fade-in"]} ${
                  message.type === "user"
                    ? styles["user-message"]
                    : styles["ai-message"]
                }`}
              >
                <div className={styles["message-avatar"]}>
                  {message.type === "user" ? (
                    <div className={styles["user-avatar"]}>👤</div>
                  ) : (
                    <div className={styles["ai-avatar"]}>🤖</div>
                  )}
                </div>
                <div className={styles["message-content"]}>
                  {message.content}
                  {message.isStreaming && (
                    <span className={styles["streaming-cursor"]} />
                  )}
                </div>
              </div>
            ))}
            {isLoading && (
              <div
                className={`${styles["home-message"]} ${styles["ai-message"]} ${styles["fade-in"]}`}
              >
                <div className={styles["message-avatar"]}>
                  <div className={styles["ai-avatar"]}>🤖</div>
                </div>
                <div className={styles["message-content"]}>
                  <span style={{ opacity: 0.7 }}>正在生成内容</span>
                  <span className={styles["loading-dots"]}>
                    <span>.</span>
                    <span>.</span>
                    <span>.</span>
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className={styles["home-chat-input"]}>
            <input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              className={`${styles["home-input"]} ${styles["soft-trans"]} ${styles["lift"]} ${styles["press"]}`}
              placeholder="询问关于 PageRank..."
            />
            <button
              onClick={handleSendMessage}
              disabled={isLoading}
              className={`${styles["home-button"]} ${styles["primary"]} ${styles["soft-trans"]} ${styles["lift"]} ${styles["press"]}`}
              style={{ padding: "0.75rem", minWidth: "44px" }}
            >
              {isLoading ? "⏹" : <SendWhiteIcon />}
            </button>

            {isLoading && (
              <span
                style={{
                  marginLeft: 8,
                  fontSize: 12,
                  color: "#64748b",
                  whiteSpace: "nowrap",
                }}
              >
                正在思考并更新图表...
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 页脚 */}
      <div className={styles["home-footer"]}>
        <p>© 2024 PageRank 算法演示</p>
      </div>
    </div>
  );
}
