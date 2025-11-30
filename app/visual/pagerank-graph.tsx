import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import type { GraphData } from "../api/protocols/pagerank-protocol";
import { runVotingStep } from "../utils/vote-flow";

interface Props {
  json?: GraphData;
  messageId: string;
  currentStep?: number;
  layout?: "force" | "tree";
  showFlow?: boolean;
  showRank?: boolean;
  fixedSpacing?: { x: number; y: number };
}

const NODE_BASE_RADIUS = 18;
const NODE_EXTRA_RADIUS = 6;
const EDGE_WIDTH = 2;
const ARROW_LENGTH = 10;
const ARROW_WIDTH = 6;
const EDGE_PARALLEL_OFFSET = 14;

// 计算树布局（紧凑分层，居中显示）
function calculateTreeLayout(
  nodes: any[],
  links: any[],
  containerWidth: number,
  containerHeight: number,
  spacing: { x: number; y: number },
) {
  // 构建邻接表
  const adjacency: Record<string, string[]> = {};
  nodes.forEach((n) => (adjacency[n.id] = []));
  links.forEach((l) => {
    // 确保source和target是字符串
    const sourceId =
      typeof l.source === "object" ? l.source.id : String(l.source);
    const targetId =
      typeof l.target === "object" ? l.target.id : String(l.target);
    if (adjacency[sourceId]) adjacency[sourceId].push(targetId);
  });

  // 计算入度
  const inDegree: Record<string, number> = {};
  nodes.forEach((n) => (inDegree[n.id] = 0));
  links.forEach((l) => {
    const targetId =
      typeof l.target === "object" ? l.target.id : String(l.target);
    inDegree[targetId] = (inDegree[targetId] || 0) + 1;
  });

  // 找到根节点（入度为0的节点）
  const rootId =
    Object.keys(inDegree).find((id) => inDegree[id] === 0) || nodes[0]?.id;

  // BFS计算节点层级
  const levels: Record<string, number> = {};
  const queue: Array<{ id: string; level: number }> = [];
  if (rootId) {
    levels[rootId] = 0;
    queue.push({ id: rootId, level: 0 });
  }

  while (queue.length > 0) {
    const { id, level } = queue.shift()!;
    (adjacency[id] || []).forEach((childId) => {
      if (typeof levels[childId] === "undefined") {
        levels[childId] = level + 1;
        queue.push({ id: childId, level: level + 1 });
      }
    });
  }

  // 按层级分组
  const levelGroups: Record<number, string[]> = {};
  nodes.forEach((n) => {
    const lv = levels[n.id] ?? 0;
    if (!levelGroups[lv]) levelGroups[lv] = [];
    levelGroups[lv].push(n.id);
  });

  const positions: Record<string, { x: number; y: number }> = {};
  const levelsArr = Object.keys(levelGroups)
    .map(Number)
    .sort((a, b) => a - b);
  const maxLevel = Math.max(...levelsArr, 0);

  // 垂直间距计算 - 使用fixedSpacing或自适应
  const levelCount = Math.max(1, maxLevel);
  const yGap = Math.min(
    spacing.y || 80, // 使用传入的垂直间距或默认值
    (containerHeight - 80) / Math.max(1, levelCount + 1), // 确保在容器内
  );

  // 水平间距计算 - 使用fixedSpacing或自适应
  const maxNodesPerLevel = Math.max(
    ...levelsArr.map((lv) => levelGroups[lv].length),
    1,
  );
  const gapX = Math.min(
    spacing.x || 120, // 使用传入的水平间距或默认值
    (containerWidth - 80) / Math.max(1, maxNodesPerLevel - 1 || 1), // 确保在容器内
  );

  // 计算每个节点的位置
  levelsArr.forEach((lv) => {
    const ids = levelGroups[lv];
    const levelWidth = (ids.length - 1) * gapX;
    const startX = (containerWidth - levelWidth) / 2;
    const y = lv * yGap + 60; // 顶部留出60px边距

    ids.forEach((id, idx) => {
      positions[id] = {
        x: startX + idx * gapX,
        y: y,
      };
    });
  });

  // 确保所有节点都有位置
  nodes.forEach((n) => {
    if (!positions[n.id]) {
      positions[n.id] = {
        x: containerWidth / 2,
        y: containerHeight / 2,
      };
    }
  });

  return positions;
}

