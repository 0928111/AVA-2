import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import type { GraphData } from "../api/protocols/pagerank-protocol";

interface Props {
  json?: GraphData;
  messageId: string;
  currentStep?: number;
}

const PageRankGraph: React.FC<Props> = ({
  json,
  messageId,
  currentStep = 0,
}: Props) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const renderTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const simulationRef = useRef<d3.Simulation<
    d3.SimulationNodeDatum,
    undefined
  > | null>(null);

  useEffect(() => {
    // 清除之前的渲染定时器
    if (renderTimeoutRef.current) {
      clearTimeout(renderTimeoutRef.current);
    }

    if (!json || !svgRef.current) {
      setIsLoading(true);
      return;
    }

    // 添加防抖延迟，避免快速切换时的重复渲染
    renderTimeoutRef.current = setTimeout(() => {
      try {
        setIsLoading(true);
        setError(null);

        const containerWidth = svgRef.current?.clientWidth || 800;
        const containerHeight = svgRef.current?.clientHeight || 600;
        const width = Math.min(containerWidth, 1000);
        const height = Math.min(containerHeight, 700);
        const margin = { top: 20, right: 20, bottom: 40, left: 20 };

        // 清除之前的SVG内容
        const svg = d3.select(svgRef.current);
        svg.selectAll("*").remove();

        // 设置SVG属性
        svg
          .attr("id", "PR" + messageId)
          .attr("width", width)
          .attr("height", height)
          .attr("viewBox", [0, 0, width, height].join(" "))
          .attr(
            "style",
            "max-width: 100%; height: auto; border: 1px solid #BFDBFE; border-radius: 16px; background: #ffffff; box-shadow: 0 4px 16px rgba(147, 197, 253, 0.15);",
          );

        // 准备数据 - 确保nodes和links字段存在
        const nodes = (json.nodes || []).map((d) => ({ ...d }));
        const links = (json.links || []).map((d) => ({ ...d }));

        // 清理之前的simulation
        if (simulationRef.current) {
          simulationRef.current.stop();
        }

        // 创建力导向布局
        const simulation = d3
          .forceSimulation(nodes as d3.SimulationNodeDatum[])
          .force(
            "link",
            d3
              .forceLink(links)
              .id((d: any) => d.id)
              .distance(120),
          )
          .force("charge", d3.forceManyBody().strength(-300))
          .force("center", d3.forceCenter(width / 2, height / 2))
          .force("collision", d3.forceCollide().radius(35));

        // 保存simulation引用
        simulationRef.current = simulation;

        // 创建箭头标记
        const defs = svg.append("defs");

        // 创建正向箭头标记
        const arrowColors = ["#999", "#666", "#333"];
        arrowColors.forEach((color, index) => {
          defs
            .append("marker")
            .attr("id", `arrow-${index}`)
            .attr("viewBox", "0 -5 10 10")
            .attr("refX", 8)
            .attr("refY", 0)
            .attr("markerWidth", 6)
            .attr("markerHeight", 6)
            .attr("orient", "auto")
            .append("path")
            .attr("d", "M0,-5L10,0L0,5")
            .attr("fill", color);
        });

        // 创建反向箭头标记（用于双向边）
        arrowColors.forEach((color, index) => {
          defs
            .append("marker")
            .attr("id", `arrow-reverse-${index}`)
            .attr("viewBox", "0 -5 10 10")
            .attr("refX", 8) // 增加refX值，确保箭头在曲线末端正确显示
            .attr("refY", 0)
            .attr("markerWidth", 6)
            .attr("markerHeight", 6)
            .attr("orient", "auto")
            .append("path")
            .attr("d", "M10,-5L0,0L10,5")
            .attr("fill", color);
        });

        // 检测双向边
        const bidirectionalPairs = new Set();
        links.forEach((link1: any, i: number) => {
          links.forEach((link2: any, j: number) => {
            if (
              i !== j &&
              link1.source.id === link2.target.id &&
              link1.target.id === link2.source.id
            ) {
              const pairKey = [link1.source.id, link1.target.id]
                .sort()
                .join("-");
              bidirectionalPairs.add(pairKey);
            }
          });
        });

        // 绘制连线
        const link = svg
          .append("g")
          .selectAll("path")
          .data(links)
          .enter()
          .append("path")
          .attr("stroke", (d: any) => {
            // 根据权重选择箭头颜色
            const weight = d.weight || 1;
            if (weight >= 1) return "#64748b";
            if (weight >= 0.5) return "#94a3b8";
            return "#bfdbfe";
          })
          .attr("stroke-opacity", 0)
          .attr("stroke-width", (d: any) =>
            Math.max(1, Math.sqrt(d.weight || 1) * 1.5),
          )
          .attr("fill", "none")
          .style("transition", "all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)")
          .attr("marker-end", (d: any) => {
            const weight = d.weight || 1;
            const pairKey = [d.source.id, d.target.id].sort().join("-");
            const isBidirectional = bidirectionalPairs.has(pairKey);

            if (isBidirectional) {
              // 双向边：根据边的方向决定使用哪个箭头
              const isFirstEdge = d.source.id < d.target.id;
              if (isFirstEdge) {
                if (weight >= 1) return "url(#arrow-2)";
                if (weight >= 0.5) return "url(#arrow-1)";
                return "url(#arrow-0)";
              } else {
                // 第二条边不添加末端箭头
                return null;
              }
            } else {
              // 单向边
              if (weight >= 1) return "url(#arrow-2)";
              if (weight >= 0.5) return "url(#arrow-1)";
              return "url(#arrow-0)";
            }
          })
          .attr("marker-start", (d: any) => {
            const weight = d.weight || 1;
            const pairKey = [d.source.id, d.target.id].sort().join("-");
            const isBidirectional = bidirectionalPairs.has(pairKey);

            if (isBidirectional) {
              // 双向边：第二条边添加起始箭头
              const isFirstEdge = d.source.id < d.target.id;
              if (!isFirstEdge) {
                if (weight >= 1) return "url(#arrow-reverse-2)";
                if (weight >= 0.5) return "url(#arrow-reverse-1)";
                return "url(#arrow-reverse-0)";
              } else {
                // 第一条边不添加起始箭头
                return null;
              }
            } else {
              // 单向边不添加起始箭头
              return null;
            }
          })
          .attr("data-source", (d: any) => d.source.id)
          .attr("data-target", (d: any) => d.target.id);

        // 绘制节点
        const node = svg
          .append("g")
          .selectAll("circle")
          .data(nodes)
          .enter()
          .append("circle")
          .attr("r", 0)
          .attr("fill", (d: any) => {
            // 根据PageRank值设置颜色，使用浅天蓝到深蓝的渐变映射
            const rank = d.rank || 0.15;
            // 浅天蓝(#BFDBFE)到深蓝(#1e40af)的渐变映射
            const r = Math.round(191 + (30 - 191) * rank);
            const g = Math.round(219 + (64 - 219) * rank);
            const b = Math.round(254 + (175 - 254) * rank);
            return `rgb(${r}, ${g}, ${b})`;
          })
          .attr("stroke", "#ffffff")
          .attr("stroke-width", 3)
          .style("transition", "all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)")
          .call(
            d3
              .drag<SVGCircleElement, any>()
              .on("start", dragstarted)
              .on("drag", dragged)
              .on("end", dragended),
          );

        // 添加节点标签
        const label = svg
          .append("g")
          .selectAll("text")
          .data(nodes)
          .enter()
          .append("text")
          .text((d: any) => d.id)
          .attr("text-anchor", "middle")
          .attr("dy", ".35em")
          .attr("font-size", "12px")
          .attr("font-weight", "600")
          .attr("fill", "#1e293b")
          .style("transition", "all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)");

        // 添加PageRank值标签
        const rankLabel = svg
          .append("g")
          .selectAll("text")
          .data(nodes)
          .enter()
          .append("text")
          .text((d: any) => (d.rank || 0.15).toFixed(3)) // 简化显示，只显示数值
          .attr("text-anchor", "middle")
          .attr("dy", "2.8em") // 进一步增加垂直间距，避开边的显示区域
          .attr("font-size", "10px") // 适当减小字体，更精致
          .attr("font-weight", "700") // 加粗字体
          .attr("fill", "#1e293b") // 使用更深的颜色提高对比度
          .attr("stroke", "#ffffff") // 添加白色描边
          .attr("stroke-width", "2px") // 增加描边宽度，防止被线条遮挡
          .attr("paint-order", "stroke") // 确保描边在填充下方
          .attr("stroke-linejoin", "round") // 描边角圆滑
          .attr("stroke-linecap", "round") // 描边线端圆滑
          .style("transition", "all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)")
          .style("pointer-events", "none") // 避免干扰拖拽
          .style("z-index", "1000"); // 提高层级，确保在最上层显示

        // 添加迭代信息
        if (json.currentIteration !== undefined) {
          svg
            .append("text")
            .attr("x", width - 10)
            .attr("y", 30)
            .attr("text-anchor", "end")
            .attr("font-size", "14px")
            .attr("font-weight", "600")
            .attr("fill", "#1e293b")
            .style(
              "transition",
              "all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
            )
            .text(
              `Iteration: ${json.currentIteration}/${json.maxIterations || "∞"}`,
            );
        }

        // 更新位置
        simulation.on("tick", () => {
          link.attr("d", (d: any) => {
            const dx = d.target.x - d.source.x;
            const dy = d.target.y - d.source.y;
            const dr = Math.sqrt(dx * dx + dy * dy);

            // 节点半径
            const nodeRadius = Math.max(
              12,
              Math.min(25, 12 + (d.source.rank || 0.15) * 30),
            );
            const targetNodeRadius = Math.max(
              12,
              Math.min(25, 12 + (d.target.rank || 0.15) * 30),
            );

            // 检查是否为双向边
            const isBidirectional = bidirectionalPairs.has(
              [d.source.id, d.target.id].sort().join("-"),
            );

            if (isBidirectional) {
              // 双向边使用平行线，通过偏移量区分两个方向
              const offset = 15; // 平行线偏移量
              const midX = (d.source.x + d.target.x) / 2;
              const midY = (d.source.y + d.target.y) / 2;

              // 计算垂直向量（垂直于连接线的方向）
              const perpX = -dy / dr;
              const perpY = dx / dr;

              // 确定哪条线在"上方"，通过边的方向决定
              const pairKey = [d.source.id, d.target.id].sort().join("-");
              const isFirstEdge = d.source.id < d.target.id;
              const direction = isFirstEdge ? 1 : -1;

              // 计算控制点偏移
              const controlOffsetX = perpX * offset * direction;
              const controlOffsetY = perpY * offset * direction;

              // 计算起点和终点的偏移（避免与节点重叠）
              const startOffsetX = (dx / dr) * nodeRadius;
              const startOffsetY = (dy / dr) * nodeRadius;
              const endOffsetX = (dx / dr) * targetNodeRadius;
              const endOffsetY = (dy / dr) * targetNodeRadius;

              const startX = d.source.x + startOffsetX;
              const startY = d.source.y + startOffsetY;
              const endX = d.target.x - endOffsetX;
              const endY = d.target.y - endOffsetY;

              // 使用二次贝塞尔曲线创建平滑的平行线效果
              const controlX = midX + controlOffsetX;
              const controlY = midY + controlOffsetY;

              return `M${startX},${startY} Q${controlX},${controlY} ${endX},${endY}`;
            } else {
              // 单向边使用直线，考虑节点半径
              const offsetX = (dx / dr) * nodeRadius;
              const offsetY = (dy / dr) * nodeRadius;
              const targetOffsetX = (dx / dr) * targetNodeRadius;
              const targetOffsetY = (dy / dr) * targetNodeRadius;

              return `M${d.source.x + offsetX},${d.source.y + offsetY} L${d.target.x - targetOffsetX},${d.target.y - targetOffsetY}`;
            }
          });

          node.attr("cx", (d: any) => d.x).attr("cy", (d: any) => d.y);

          label.attr("x", (d: any) => d.x).attr("y", (d: any) => d.y);

          rankLabel.attr("x", (d: any) => d.x).attr("y", (d: any) => d.y);
        });

        // 入场动画
        node
          .transition()
          .duration(300)
          .ease(d3.easeCubicOut)
          .attr("r", (d: any) => {
            const rank = d.rank || 0.15;
            return Math.max(12, Math.min(25, 12 + rank * 30));
          });

        link
          .transition()
          .duration(300)
          .ease(d3.easeCubicOut)
          .attr("stroke-opacity", 0.8);

        // 拖拽函数
        function dragstarted(event: any, d: any) {
          if (!event.active) simulation.alphaTarget(0.3).restart();
          d.fx = d.x;
          d.fy = d.y;
        }

        function dragged(event: any, d: any) {
          d.fx = event.x;
          d.fy = event.y;
        }

        function dragended(event: any, d: any) {
          if (!event.active) simulation.alphaTarget(0);
          d.fx = null;
          d.fy = null;
        }

        // 标记加载完成
        setTimeout(() => setIsLoading(false), 100);
      } catch (err) {
        console.error("PageRank图渲染错误:", err);
        setError("图表渲染失败，请刷新页面重试");
        setIsLoading(false);
      }
    }, 100); // 100ms防抖延迟

    return () => {
      if (renderTimeoutRef.current) {
        clearTimeout(renderTimeoutRef.current);
      }
      // 清理simulation
      if (simulationRef.current) {
        simulationRef.current.stop();
        simulationRef.current = null;
      }
    };
  }, [json, messageId, currentStep]);

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

// 添加CSS动画
const styles = `
@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
`;

// 注入样式到页面
if (typeof document !== "undefined") {
  const styleElement = document.createElement("style");
  styleElement.textContent = styles;
  document.head.appendChild(styleElement);
}
