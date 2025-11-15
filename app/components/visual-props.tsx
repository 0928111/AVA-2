export type graphType = {
  nodes: Array<{
    id: string;
    rank?: number; // PageRank值
    color?: string; // 节点颜色
  }>;
  links: Array<{
    source: string;
    target: string;
    weight?: number; // 边权重
  }>;
  currentNodes?: Array<{
    source: string;
    target: string;
  }>;
  currentDFSpaths?: Array<string>;
  visitedNodes?: Array<string>;
  connectedPath?: Array<string>;
  connectedComponents?: Array<Array<number>>;
  // PageRank专用字段
  currentIteration?: number; // 当前迭代次数
  maxIterations?: number; // 最大迭代次数
  dampingFactor?: number; // 阻尼系数
  threshold?: number; // 收敛阈值
  previousRanks?: { [key: string]: number }; // 上一轮排名
};

export interface Props {
  type?: string;

  data?: number[];
  maxidx?: number;
  compareidx?: number;
  messageId: string;

  newData?: number[];
  number?: number; //searching whether a particular number appear in the list

  json?: graphType;
  currentStep?: number;
}