const PageRankGraph: React.FC<Props> = ({
  json,
  messageId,
  currentStep = 0,
  layout = "force",
  showFlow = true,
  showRank = true,
  fixedSpacing = { x: 160, y: 120 },
}: Props) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const renderTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const simulationRef = useRef<d3.Simulation<
    d3.SimulationNodeDatum,
    undefined
  > | null>(null);

  const getNodeRadius = (rank?: number) => {
    if (layout === "tree") return 18; // 缩小节点半径
    const r = rank ?? 0.15;
    return NODE_BASE_RADIUS + NODE_EXTRA_RADIUS * r;
  };

  useEffect(() => {
    if (renderTimeoutRef.current) {
      clearTimeout(renderTimeoutRef.current);
    }
    if (!json || !svgRef.current) {
      setIsLoading(true);
      return;
    }

    renderTimeoutRef.current = setTimeout(() => {
      try {
        setIsLoading(true);
        setError(null);

        // 获取容器实际宽度和高度
        const containerWidth = svgRef.current?.clientWidth || 800;
        const containerHeight = svgRef.current?.clientHeight || 800;
        // 使用完整容器空间，不限制最大尺寸
        const width = containerWidth;
        const height = containerHeight;

        const svg = d3.select(svgRef.current);
        svg.selectAll("*").remove();
        // 使用完整高度
        const svgHeight = height;
        svg
          .attr("id", "PR" + messageId)
          .attr("width", width)
          .attr("height", svgHeight)
          .attr("viewBox", [0, 0, width, svgHeight].join(" "))
          .attr(
            "style",
            "max-width: 100%; height: auto; border: 1px solid #d4e3ff; border-radius: 16px; background: linear-gradient(180deg,#f9fbff,#eef3ff); box-shadow: 0 10px 28px rgba(59,130,246,0.12);",
          );

        const nodes = (json.nodes || []).map((d) => ({ ...d }));

        // 流量只在 force 布局时计算
        let linksSource: any[] = json.links || [];
        const hasAnyFlow = linksSource.some(
          (link: any) => typeof link.flow === "number",
        );
        const shouldComputeFlow =
          layout !== "tree" && currentStep > 0 && !hasAnyFlow;
        if (shouldComputeFlow && linksSource.length > 0) {
          try {
            const computed = runVotingStep(json as GraphData);
            linksSource = computed.links as any[];
          } catch {
            /* ignore */
          }
        }
        const links = linksSource.map((d: any) => ({ ...d }));

        // 树布局：直接给出坐标
        if (layout === "tree") {
          console.log("Before tree layout - nodes:", nodes);
          console.log("Before tree layout - links:", links);
          const pos = calculateTreeLayout(
            nodes,
            links,
            width,
            height,
            fixedSpacing,
          );
          console.log("Tree layout positions:", pos);
          nodes.forEach((n) => {
            n.x = pos[n.id]?.x ?? width / 2;
            n.y = pos[n.id]?.y ?? height / 2;
            console.log(`Node ${n.id} position: x=${n.x}, y=${n.y}`);
          });
        } else {
          // 力导向：标记对向边，启动模拟
          const pairCount = new Map<string, number>();
          links.forEach((link: any) => {
            const s = String(link.source);
            const t = String(link.target);
            const key = s < t ? `${s}__${t}` : `${t}__${s}`;
            pairCount.set(key, (pairCount.get(key) || 0) + 1);
          });
          links.forEach((link: any) => {
            const s = String(link.source);
            const t = String(link.target);
            const key = s < t ? `${s}__${t}` : `${t}__${s}`;
            const hasReverse = (pairCount.get(key) || 0) > 1;
            (link as any).__hasReverse = hasReverse;
            (link as any).__offsetSign = hasReverse ? (s < t ? 1 : -1) : 0;
          });

          if (simulationRef.current) simulationRef.current.stop();
          const simulation = d3
            .forceSimulation(nodes as d3.SimulationNodeDatum[])
            .force(
              "link",
              d3
                .forceLink(links)
                .id((d: any) => d.id)
                .distance(140),
            )
            .force("charge", d3.forceManyBody().strength(-320))
            .force("center", d3.forceCenter(width / 2, height / 2))
            .force("collision", d3.forceCollide().radius(28));
          simulationRef.current = simulation;
        }

        const linkGroup = svg.append("g");
        const edgeGroup = linkGroup
          .selectAll("g.edge")
          .data(links)
          .enter()
          .append("g")
          .attr("class", "edge")
          .style("opacity", 0);

        edgeGroup
          .append("path")
          .attr("class", "edge-line")
          .attr("stroke", layout === "tree" ? "#d9e6ff" : "#cbd5f5")
          .attr("stroke-width", layout === "tree" ? 1.2 : EDGE_WIDTH)
          .attr("fill", "none")
          .style("transition", "all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)");

        edgeGroup
          .append("path")
          .attr("class", "edge-head")
          .attr("fill", "#94a3b8")
          .attr("stroke", "none")
          .style("transition", "all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)");

        let flowLabels: any = null;
        if (layout !== "tree" && showFlow) {
          const flowLabelGroup = svg.append("g");
          flowLabels = flowLabelGroup
            .selectAll("text")
            .data(links)
            .enter()
            .append("text")
            .attr("text-anchor", "middle")
            .attr("dominant-baseline", "middle")
            .attr("font-size", "10px")
            .attr("fill", "#1e293b")
            .attr("font-weight", "600")
            .attr("stroke", "#ffffff")
            .attr("stroke-width", "1px")
            .attr("paint-order", "stroke")
            .attr("opacity", 0)
            .style("pointer-events", "none")
            .style(
              "transition",
              "all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
            )
            .text((d: any) =>
              d.flow !== undefined && d.flow !== null ? Math.round(d.flow) : "",
            );
        }

        const nodeGroup = svg.append("g");
        const labelGroup = svg.append("g");
        const rankLabelGroup =
          layout !== "tree" && showRank ? svg.append("g") : null;

        // 调试：查看节点数据和树布局计算结果
        console.log("Nodes data:", nodes);
        console.log("Links data:", links);
        console.log("Tree layout nodes after position calculation:", nodes);

        const node = nodeGroup
          .selectAll("circle")
          .data(nodes)
          .enter()
          .append("circle")
          .attr("r", 0)
          .attr("fill", (d: any) => {
            if (layout === "tree") {
              const order =
                json?.traversalMode === "dfs"
                  ? [
                      "home",
                      "calligraphy",
                      "calligraphy-intro",
                      "opera",
                      "opera-intro",
                      "tea",
                      "tea-intro",
                    ]
                  : [
                      "home",
                      "calligraphy",
                      "opera",
                      "tea",
                      "calligraphy-intro",
                      "opera-intro",
                      "tea-intro",
                    ];
              const idx = order.indexOf(d.id);
              if (idx === currentStep) return "#ef4444"; // 当前节点：红色高亮
              if (idx > -1 && idx < currentStep) return "#93c5fd"; // 已遍历：浅蓝
              return "#60a5fa"; // 未遍历：中蓝
            }
            const rank = d.rank || 0.15;
            const r = Math.round(191 + (30 - 191) * rank);
            const g = Math.round(219 + (64 - 219) * rank);
            const b = Math.round(254 + (175 - 254) * rank);
            return `rgb(${r}, ${g}, ${b})`;
          })
          .attr("stroke", "#ffffff")
          .attr("stroke-width", (d: any) => {
            const order =
              json?.traversalMode === "dfs"
                ? [
                    "home",
                    "calligraphy",
                    "calligraphy-intro",
                    "opera",
                    "opera-intro",
                    "tea",
                    "tea-intro",
                  ]
                : [
                    "home",
                    "calligraphy",
                    "opera",
                    "tea",
                    "calligraphy-intro",
                    "opera-intro",
                    "tea-intro",
                  ];
            const idx = order.indexOf(d.id);
            return idx === currentStep ? 3 : 2; // 增大边框宽度
          })
          .style("transition", "all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)")
          .call((sel) => {
            if (layout === "tree") return;
            sel.call(
              d3
                .drag<SVGCircleElement, any>()
                .on("start", dragstarted)
                .on("drag", dragged)
                .on("end", dragended),
            );
          });

        const label = labelGroup
          .selectAll("text")
          .data(nodes)
          .enter()
          .append("text")
          .text((d: any) => d.label || d.id)
          .attr("text-anchor", "middle")
          .attr("dy", ".35em")
          .attr("font-size", (d: any) => {
            const text = d.label || d.id;
            if (text.length > 4) return "10px";
            if (text.length > 2) return "11px";
            return "12px";
          })
          .attr("font-weight", "600")
          .attr("fill", "#1e293b")
          .style("transition", "all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)");

        let rankLabel: any = null;
        if (rankLabelGroup) {
          rankLabel = rankLabelGroup
            .selectAll("text")
            .data(nodes)
            .enter()
            .append("text")
            .text((d: any) => `${Math.round((d.rank || 0) * 100)}票`)
            .attr("text-anchor", "middle")
            .attr("dy", "2.6em")
            .attr("font-size", "10px")
            .attr("font-weight", "700")
            .attr("fill", "#1e293b")
            .attr("stroke", "#ffffff")
            .attr("stroke-width", "2px")
            .attr("paint-order", "stroke")
            .style(
              "transition",
              "all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
            )
            .style("pointer-events", "none");
        }

        if (layout !== "tree" && json.currentIteration !== undefined) {
          svg
            .append("text")
            .attr("x", width - 10)
            .attr("y", 30)
            .attr("text-anchor", "end")
            .attr("font-size", "14px")
            .attr("font-weight", "600")
            .attr("fill", "#1e293b")
            .text(
              `Iteration: ${json.currentIteration}/${json.maxIterations || "?"}`,
            );
        }

        let simulation: d3.Simulation<
          d3.SimulationNodeDatum,
          undefined
        > | null = null;

        if (layout === "tree") {
          // 为每个边添加引用到实际节点对象
          const nodeMap = new Map(nodes.map((n) => [n.id, n]));

          edgeGroup.each(function (d: any) {
            // 确保source和target是节点对象
            const sourceNode =
              typeof d.source === "string" ? nodeMap.get(d.source) : d.source;
            const targetNode =
              typeof d.target === "string" ? nodeMap.get(d.target) : d.target;

            if (
              !sourceNode ||
              !targetNode ||
              !sourceNode.x ||
              !sourceNode.y ||
              !targetNode.x ||
              !targetNode.y
            ) {
              return; // 跳过无效节点
            }

            const dx = targetNode.x - sourceNode.x;
            const dy = targetNode.y - sourceNode.y;
            const dr = Math.sqrt(dx * dx + dy * dy) || 1;
            const ux = dx / dr;
            const uy = dy / dr;

            const sR = getNodeRadius(sourceNode.rank);
            const tR = getNodeRadius(targetNode.rank);

            const startX = sourceNode.x + ux * sR;
            const startY = sourceNode.y + uy * sR;
            const tipBaseX = targetNode.x - ux * (tR + 1);
            const tipBaseY = targetNode.y - uy * (tR + 1);
            const endX = tipBaseX - ux * ARROW_LENGTH;
            const endY = tipBaseY - uy * ARROW_LENGTH;

            d3.select(this)
              .select("path.edge-line")
              .attr("d", `M${startX},${startY} L${endX},${endY}`);

            const leftX = endX + -uy * (ARROW_WIDTH / 2);
            const leftY = endY + ux * (ARROW_WIDTH / 2);
            const rightX = endX + uy * (ARROW_WIDTH / 2);
            const rightY = endY - ux * (ARROW_WIDTH / 2);
            const arrowPath = `M${tipBaseX},${tipBaseY} L${leftX},${leftY} L${rightX},${rightY} Z`;
            d3.select(this).select("path.edge-head").attr("d", arrowPath);
          });

          node.attr("cx", (d: any) => d.x).attr("cy", (d: any) => d.y);
          label.attr("x", (d: any) => d.x).attr("y", (d: any) => d.y);
          if (rankLabel) {
            rankLabel.attr("x", (d: any) => d.x).attr("y", (d: any) => d.y);
          }
        } else {
          simulation = simulationRef.current;
          simulation?.on("tick", () => {
            edgeGroup.each(function (d: any) {
              const source = d.source as any;
              const target = d.target as any;

              const dx = target.x - source.x;
              const dy = target.y - source.y;
              const dr = Math.sqrt(dx * dx + dy * dy) || 1;
              const ux = dx / dr;
              const uy = dy / dr;

              const sR = getNodeRadius(source.rank);
              const tR = getNodeRadius(target.rank);

              const baseStartX = source.x + ux * sR;
              const baseStartY = source.y + uy * sR;
              const tipBaseX = target.x - ux * (tR + 1);
              const tipBaseY = target.y - uy * (tR + 1);
              const baseEndX = tipBaseX - ux * ARROW_LENGTH;
              const baseEndY = tipBaseY - uy * ARROW_LENGTH;

              const dirSign = String(source.id) < String(target.id) ? 1 : -1;
              const dxCanonical = dx * dirSign;
              const dyCanonical = dy * dirSign;
              const perpX = -dyCanonical / dr;
              const perpY = dxCanonical / dr;

              const offset =
                d.__hasReverse && d.__offsetSign
                  ? d.__offsetSign * EDGE_PARALLEL_OFFSET
                  : 0;

              const startX = baseStartX + perpX * offset;
              const startY = baseStartY + perpY * offset;
              const endX = baseEndX + perpX * offset;
              const endY = baseEndY + perpY * offset;
              const tipX = tipBaseX + perpX * offset;
              const tipY = tipBaseY + perpY * offset;

              const curveBend = 6;
              const midX = (startX + endX) / 2 + perpX * curveBend;
              const midY = (startY + endY) / 2 + perpY * curveBend;

              const bodyPath = `M${startX},${startY} Q${midX},${midY} ${endX},${endY}`;
              d3.select(this).select("path.edge-line").attr("d", bodyPath);

              const leftX = endX + perpX * (ARROW_WIDTH / 2);
              const leftY = endY + perpY * (ARROW_WIDTH / 2);
              const rightX = endX - perpX * (ARROW_WIDTH / 2);
              const rightY = endY - perpY * (ARROW_WIDTH / 2);
              const arrowPath = `M${tipX},${tipY} L${leftX},${leftY} L${rightX},${rightY} Z`;
              d3.select(this).select("path.edge-head").attr("d", arrowPath);
            });

            node.attr("cx", (d: any) => d.x).attr("cy", (d: any) => d.y);
            label.attr("x", (d: any) => d.x).attr("y", (d: any) => d.y);
            if (rankLabel) {
              rankLabel.attr("x", (d: any) => d.x).attr("y", (d: any) => d.y);
            }
            if (flowLabels) {
              flowLabels
                .attr("x", (d: any) => {
                  const source = d.source as any;
                  const target = d.target as any;

                  const dx = target.x - source.x;
                  const dy = target.y - source.y;
                  const dr = Math.sqrt(dx * dx + dy * dy) || 1;
                  const ux = dx / dr;
                  const uy = dy / dr;

                  const sR = getNodeRadius(source.rank);
                  const tR = getNodeRadius(target.rank);
                  const tipRadius = tR + 1;

                  const baseStartX = source.x + ux * sR;
                  const tipBaseX = target.x - ux * tipRadius;
                  const baseEndX = tipBaseX - ux * ARROW_LENGTH;

                  const dirSign =
                    String(source.id) < String(target.id) ? 1 : -1;
                  const dxCanonical = dx * dirSign;
                  const dyCanonical = dy * dirSign;
                  const perpX = -dyCanonical / dr;

                  const offset =
                    d.__hasReverse && d.__offsetSign
                      ? d.__offsetSign * EDGE_PARALLEL_OFFSET
                      : 0;

                  const startX = baseStartX + perpX * offset;
                  const endX = baseEndX + perpX * offset;
                  return (startX + endX) / 2;
                })
                .attr("y", (d: any) => {
                  const source = d.source as any;
                  const target = d.target as any;

                  const dx = target.x - source.x;
                  const dy = target.y - source.y;
                  const dr = Math.sqrt(dx * dx + dy * dy) || 1;
                  const uy = dy / dr;

                  const sR = getNodeRadius(source.rank);
                  const tR = getNodeRadius(target.rank);
                  const tipRadius = tR + 1;

                  const baseStartY = source.y + uy * sR;
                  const tipBaseY = target.y - uy * tipRadius;
                  const baseEndY = tipBaseY - uy * ARROW_LENGTH;

                  const dirSign =
                    String(source.id) < String(target.id) ? 1 : -1;
                  const dxCanonical = dx * dirSign;
                  const dyCanonical = dy * dirSign;
                  const perpY = dxCanonical / dr;

                  const offset =
                    d.__hasReverse && d.__offsetSign
                      ? d.__offsetSign * EDGE_PARALLEL_OFFSET
                      : 0;

                  const startY = baseStartY + perpY * offset;
                  const endY = baseEndY + perpY * offset;
                  return (startY + endY) / 2;
                });
            }
          });
        }

        node
          .transition()
          .duration(300)
          .ease(d3.easeCubicOut)
          .attr("r", (d: any) => getNodeRadius(d.rank));

        setTimeout(() => {
          edgeGroup.transition().duration(800).style("opacity", 1);
          if (flowLabels) {
            flowLabels.transition().duration(800).attr("opacity", 1);
          }
        }, 100);

        function dragstarted(event: any, d: any) {
          if (!event.active && simulationRef.current)
            simulationRef.current.alphaTarget(0.3).restart();
          d.fx = d.x;
          d.fy = d.y;
        }
        function dragged(event: any, d: any) {
          d.fx = event.x;
          d.fy = event.y;
        }
        function dragended(event: any, d: any) {
          if (!event.active && simulationRef.current)
            simulationRef.current.alphaTarget(0);
          d.fx = null;
          d.fy = null;
        }

        setTimeout(() => setIsLoading(false), 100);
      } catch (err) {
        console.error("PageRank graph render error", err);
        setError("图表渲染失败，请刷新页面重试");
        setIsLoading(false);
      }
    }, 100);

    return () => {
      if (renderTimeoutRef.current) {
        clearTimeout(renderTimeoutRef.current);
      }
      if (simulationRef.current) {
        simulationRef.current.stop();
        simulationRef.current = null;
      }
    };
  }, [json, messageId, currentStep, layout, showFlow, showRank, fixedSpacing]);

  if (error) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "100%",
          height: "100%",
          color: "#ef4444",
          fontSize: "14px",
          textAlign: "center" as const,
        }}
      >
        <div>
          <div style={{ marginBottom: "8px" }}>⚠️</div>
          <div>{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: "100%",
        height: "100%",
        position: "relative" as const,
      }}
    >
      {isLoading && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "rgba(255, 255, 255, 0.8)",
            zIndex: 10,
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column" as const,
              alignItems: "center",
              color: "#64748b",
              fontSize: "14px",
            }}
          >
            <div
              style={{
                width: "24px",
                height: "24px",
                border: "2px solid #e2e8f0",
                borderTop: "2px solid #3b82f6",
                borderRadius: "50%",
                animation: "spin 1s linear infinite",
                marginBottom: "8px",
              }}
            />
            加载图表中...
          </div>
        </div>
      )}
      <svg ref={svgRef} style={{ width: "100%", height: "100%" }}></svg>
    </div>
  );
};

export default PageRankGraph;

const styles = `
@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
`;

if (typeof document !== "undefined") {
  const styleElement = document.createElement("style");
  styleElement.textContent = styles;
  document.head.appendChild(styleElement);
}
