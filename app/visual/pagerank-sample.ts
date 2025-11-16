import type { GraphData } from "../api/protocols/pagerank-protocol";

// 第 0 步：100 人平均分配
export const PAGERANK_STEP_0: GraphData = {
  nodes: [
    { id: "A", label: "A", rank: 0.25, x: 100, y: 100 },
    { id: "B", label: "B", rank: 0.25, x: 250, y: 100 },
    { id: "C", label: "C", rank: 0.25, x: 175, y: 200 },
    { id: "D", label: "D", rank: 0.25, x: 50, y: 200 },
  ],
  links: [
    { source: "A", target: "B", weight: 1 },
    { source: "A", target: "C", weight: 1 },
    { source: "B", target: "C", weight: 1 },
    { source: "C", target: "A", weight: 1 },
    { source: "D", target: "C", weight: 1 },
  ],
  currentIteration: 0,
  maxIterations: 3,
  dampingFactor: 0.85,
  threshold: 0.0001,
  algo: "pagerank",
};

// 第 1 步：教材给出的 23,17,50,10
export const PAGERANK_STEP_1: GraphData = {
  nodes: [
    { id: "A", label: "A", rank: 0.23, x: 100, y: 100 },
    { id: "B", label: "B", rank: 0.17, x: 250, y: 100 },
    { id: "C", label: "C", rank: 0.5, x: 175, y: 200 },
    { id: "D", label: "D", rank: 0.1, x: 50, y: 200 },
  ],
  links: [
    { source: "A", target: "B", weight: 1 },
    { source: "A", target: "C", weight: 1 },
    { source: "B", target: "C", weight: 1 },
    { source: "C", target: "A", weight: 1 },
    { source: "D", target: "C", weight: 1 },
  ],
  currentIteration: 1,
  maxIterations: 3,
  dampingFactor: 0.85,
  threshold: 0.0001,
  algo: "pagerank",
};

// 第 2 步：视为已经稳定（数值不再变化）
export const PAGERANK_STEP_2: GraphData = {
  ...PAGERANK_STEP_1,
  currentIteration: 2,
};
