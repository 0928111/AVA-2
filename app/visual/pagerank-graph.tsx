import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import type { GraphData } from "../api/protocols/pagerank-protocol";
import { runVotingStep } from "../utils/vote-flow";

interface Props {
  json?: GraphData;
  messageId: string;
  currentStep?: number;
}

// Geometry and style parameters: ~20px nodes, 2px edges, 10×6 arrows
const NODE_BASE_RADIUS = 18;
const NODE_EXTRA_RADIUS = 6; // rank mapped to extra radius, overall ~18–24px
const EDGE_WIDTH = 2;
const ARROW_LENGTH = 10;
const ARROW_WIDTH = 6;
// Distance between a pair of opposite edges (roughly one node radius)
const EDGE_PARALLEL_OFFSET = 14;

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

  const getNodeRadius = (rank?: number) => {
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

        const containerWidth = svgRef.current?.clientWidth || 800;
        const containerHeight = svgRef.current?.clientHeight || 600;
        const width = Math.min(containerWidth, 1000);
        const height = Math.min(containerHeight, 700);

        const svg = d3.select(svgRef.current);
        svg.selectAll("*").remove();

        svg
          .attr("id", "PR" + messageId)
          .attr("width", width)
          .attr("height", height)
          .attr("viewBox", [0, 0, width, height].join(" "))
          .attr(
            "style",
            "max-width: 100%; height: auto; border: 1px solid #BFDBFE; border-radius: 16px; background: #ffffff; box-shadow: 0 4px 16px rgba(147, 197, 253, 0.15);",
          );

        const nodes = (json.nodes || []).map((d) => ({ ...d }));

        // If upstream did not provide flow, compute one voting step locally
        let linksSource: any[] = json.links || [];
        const hasAnyFlow = linksSource.some(
          (link: any) => typeof link.flow === "number",
        );
        const shouldComputeFlow = currentStep > 0 && !hasAnyFlow;

        // Only backfill flow values for non-initial steps; step 0 should show 0 flow
        if (shouldComputeFlow && linksSource.length > 0) {
          try {
            const computed = runVotingStep(json as GraphData);
            linksSource = computed.links as any[];
          } catch {
            // Fallback: keep original links, flow stays 0
          }
        }
        const links = linksSource.map((d: any) => ({ ...d }));

        // Mark pairs of opposite edges, assign symmetric offset signs
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

        if (simulationRef.current) {
          simulationRef.current.stop();
        }

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

        const linkGroup = svg.append("g");

        // Each edge as a group: path (curve) + arrow head
        const edgeGroup = linkGroup
          .selectAll("g.edge")
          .data(links)
          .enter()
          .append("g")
          .attr("class", "edge")
          .style("opacity", 0);

        const edgeLine = edgeGroup
          .append("path")
          .attr("class", "edge-line")
          .attr("stroke", "#cbd5f5")
          .attr("stroke-width", EDGE_WIDTH)
          .attr("fill", "none")
          .style("transition", "all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)");

        const edgeHead = edgeGroup
          .append("path")
          .attr("class", "edge-head")
          .attr("fill", "#94a3b8")
          .attr("stroke", "none")
          .style("transition", "all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)");

        const flowLabelGroup = svg.append("g");
        const flowLabels = flowLabelGroup
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
          .style("transition", "all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)")
          .text((d: any) =>
            d.flow !== undefined && d.flow !== null ? Math.round(d.flow) : "",
          );

        const nodeGroup = svg.append("g");
        const node = nodeGroup
          .selectAll("circle")
          .data(nodes)
          .enter()
          .append("circle")
          .attr("r", 0)
          .attr("fill", (d: any) => {
            const rank = d.rank || 0.15;
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

        const label = svg
          .append("g")
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

        const TOTAL_VISITORS = 100;
        const rankLabel = svg
          .append("g")
          .selectAll("text")
          .data(nodes)
          .enter()
          .append("text")
          .text((d: any) => `${Math.round((d.rank || 0) * TOTAL_VISITORS)}票`)
          .attr("text-anchor", "middle")
          .attr("dy", "2.6em")
          .attr("font-size", "10px")
          .attr("font-weight", "700")
          .attr("fill", "#1e293b")
          .attr("stroke", "#ffffff")
          .attr("stroke-width", "2px")
          .attr("paint-order", "stroke")
          .attr("stroke-linejoin", "round")
          .attr("stroke-linecap", "round")
          .style("transition", "all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)")
          .style("pointer-events", "none")
          .style("z-index", "1000");

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
              `Iteration: ${json.currentIteration}/${json.maxIterations || "?"}`,
            );
        }

        simulation.on("tick", () => {
          // Update each edge (curve + arrow)
          edgeGroup.each(function (d: any) {
            const source = d.source as any;
            const target = d.target as any;

            const dx = target.x - source.x;
            const dy = target.y - source.y;
            const dr = Math.sqrt(dx * dx + dy * dy) || 1;
            const ux = dx / dr;
            const uy = dy / dr;

            const sx = source.x;
            const sy = source.y;
            const tx = target.x;
            const ty = target.y;

            const sourceRadius = getNodeRadius(source.rank);
            const targetRadius = getNodeRadius(target.rank);

            const baseStartX = sx + ux * sourceRadius;
            const baseStartY = sy + uy * sourceRadius;

            const tipRadius = targetRadius + 1;
            const tipBaseX = tx - ux * tipRadius;
            const tipBaseY = ty - uy * tipRadius;

            const baseEndX = tipBaseX - ux * ARROW_LENGTH;
            const baseEndY = tipBaseY - uy * ARROW_LENGTH;

            // Canonical perpendicular: ensures both opposite edges share the same normal
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

            // Slightly curved edge via quadratic bezier
            const curveBend = 6;
            const midX = (startX + endX) / 2 + perpX * curveBend;
            const midY = (startY + endY) / 2 + perpY * curveBend;

            const bodyPath = `M${startX},${startY} Q${midX},${midY} ${endX},${endY}`;
            d3.select(this).select("path.edge-line").attr("d", bodyPath);

            // Arrow triangle
            const leftX = endX + perpX * (ARROW_WIDTH / 2);
            const leftY = endY + perpY * (ARROW_WIDTH / 2);
            const rightX = endX - perpX * (ARROW_WIDTH / 2);
            const rightY = endY - perpY * (ARROW_WIDTH / 2);

            const arrowPath = `M${tipX},${tipY} L${leftX},${leftY} L${rightX},${rightY} Z`;
            d3.select(this).select("path.edge-head").attr("d", arrowPath);
          });

          // Nodes and labels
          node.attr("cx", (d: any) => d.x).attr("cy", (d: any) => d.y);
          label.attr("x", (d: any) => d.x).attr("y", (d: any) => d.y);
          rankLabel.attr("x", (d: any) => d.x).attr("y", (d: any) => d.y);

          // Flow labels at the midpoint of each offset curve
          flowLabels
            .attr("x", (d: any) => {
              const source = d.source as any;
              const target = d.target as any;

              const dx = target.x - source.x;
              const dy = target.y - source.y;
              const dr = Math.sqrt(dx * dx + dy * dy) || 1;
              const ux = dx / dr;
              const uy = dy / dr;

              const sourceRadius = getNodeRadius(source.rank);
              const targetRadius = getNodeRadius(target.rank);
              const tipRadius = targetRadius + 1;

              const baseStartX = source.x + ux * sourceRadius;
              const baseStartY = source.y + uy * sourceRadius;
              const tipBaseX = target.x - ux * tipRadius;
              const tipBaseY = target.y - uy * tipRadius;
              const baseEndX = tipBaseX - ux * ARROW_LENGTH;

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
              const endX = baseEndX + perpX * offset;

              return (startX + endX) / 2;
            })
            .attr("y", (d: any) => {
              const source = d.source as any;
              const target = d.target as any;

              const dx = target.x - source.x;
              const dy = target.y - source.y;
              const dr = Math.sqrt(dx * dx + dy * dy) || 1;
              const ux = dx / dr;
              const uy = dy / dr;

              const sourceRadius = getNodeRadius(source.rank);
              const targetRadius = getNodeRadius(target.rank);
              const tipRadius = targetRadius + 1;

              const baseStartY = source.y + uy * sourceRadius;
              const tipBaseY = target.y - uy * tipRadius;
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

              const startY = baseStartY + perpY * offset;
              const endY = baseEndY + perpY * offset;

              return (startY + endY) / 2;
            });
        });

        // Entrance animations
        node
          .transition()
          .duration(300)
          .ease(d3.easeCubicOut)
          .attr("r", (d: any) => getNodeRadius(d.rank));

        setTimeout(() => {
          edgeGroup.transition().duration(800).style("opacity", 1);

          flowLabels.transition().duration(800).attr("opacity", 1);
        }, 100);

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

// Simple loading animation
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
