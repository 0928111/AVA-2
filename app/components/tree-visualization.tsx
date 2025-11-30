"use client";

import React, { useState, useRef, useEffect } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import styles from "./tree-visualization.module.scss";
import {
  parseLinks,
  generateBFSOrder,
  generateDFSOrder,
} from "../utils/tree-parser";
import { api } from "../client/api";
import { hasStudentId, getStudentId } from "../utils/student-id";

// 动态导入PageRankGraph组件
const PageRankGraph = dynamic(() => import("../visual/pagerank-graph"), {
  ssr: false,
  loading: () => (
    <div className={styles.graphLoading}>Loading tree visualization...</div>
  ),
});

// 定义类型
interface TreeNode {
  id: string;
  label: string;
  href: string;
}

interface TreeLink {
  source: string;
  target: string;
  weight: number;
}

interface GraphData {
  nodes: Array<{
    id: string;
    label: string;
    rank: number;
    x?: number;
    y?: number;
  }>;
  links: Array<{
    source: string;
    target: string;
    weight: number;
    flow: number;
  }>;
  currentIteration: number;
  maxIterations: number;
  dampingFactor: number;
  threshold: number;
  algo: string;
  traversalMode?: string;
}

export default function TreeVisualization() {
  const router = useRouter();

  // 学号检查和初始化 - 路由守卫
  useEffect(() => {
    const checkStudentId = () => {
      const hasId = hasStudentId();
      const studentId = getStudentId();

      console.log("[TreeVisualization] 学号状态检查:", {
        hasStudentId: hasId,
        studentId,
      });

      // 如果没有学号，跳转到登录页
      if (!hasId) {
        console.log("[TreeVisualization] 未检测到学号，跳转到登录页");
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

  // 状态管理
  const [code, setCode] = useState<string>(`<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>中华文化传播网站 - 首页</title>
</head>
<body>
  <h1>中华文化传播网站</h1>
  <p>请选择你想了解的传统文化主题：</p>
  <a href="calligraphy.html">书法</a>
  <a href="opera.html">京剧</a>
  <a href="tea.html">茶文化</a>
  <!-- 二级页下的示例三级链接 -->
  <a href="calligraphy-intro.html">书法简介</a>
  <a href="opera-intro.html">京剧简介</a>
  <a href="tea-intro.html">茶叶故事</a>
</body>
</html>`);

  const [graphData, setGraphData] = useState<GraphData | undefined>(undefined);
  const [parsedCount, setParsedCount] = useState<number>(0);
  const [currentNode, setCurrentNode] = useState<string>("home");
  const [traversalMode, setTraversalMode] = useState<string>("bfs");
  const [stepIndex, setStepIndex] = useState<number>(0);
  const [chatMessages, setChatMessages] = useState<
    Array<{ type: string; content: string }>
  >([]);
  const [agentInput, setAgentInput] = useState<string>("");
  const [hasSyntaxError, setHasSyntaxError] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  // 引用
  const chatMessagesRef = useRef<HTMLDivElement>(null);
  const previewSectionRef = useRef<HTMLDivElement>(null);
  const visualizationSectionRef = useRef<HTMLDivElement>(null);
  const splitterRef = useRef<HTMLDivElement>(null);

  // 节点元数据
  const [nodeMeta, setNodeMeta] = useState<
    Record<string, { href: string; label: string }>
  >({
    home: { href: "index.html", label: "首页" },
    calligraphy: { href: "calligraphy.html", label: "书法" },
    opera: { href: "opera.html", label: "京剧" },
    tea: { href: "tea.html", label: "茶文化" },
    "calligraphy-intro": { href: "calligraphy-intro.html", label: "书法简介" },
    "opera-intro": { href: "opera-intro.html", label: "京剧简介" },
    "tea-intro": { href: "tea-intro.html", label: "茶叶故事" },
  });

  // 父子关系映射
  const parentMap: Record<string, string> = {
    "calligraphy-intro": "calligraphy",
    "opera-intro": "opera",
    "tea-intro": "tea",
  };

  // 构建子节点映射
  const buildChildMap = (
    meta: Record<string, { href: string; label: string }>,
  ) => {
    const childMap: Record<string, string[]> = {
      home: ["calligraphy", "opera", "tea"],
    };
    Object.keys(meta).forEach((id) => {
      if (parentMap[id]) {
        const p = parentMap[id];
        childMap[p] = childMap[p] || [];
        if (!childMap[p].includes(id)) childMap[p].push(id);
      }
    });
    return childMap;
  };

  // 自动滚动聊天消息
  useEffect(() => {
    if (chatMessagesRef.current) {
      chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight;
    }
  }, [chatMessages]);

  // 生成图数据
  const generateGraphData = (
    nodes: TreeNode[],
    links: TreeLink[],
  ): GraphData => {
    const nodeCount = nodes.length;
    const initialRank = 1 / nodeCount;

    return {
      nodes: nodes.map((node) => ({
        id: node.id,
        label: node.label,
        rank: initialRank,
      })),
      links: links.map((link) => ({
        source: link.source,
        target: link.target,
        weight: link.weight,
        flow: 0,
      })),
      currentIteration: 0,
      maxIterations: 3,
      dampingFactor: 0.85,
      threshold: 0.0001,
      algo: "pagerank",
      traversalMode: traversalMode, // 添加遍历模式
    };
  };

  // 解析链接并应用
  const parseLinksAndApply = (isSubmit: boolean) => {
    const result = parseLinks(code);
    setParsedCount(result.parsedCount);

    // 更新节点元数据
    const updatedMeta = { ...nodeMeta };
    result.nodes.forEach((node: TreeNode) => {
      updatedMeta[node.id] = { href: node.href, label: node.label };
    });
    setNodeMeta(updatedMeta);

    // 生成图数据，无论是否提交（确保树可视化实时更新）
    const graphData = generateGraphData(result.nodes, result.links);
    setGraphData(graphData);
  };

  // 初始解析 - 合并了两个重复的useEffect调用
  useEffect(() => {
    parseLinksAndApply(false);
  }, []);

  // 简单的HTML语法检查
  const checkHtmlSyntax = (html: string): boolean => {
    // 检查基本的标签配对
    const tagStack: string[] = [];
    const tagRegex = /<\/?([a-zA-Z][a-zA-Z0-9]*)[^>]*>/g;
    let match;

    while ((match = tagRegex.exec(html)) !== null) {
      const tag = match[0];
      const tagName = match[1];

      // 跳过自闭合标签
      if (tag.endsWith("/>")) {
        continue;
      }

      // 检查是否为结束标签
      if (tag.startsWith("</")) {
        // 结束标签
        const lastTag = tagStack.pop();
        if (lastTag !== tagName) {
          return false; // 标签不匹配
        }
      } else {
        // 开始标签，跳过某些不需要配对的标签
        const voidTags = [
          "br",
          "hr",
          "img",
          "input",
          "meta",
          "link",
          "area",
          "base",
          "col",
          "embed",
          "source",
          "track",
          "wbr",
        ];
        if (!voidTags.includes(tagName.toLowerCase())) {
          tagStack.push(tagName);
        }
      }
    }

    // 检查是否有未关闭的标签
    return tagStack.length === 0;
  };

  // 处理代码变化
  const handleCodeChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newCode = e.target.value;
    setCode(newCode);
    // 检查语法
    const isSyntaxValid = checkHtmlSyntax(newCode);
    setHasSyntaxError(!isSyntaxValid);
    // 实时解析链接，不生成图数据（避免性能问题）
    parseLinksAndApply(false);
  };

  // 处理提交
  const handleSubmit = () => {
    parseLinksAndApply(true);
  };

  // 处理导航点击
  const handleNavClick = (nodeId: string) => {
    setCurrentNode(nodeId);
  };

  // 处理遍历模式切换
  const handleModeChange = (mode: string) => {
    setTraversalMode(mode);
    setStepIndex(0);
    setCurrentNode("home");

    // 重新生成图数据以更新遍历模式
    const result = parseLinks(code);
    const updatedGraphData = generateGraphData(result.nodes, result.links);
    setGraphData(updatedGraphData);
  };

  // 处理遍历步进
  const handleStep = (action: string) => {
    // 动态生成遍历顺序
    const result = parseLinks(code);
    const order =
      traversalMode === "bfs"
        ? generateBFSOrder(result.nodes, result.links)
        : generateDFSOrder(result.nodes, result.links);

    if (action === "next") {
      if (stepIndex < order.length) {
        setCurrentNode(order[stepIndex]);
        setStepIndex(stepIndex + 1);
      }
    } else if (action === "prev") {
      const newStepIndex = Math.max(1, stepIndex - 1);
      setStepIndex(newStepIndex);
      setCurrentNode(order[newStepIndex - 1]);
    } else if (action === "reset") {
      setStepIndex(0);
      setCurrentNode("home");
    }
  };

  // 处理复制消息
  const handleCopyMessage = async (content: string, index: number) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch (error) {
      console.error("复制失败:", error);
    }
  };

  // 处理发送消息
  const handleSendMessage = () => {
    const trimmed = agentInput.trim();
    if (!trimmed || isLoading) return;

    // 添加用户消息
    const userMsg = { type: "user", content: trimmed };
    setChatMessages([...chatMessages, userMsg]);
    setAgentInput("");
    setIsLoading(true);

    // 获取学号
    const studentId = getStudentId() || "default";

    // 调用AI API
    api.llm.chat({
      messages: [
        {
          role: "system",
          content:
            "你是一个树算法学习助手，专注于解释树的创建与遍历算法，特别是BFS和DFS。请用简洁明了的语言回答学生的问题，不要生成任何代码或JSON格式。",
          animation: null,
        },
        { role: "user", content: trimmed, animation: null },
      ],
      config: {
        model: "coze-bot",
        stream: false,
      },
      studentId: studentId,
      onFinish: (message: string) => {
        // 添加AI回复
        const aiMsg = { type: "agent", content: message };
        setChatMessages((prev) => [...prev, aiMsg]);
        setIsLoading(false);
      },
      onError: (error: Error) => {
        console.error("AI对话失败:", error);
        // 添加错误消息
        const errorMsg = {
          type: "agent",
          content: "抱歉，AI对话服务暂时不可用，请稍后再试。",
        };
        setChatMessages((prev) => [...prev, errorMsg]);
        setIsLoading(false);
      },
    });
  };

  // 处理分隔条拖拽
  const handleSplitterMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();

    const startY = e.clientY;
    const previewRect = previewSectionRef.current?.getBoundingClientRect();
    const visualizationRect =
      visualizationSectionRef.current?.getBoundingClientRect();

    if (!previewRect || !visualizationRect) return;

    const startPreviewHeight = previewRect.height;
    const startVisualizationHeight = visualizationRect.height;
    const containerHeight = previewRect.height + visualizationRect.height;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const delta = moveEvent.clientY - startY;

      // 计算新的高度，确保最小高度
      const minHeight = 120;
      const newPreviewHeight = Math.max(minHeight, startPreviewHeight + delta);
      const newVisualizationHeight = Math.max(
        minHeight,
        containerHeight - newPreviewHeight,
      );

      // 设置新高度
      if (previewSectionRef.current) {
        previewSectionRef.current.style.flex = `0 0 ${newPreviewHeight}px`;
      }
      if (visualizationSectionRef.current) {
        visualizationSectionRef.current.style.flex = `0 0 ${newVisualizationHeight}px`;
      }
    };

    const handleMouseUp = () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.userSelect = "";
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    document.body.style.userSelect = "none";
  };

  // 获取当前节点文本
  const getTextByNode = (nodeId: string) => {
    switch (nodeId) {
      case "home":
        return {
          path: "首页",
          title: "中华文化传播网站 - 首页",
          desc: "欢迎访问中华文化传播网站首页。",
        };
      case "calligraphy":
        return {
          path: "首页 / 书法",
          title: "书法 - 栏目页",
          desc: "探索中国书法的魅力与历史。",
        };
      case "opera":
        return {
          path: "首页 / 京剧",
          title: "京剧 - 栏目页",
          desc: "了解中国传统京剧艺术。",
        };
      case "tea":
        return {
          path: "首页 / 茶文化",
          title: "茶文化 - 栏目页",
          desc: "品味中国茶文化的博大精深。",
        };
      case "calligraphy-intro":
        return {
          path: "首页 / 书法 / 书法简介",
          title: "书法简介",
          desc: "中国书法是一门古老的汉字书写艺术。",
        };
      case "opera-intro":
        return {
          path: "首页 / 京剧 / 京剧简介",
          title: "京剧简介",
          desc: "京剧是中国的国粹之一。",
        };
      case "tea-intro":
        return {
          path: "首页 / 茶文化 / 茶叶故事",
          title: "茶叶故事",
          desc: "茶叶在中国有着悠久的历史。",
        };
      default:
        return {
          path: "未知路径",
          title: "未定义页面",
          desc: "该页面尚未定义。",
        };
    }
  };

  // 渲染子链接
  const renderSubLinks = () => {
    const childMap = buildChildMap(nodeMeta);
    const children = childMap[currentNode] || [];

    if (children.length === 0) {
      const meta = nodeMeta[currentNode] || {};
      return (
        <a
          href={meta.href || "#"}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.externalLink}
        >
          {meta.label || currentNode}{" "}
          <span className={styles.linkIcon}>↗</span>
        </a>
      );
    }

    return children.map((cid) => {
      const meta = nodeMeta[cid] || {};
      // 检查是否为二级节点
      const isSecondary = Object.values(parentMap).includes(currentNode);
      return (
        <a
          key={cid}
          href={meta.href || "#"}
          target="_blank"
          rel="noopener noreferrer"
          className={isSecondary ? styles.secondaryLink : styles.primaryLink}
        >
          {meta.label || cid} <span className={styles.linkIcon}>↗</span>
        </a>
      );
    });
  };

  const currentNodeInfo = getTextByNode(currentNode);

  return (
    <div className={styles.container}>
      <header className={styles.header}>树的创建与遍历 · 可视化演示</header>

      <main className={styles.main}>
        {/* 左侧面板：代码区 */}
        <section className={styles.sidePanel}>
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <div className={styles.sectionTitle}>代码区</div>
            </div>
            <textarea
              className={styles.codeEditor}
              id="codeEditor"
              spellCheck={false}
              value={code}
              onChange={handleCodeChange}
            />
            <div className={styles.codeStatusRow}>
              <div className={styles.codeStatusText} id="codeStatus">
                {hasSyntaxError ? (
                  <span style={{ color: "red" }}>语法错误</span>
                ) : (
                  `已解析链接：${parsedCount}`
                )}
              </div>
              <button
                className={styles.btnPrimary}
                id="submitBtn"
                onClick={handleSubmit}
              >
                提交代码
              </button>
            </div>
            {/* 步骤控制 */}
            <div className={styles.controls}>
              <span className={styles.chip}>遍历模式</span>
              <button
                className={`${styles.btnSm} ${traversalMode === "bfs" ? styles.active : ""}`}
                data-mode="bfs"
                onClick={() => handleModeChange("bfs")}
              >
                BFS
              </button>
              <button
                className={`${styles.btnSm} ${traversalMode === "dfs" ? styles.active : ""}`}
                data-mode="dfs"
                onClick={() => handleModeChange("dfs")}
              >
                DFS
              </button>
              <button
                className={styles.btnSm}
                data-step="prev"
                onClick={() => handleStep("prev")}
              >
                上一步
              </button>
              <button
                className={styles.btnSm}
                data-step="next"
                onClick={() => handleStep("next")}
              >
                下一步
              </button>
              <button
                className={styles.btnSm}
                data-step="reset"
                onClick={() => handleStep("reset")}
              >
                重置
              </button>
            </div>
          </div>
        </section>

        {/* 中间面板：网站预览 + 树可视化 */}
        <section className={styles.centerPanel}>
          <div className={styles.section} ref={previewSectionRef}>
            <div className={styles.sectionHeader}>
              <div className={styles.sectionTitle}>网站预览</div>
              <div className={styles.sectionSub}>
                当前路径：{currentNodeInfo.path}
              </div>
            </div>
            <div className={styles.layoutGrid}>
              <nav className={styles.siteNav}>
                {Object.keys(nodeMeta).map((nodeId) => {
                  // 只显示一级节点
                  if (!parentMap[nodeId]) {
                    return (
                      <div
                        key={nodeId}
                        className={styles.navGroup}
                        data-node={nodeId}
                      >
                        <div
                          className={`${styles.navGroupMain} ${currentNode === nodeId ? styles.active : ""}`}
                          data-node={nodeId}
                          onClick={() => handleNavClick(nodeId)}
                        >
                          {nodeMeta[nodeId].label}
                        </div>
                      </div>
                    );
                  }
                  return null;
                })}
              </nav>
              <section className={styles.sitePage}>
                <h3 id="pageTitle">{currentNodeInfo.title}</h3>
                <p id="pageDesc">{currentNodeInfo.desc}</p>
                <div id="subLinks" className={styles.subLinks}>
                  {renderSubLinks()}
                </div>
              </section>
            </div>
          </div>

          {/* 分隔条 */}
          <div
            className={styles.splitter}
            ref={splitterRef}
            onMouseDown={handleSplitterMouseDown}
            title="拖动以调整网站预览和树可视化的高度"
          ></div>

          <div
            className={`${styles.section} ${styles.visualizationSection}`}
            ref={visualizationSectionRef}
          >
            <div className={styles.sectionHeader}>
              <div className={styles.sectionTitle}>树可视化</div>
            </div>
            <div id="graphMount" className={styles.graphContainer}>
              <PageRankGraph
                json={graphData}
                messageId="tree-visualization"
                currentStep={stepIndex}
                layout="tree"
                showFlow={false}
                showRank={false}
                fixedSpacing={{ x: 120, y: 80 }}
              />
            </div>
          </div>
        </section>

        {/* 右侧面板：学习助手 */}
        <section className={styles.sidePanel}>
          <div className={styles.agentHead}>
            <span>学习助手</span>
          </div>
          <div
            className={styles.agentMessages}
            id="agentMessages"
            ref={chatMessagesRef}
          >
            {chatMessages.map((msg, index) => (
              <div
                key={index}
                className={`${styles.chatMessage} ${msg.type === "user" ? styles.chatMessageUser : ""}`}
              >
                <div className={styles.avatar}>
                  {msg.type === "user" ? "我" : "AI"}
                </div>
                <div className={styles.msg}>
                  {msg.content}
                  <button
                    className={styles.copyBtn}
                    onClick={() => handleCopyMessage(msg.content, index)}
                    title={copiedIndex === index ? "已复制" : "复制"}
                  >
                    {copiedIndex === index ? "✓" : "📋"}
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className={styles.agentInput}>
            <textarea
              id="agentInput"
              placeholder="例如：DFS 为什么更早访问到“书法简介”？"
              value={agentInput}
              onChange={(e) => setAgentInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
            />
            <div className={styles.agentInputRow}>
              <span>回车发送（Shift+Enter 换行）</span>
              <button
                className={styles.btnSend}
                id="sendBtn"
                onClick={handleSendMessage}
                disabled={!agentInput.trim() || isLoading}
              >
                {isLoading ? "发送中..." : "发送"}
              </button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
