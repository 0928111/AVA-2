/**
 * PageRank 会话协议 v1.0
 *
 * 设计原则：
 * 1. 人话和图数据完全分离
 * 2. 所有图相关数据只能通过 graph_data 参数传递
 * 3. Coze Bot 只解析 graph_data，不解析 user_message
 * 4. 协议清晰、职责边界明确，便于扩展其他图算法
 */

/**
 * 图数据结构
 * 所有图算法统一使用此格式
 */
export interface GraphData {
  nodes: Array<{
    id: string; // 节点唯一标识
    label?: string; // 节点显示标签
    rank?: number; // PageRank值（算法计算结果）
    x?: number; // 可视化坐标（可选）
    y?: number; // 可视化坐标（可选）
    [key: string]: any; // 扩展字段
  }>;
  links: Array<{
    source: string; // 源节点ID
    target: string; // 目标节点ID
    weight?: number; // 边权重（可选）
    [key: string]: any; // 扩展字段
  }>;
  currentIteration?: number; // 当前迭代次数
  maxIterations?: number; // 最大迭代次数
  dampingFactor?: number; // 阻尼系数（PageRank专用）
  threshold?: number; // 收敛阈值（PageRank专用）
  algo: string; // 算法标识："pagerank" | "connectivity" | "cycle" | "scc"
  traversalMode?: string; // 遍历模式："bfs" | "dfs"
}

/**
 * 控制参数和元信息
 * 用于算法配置和系统行为控制
 */
export interface ControlParams {
  algo: string; // 算法类型
  system_prompt?: string; // 系统提示词（可选）
  max_iterations?: number; // 最大迭代次数
  damping_factor?: number; // 阻尼系数（PageRank）
  threshold?: number; // 收敛阈值
  language?: string; // 回答语言
  detail_level?: "basic" | "detailed" | "expert"; // 详细程度
}

/**
 * 用户输入（自然语言）
 * 纯文本，不包含任何结构化数据
 */
export interface UserInput {
  query: string; // 用户自然语言问题
  context?: string; // 对话上下文（可选）
}

/**
 * PageRank协议请求体
 * 严格按照三类输入分离的原则设计
 */
export interface PageRankProtocolRequest {
  // === 基础字段 ===
  bot_id: string; // Bot ID
  user: string; // 用户ID
  stream: boolean; // 是否流式响应
  conversation_id?: string; // 对话ID（可选）

  // === 用户输入（自然语言）===
  query: string; // 用户问题（纯自然语言）

  // === 图数据（结构化）===
  custom_variables: {
    graph_data: string; // JSON序列化的GraphData
    [key: string]: any; // 其他自定义变量
  };

  // === 对话历史（additional_messages）===
  additional_messages?: Array<{
    role: "user" | "assistant";
    content: string;
    content_type: "text";
  }>;
}

/**
 * Coze Bot响应格式
 * 包含文本解释和可视化数据
 */
export interface PageRankProtocolResponse {
  // === 基础响应 ===
  text_content: string; // 主要文本解释
  follow_up_questions?: string[]; // 建议的后续问题

  // === 可视化数据 ===
  visual_data?: {
    graph_data: GraphData; // 更新后的图数据
    html_comment?: string; // HTML注释格式的JSON
  };

  // === 元信息 ===
  metadata: {
    algorithm: string; // 使用的算法
    iterations: number; // 实际迭代次数
    convergence: boolean; // 是否收敛
    execution_time?: number; // 执行时间（毫秒）
  };
}

/**
 * 协议验证工具
 */
export class PageRankProtocolValidator {
  /**
   * 验证请求是否符合协议
   */
  static validateRequest(request: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // 基础字段验证
    if (!request.bot_id) errors.push("Missing bot_id");
    if (!request.user) errors.push("Missing user");
    if (request.stream === undefined) errors.push("Missing stream");
    if (!request.query) errors.push("Missing query");

    // 自定义变量验证
    if (!request.custom_variables) {
      errors.push("Missing custom_variables");
    } else {
      if (!request.custom_variables.graph_data) {
        errors.push("Missing custom_variables.graph_data");
      } else {
        // 验证graph_data格式
        try {
          const graphData = JSON.parse(request.custom_variables.graph_data);
          if (!graphData.nodes || !Array.isArray(graphData.nodes)) {
            errors.push("Invalid graph_data.nodes");
          }
          if (!graphData.links || !Array.isArray(graphData.links)) {
            errors.push("Invalid graph_data.links");
          }
          if (!graphData.algo) {
            errors.push("Missing graph_data.algo");
          }
        } catch (e) {
          errors.push("Invalid graph_data JSON format");
        }
      }
    }

    // additional_messages验证（如果存在）
    if (request.additional_messages) {
      if (!Array.isArray(request.additional_messages)) {
        errors.push("Invalid additional_messages format");
      } else {
        request.additional_messages.forEach((msg: any, index: number) => {
          if (!["user", "assistant"].includes(msg.role)) {
            errors.push(`Invalid role in additional_messages[${index}]`);
          }
          if (!msg.content) {
            errors.push(`Missing content in additional_messages[${index}]`);
          }
          if (msg.content_type !== "text") {
            errors.push(
              `Invalid content_type in additional_messages[${index}]`,
            );
          }
        });
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * 序列化图数据
   */
  static serializeGraphData(graphData: GraphData): string {
    return JSON.stringify(graphData);
  }

  /**
   * 反序列化图数据
   */
  static deserializeGraphData(graphDataStr: string): GraphData {
    return JSON.parse(graphDataStr);
  }
}

/**
 * 协议常量
 */
export const PAGERANK_PROTOCOL = {
  VERSION: "1.0",
  ALGORITHMS: {
    PAGERANK: "pagerank",
    CONNECTIVITY: "connectivity",
    CYCLE: "cycle",
    SCC: "scc",
  },
  CONTENT_TYPES: {
    TEXT: "text",
  },
  ROLES: {
    USER: "user",
    ASSISTANT: "assistant",
  },
  DEFAULT_PARAMS: {
    MAX_ITERATIONS: 50,
    DAMPING_FACTOR: 0.85,
    THRESHOLD: 0.0001,
    LANGUAGE: "zh",
    DETAIL_LEVEL: "detailed" as const,
  },
};
