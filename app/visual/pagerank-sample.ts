import { graphType } from "../components/visual-props";

// PageRank算法示例数据
export const PAGERANK_SAMPLE_DATA: graphType = {
  nodes: [
    { id: "A", rank: 0.15 },
    { id: "B", rank: 0.15 },
    { id: "C", rank: 0.15 },
    { id: "D", rank: 0.15 },
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
};

// 第1次迭代后的数据
export const PAGERANK_ITERATION_1: graphType = {
  nodes: [
    { id: "A", rank: 0.2775 },
    { id: "B", rank: 0.15 },
    { id: "C", rank: 0.15 },
    { id: "D", rank: 0.15 },
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
};

// 收敛后的数据
export const PAGERANK_CONVERGED: graphType = {
  nodes: [
    { id: "A", rank: 0.4329 },
    { id: "B", rank: 0.2341 },
    { id: "C", rank: 0.2684 },
    { id: "D", rank: 0.0646 },
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
};