"use client";

import { useState, useMemo } from "react";
import dynamic from "next/dynamic";
import styles from "./home.module.scss";
import { PAGERANK_SAMPLE_DATA, PAGERANK_ITERATION_1, PAGERANK_CONVERGED } from "../visual/pagerank-sample";
// 使用内联SVG替代文件导入
const SendWhiteIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M1.5 2.5L14.5 8L1.5 13.5V2.5Z" fill="currentColor"/>
    <path d="M1.5 2.5L14.5 8L1.5 13.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const PageRankGraph = dynamic(
  () => import("../visual/pagerank-graph"),
  { 
    ssr: false,
    loading: () => (
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        height: '100%',
        fontSize: '14px',
        color: '#64748b'
      }}>
        加载PageRank可视化...
      </div>
    )
  }
);

export default function Home() {
  const [currentStep, setCurrentStep] = useState(0);
  const [statusText, setStatusText] = useState("初始化阶段：节点权重分配中...");
  const [chatMessages, setChatMessages] = useState(() => [
    { type: 'ai', content: "👋 你好！我可以解释 PageRank 的原理，并逐步讲解节点权重变化。" }
  ]);
  const [inputValue, setInputValue] = useState("");

  // 使用useMemo缓存步骤数据，避免重复创建
  const steps = useMemo(() => [
    { msg: "初始化阶段：所有节点权重相等", data: PAGERANK_SAMPLE_DATA },
    { msg: "第1次迭代：权重开始传播", data: PAGERANK_ITERATION_1 },
    { msg: "收敛阶段：权重分布稳定", data: PAGERANK_CONVERGED }
  ], []);

  // 缓存当前步骤数据，避免重复渲染
  const currentStepData = useMemo(() => {
    return steps[currentStep]?.data || PAGERANK_SAMPLE_DATA;
  }, [currentStep, steps]);

  // 预加载下一步数据，提高切换流畅度
  const nextStepData = useMemo(() => {
    const nextStep = (currentStep + 1) % steps.length;
    return steps[nextStep]?.data || PAGERANK_SAMPLE_DATA;
  }, [currentStep, steps]);

  const handleNextStep = () => {
    setCurrentStep(prevStep => {
      const nextStep = (prevStep + 1) % steps.length;
      setStatusText(steps[nextStep].msg);
      return nextStep;
    });
  };

  const handleReset = () => {
    setCurrentStep(0);
    setStatusText(steps[0].msg);
    setChatMessages(prev => [...prev, { type: 'ai', content: "🔄 已重置到初始状态" }]);
  };

  const handleSendMessage = () => {
    if (inputValue.trim()) {
      // 添加用户消息
      const userMessage = { type: 'user', content: inputValue };
      setChatMessages(prev => [...prev, userMessage]);
      
      // 模拟AI回复
      setTimeout(() => {
        const aiResponses = [
          "这是一个很好的问题！PageRank算法通过链接关系来计算节点的重要性。",
          "让我来解释一下：每个节点的PR值会根据其入链节点的PR值和出链数量来计算。",
          "你可以看到，节点A因为有来自多个节点的链接，所以它的PR值相对较高。",
          "是的，这正是PageRank的核心思想：重要的页面会被其他重要页面链接。",
          "观察这个迭代过程，你会发现权重是如何在节点间传播的。"
        ];
        const randomResponse = aiResponses[Math.floor(Math.random() * aiResponses.length)];
        setChatMessages(prev => [...prev, { type: 'ai', content: randomResponse }]);
      }, 1000);
      
      setInputValue("");
    }
  };

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
          <div id="statusText" className={`${styles["home-status"]} ${styles["fade-in"]}`}>
            {statusText}
          </div>

          <div className={styles["home-controls"]}>
            <button 
              id="prevBtn"
              onClick={() => {
                setCurrentStep(prevStep => {
                  const prevStepIndex = prevStep === 0 ? steps.length - 1 : prevStep - 1;
                  setStatusText(steps[prevStepIndex].msg);
                  return prevStepIndex;
                });
              }}
              className={`${styles["home-button"]} ${styles["soft-trans"]} ${styles["lift"]} ${styles["press"]}`}
            >
              ← 上一步
            </button>
            <button 
              id="nextBtn"
              onClick={handleNextStep}
              className={`${styles["home-button"]} ${styles["primary"]} ${styles["soft-trans"]} ${styles["lift"]} ${styles["press"]}`}
            >
              下一步 →
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

        {/* 中间画布（PageRank动画渲染） */}
        <div className={styles["home-canvas"]}>
          <div className={styles["home-animation-container"]}>
            <PageRankGraph json={currentStepData} messageId="demo" currentStep={currentStep} />
          </div>
        </div>

        {/* 右侧AI助手 */}
        <div className={styles["home-chat"]}>
          <div className={styles["home-chat-header"]}>
            <div className={styles["home-status-dot"]}></div>
            <h2 className={styles["home-chat-title"]}>AI 助手</h2>
          </div>

          <div id="chat" className={styles["home-chat-messages"]}>
            {chatMessages.map((message, index) => (
              <div key={index} className={`${styles["home-message"]} ${styles["fade-in"]} ${message.type === 'user' ? styles["user-message"] : styles["ai-message"]}`}>
                <div className={styles["message-avatar"]}>
                  {message.type === 'user' ? (
                    <div className={styles["user-avatar"]}>👤</div>
                  ) : (
                    <div className={styles["ai-avatar"]}>🤖</div>
                  )}
                </div>
                <div className={styles["message-content"]}>
                  {message.content}
                </div>
              </div>
            ))}
          </div>

          <div className={styles["home-chat-input"]}>
            <input 
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              className={`${styles["home-input"]} ${styles["soft-trans"]} ${styles["lift"]} ${styles["press"]}`}
              placeholder="询问关于 PageRank..." 
            />
            <button 
              onClick={handleSendMessage}
              className={`${styles["home-button"]} ${styles["primary"]} ${styles["soft-trans"]} ${styles["lift"]} ${styles["press"]}`}
              style={{ padding: '0.75rem', minWidth: '44px' }}
            >
              <SendWhiteIcon />
            </button>
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