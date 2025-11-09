/**
 * 真正的PageRank算法实现
 * 基于矩阵迭代计算
 */

export interface PageRankNode {
  id: string;
  rank: number;
  outLinks: string[];
  inLinks: string[];
}

export interface PageRankLink {
  source: string;
  target: string;
  weight: number;
}

export interface PageRankResult {
  nodes: Array<{ id: string; rank: number }>;
  links: PageRankLink[];
  currentIteration: number;
  maxIterations: number;
  dampingFactor: number;
  threshold: number;
  converged: boolean;
}

export class PageRankCalculator {
  private nodes: Map<string, PageRankNode> = new Map();
  private links: PageRankLink[] = [];
  private dampingFactor: number;
  private threshold: number;
  private maxIterations: number;

  constructor(dampingFactor: number = 0.85, threshold: number = 0.0001, maxIterations: number = 100) {
    this.dampingFactor = dampingFactor;
    this.threshold = threshold;
    this.maxIterations = maxIterations;
  }

  /**
   * 初始化图结构
   */
  initializeGraph(nodes: Array<{ id: string }>, links: PageRankLink[]): void {
    this.nodes.clear();
    this.links = [...links];

    // 初始化节点
    nodes.forEach(node => {
      this.nodes.set(node.id, {
        id: node.id,
        rank: 1.0 / nodes.length, // 初始化为均匀分布
        outLinks: [],
        inLinks: []
      });
    });

    // 构建链接关系
    links.forEach(link => {
      const sourceNode = this.nodes.get(link.source);
      const targetNode = this.nodes.get(link.target);
      
      if (sourceNode && targetNode) {
        sourceNode.outLinks.push(link.target);
        targetNode.inLinks.push(link.source);
      }
    });
  }

  /**
   * 执行一次PageRank迭代
   */
  iterate(): boolean {
    const newRanks = new Map<string, number>();
    const numNodes = this.nodes.size;
    const teleportation = (1 - this.dampingFactor) / numNodes;

    // 计算每个节点的新rank值
    this.nodes.forEach(node => {
      let rankSum = 0;

      // 从入链节点获取rank贡献
      node.inLinks.forEach(sourceId => {
        const sourceNode = this.nodes.get(sourceId);
        if (sourceNode && sourceNode.outLinks.length > 0) {
          rankSum += sourceNode.rank / sourceNode.outLinks.length;
        }
      });

      // 应用阻尼系数和随机跳转
      const newRank = teleportation + this.dampingFactor * rankSum;
      newRanks.set(node.id, newRank);
    });

    // 检查收敛性
    let maxDiff = 0;
    this.nodes.forEach(node => {
      const newRank = newRanks.get(node.id)!;
      const diff = Math.abs(newRank - node.rank);
      maxDiff = Math.max(maxDiff, diff);
      node.rank = newRank;
    });

    return maxDiff < this.threshold;
  }

  /**
   * 运行完整的PageRank算法直到收敛
   */
  calculate(): PageRankResult {
    let iteration = 0;
    let converged = false;

    while (iteration < this.maxIterations && !converged) {
      converged = this.iterate();
      iteration++;
    }

    // 归一化rank值
    const totalRank = Array.from(this.nodes.values()).reduce((sum, node) => sum + node.rank, 0);
    this.nodes.forEach(node => {
      node.rank = node.rank / totalRank;
    });

    return {
      nodes: Array.from(this.nodes.values()).map(node => ({
        id: node.id,
        rank: node.rank
      })),
      links: this.links,
      currentIteration: iteration,
      maxIterations: this.maxIterations,
      dampingFactor: this.dampingFactor,
      threshold: this.threshold,
      converged
    };
  }

  /**
   * 获取当前状态（用于逐步展示）
   */
  getCurrentState(): PageRankResult {
    return {
      nodes: Array.from(this.nodes.values()).map(node => ({
        id: node.id,
        rank: node.rank
      })),
      links: this.links,
      currentIteration: 0,
      maxIterations: this.maxIterations,
      dampingFactor: this.dampingFactor,
      threshold: this.threshold,
      converged: false
    };
  }
}

/**
 * 逐步计算PageRank，返回每一步的结果
 */
export function calculatePageRankStepByStep(
  nodes: Array<{ id: string }>, 
  links: PageRankLink[],
  dampingFactor: number = 0.85,
  threshold: number = 0.0001,
  maxIterations: number = 20
): PageRankResult[] {
  const calculator = new PageRankCalculator(dampingFactor, threshold, maxIterations);
  calculator.initializeGraph(nodes, links);
  
  const results: PageRankResult[] = [];
  
  // 初始状态
  results.push(calculator.getCurrentState());
  
  // 迭代计算
  let converged = false;
  let iteration = 0;
  
  while (iteration < maxIterations && !converged) {
    converged = calculator.iterate();
    iteration++;
    
    const state = calculator.getCurrentState();
    state.currentIteration = iteration;
    state.converged = converged;
    results.push(state);
    
    if (converged) break;
  }
  
  return results;
}