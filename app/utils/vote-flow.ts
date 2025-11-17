import type { GraphData } from "../api/protocols/pagerank-protocol";

/**
 * 执行单步投票流动算法
 * 规则：每个节点把自己的票平均分给所有出边指向的节点，无出边则保留全部票数
 *
 * @param graph - 输入的图数据
 * @returns 更新后的图数据（包含每条边的流量记录）
 */
export function runVotingStep(graph: GraphData): GraphData {
  // 深拷贝输入数据，避免修改原对象
  const result: GraphData = {
    nodes: graph.nodes.map((node) => ({
      ...node,
      rank: node.rank || 0,
    })),
    links: graph.links.map((link) => ({
      ...link,
      flow: 0, // 初始化流量为0
    })),
    currentIteration: (graph.currentIteration || 0) + 1,
    maxIterations: graph.maxIterations,
    dampingFactor: graph.dampingFactor,
    threshold: graph.threshold,
    algo: graph.algo,
  };

  // 创建节点ID到索引的映射
  const nodeIndexMap = new Map<string, number>();
  result.nodes.forEach((node, index) => {
    nodeIndexMap.set(node.id, index);
  });

  // 计算每个节点的出边数量
  const outDegreeMap = new Map<string, number>();
  result.links.forEach((link) => {
    outDegreeMap.set(link.source, (outDegreeMap.get(link.source) || 0) + 1);
  });

  // 初始化新票数数组（初始化为0）
  const newVotes = new Array(result.nodes.length).fill(0);

  // 执行投票流动算法，同时记录每条边的流量
  result.nodes.forEach((node, index) => {
    // 将rank转换为票数（乘以100）
    const currentVotes = (node.rank || 0) * 100;

    // 获取该节点的出边数量
    const outDegree = outDegreeMap.get(node.id) || 0;

    if (outDegree > 0) {
      // 有出边：票数平均分给所有出边指向的节点
      const votePerTarget = currentVotes / outDegree;

      // 找到所有出边指向的节点，并记录流量
      result.links
        .filter((link) => link.source === node.id)
        .forEach((link) => {
          const targetIndex = nodeIndexMap.get(link.target);
          if (targetIndex !== undefined) {
            newVotes[targetIndex] += votePerTarget;
            // 记录这条边的流量
            link.flow = votePerTarget;
          }
        });
    } else {
      // 无出边：票数全部保留
      newVotes[index] += currentVotes;
    }
  });

  // 计算总票数（用于归一化）
  const totalVotes = newVotes.reduce((sum, votes) => sum + votes, 0);

  // 归一化到100票左右，并转换回rank，同时缩放流量值
  result.nodes.forEach((node, index) => {
    const normalizedVotes =
      totalVotes > 0 ? (newVotes[index] / totalVotes) * 100 : 0;
    node.rank = normalizedVotes / 100; // 转换回rank格式
  });

  // 缩放流量值到归一化后的尺度（以100为总量）
  if (totalVotes > 0) {
    const scaleFactor = 100 / totalVotes;
    result.links.forEach((link) => {
      link.flow = link.flow * scaleFactor;
    });
  }

  return result;
}
