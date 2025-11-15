import type { GraphData } from "../api/protocols/pagerank-protocol";

// PageRank算法示例数据
export const PAGERANK_SAMPLE_DATA: GraphData = {
  nodes: [
    { id: "A", rank: 0.15, label: "A", x: 100, y: 100 },
    { id: "B", rank: 0.15, label: "B", x: 250, y: 100 },
    { id: "C", rank: 0.15, label: "C", x: 175, y: 200 },
    { id: "D", rank: 0.15, label: "D", x: 50, y: 200 },
  ],
  links: [
    { source: "A", target: "B", weight: 1 },
    { source: "A", target: "C", weight: 1 },
    { source: "B", target: "C", weight: 1 },
    { source: "C", target: "A", weight: 1 },
    { source: "D", target: "C", weight: 1 },
  ],
  currentIteration: 0,
  maxIterations: 10,
  dampingFactor: 0.85,
  threshold: 0.0001,
  algo: "pagerank",
};

// 第1次迭代后的数据
export const PAGERANK_ITERATION_1: GraphData = {
  nodes: [
    { id: "A", rank: 0.2775, label: "A", x: 100, y: 100 },
    { id: "B", rank: 0.15, label: "B", x: 250, y: 100 },
    { id: "C", rank: 0.15, label: "C", x: 175, y: 200 },
    { id: "D", rank: 0.15, label: "D", x: 50, y: 200 },
  ],
  links: [
    { source: "A", target: "B", weight: 1 },
    { source: "A", target: "C", weight: 1 },
    { source: "B", target: "C", weight: 1 },
    { source: "C", target: "A", weight: 1 },
    { source: "D", target: "C", weight: 1 },
  ],
  currentIteration: 1,
  maxIterations: 10,
  dampingFactor: 0.85,
  threshold: 0.0001,
  algo: "pagerank",
};

// 收敛后的数据
export const PAGERANK_CONVERGED: GraphData = {
  nodes: [
    { id: "A", rank: 0.4329, label: "A", x: 100, y: 100 },
    { id: "B", rank: 0.2341, label: "B", x: 250, y: 100 },
    { id: "C", rank: 0.2684, label: "C", x: 175, y: 200 },
    { id: "D", rank: 0.0646, label: "D", x: 50, y: 200 },
  ],
  links: [
    { source: "A", target: "B", weight: 1 },
    { source: "A", target: "C", weight: 1 },
    { source: "B", target: "C", weight: 1 },
    { source: "C", target: "A", weight: 1 },
    { source: "D", target: "C", weight: 1 },
  ],
  currentIteration: 8,
  maxIterations: 10,
  dampingFactor: 0.85,
  threshold: 0.0001,
  algo: "pagerank",
};
