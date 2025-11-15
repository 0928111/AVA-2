//change the certain number into another number

import React, { useEffect, useRef } from "react";
import * as d3 from "d3";
import { Props } from "../components/visual-props";
interface BarChartProps {
  data: number[];
  newData: number[];
  messageId: string;
}

const BarChart_changingAllNumber: React.FC<Props> = ({
  data,
  newData,
  messageId,
}: Props) => {
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (!data || !newData) return;
    const width = 640;
    const height = 400;
    const marginTop = 20;
    const marginRight = 0;
    const marginBottom = 30;
    const marginLeft = 40;
    const x = d3
      .scaleBand()
      .domain(data.map((_, idx) => idx.toString()))
      .range([marginLeft, width - marginRight])
      .padding(0.15);

    const xAxis = d3.axisBottom(x).tickSizeOuter(0);

    const y = d3
      .scaleLinear()
      .domain([0, data ? (d3.max(data) as number) : 0])
      .nice()
      .range([height - marginBottom, marginTop]);

    const svgElement = d3
      .select(svgRef.current)
      .attr("id", "A" + messageId)
      .attr("viewBox", [0, 0, width, height])
      .attr(
        "style",
        `max-width: ${width}px; height: auto; font: 10px sans-serif; overflow: visible;`,
      );

    const bars = svgElement
      .selectAll(".bar")
      .data(data)
      .enter()
      .append("g")
      .attr("class", "bar")
      .style("mix-blend-mode", "normal");

    bars
      .append("rect")
      .attr("x", (_: number, idx: number) => x(idx.toString()) as number)
      .attr("y", (d: number) => y(d) as number)
      .attr("width", x.bandwidth())
      .attr("height", (d: number) => y(0) - (y(d) as number))
      .attr("width", x.bandwidth() as number)
      .attr("fill", "steelblue");

    // gx
    svgElement
      .append("g")
      .attr("transform", `translate(0,${height - marginBottom})`)
      .call(xAxis)
      .selectAll("text")
      .style("font-size", "20px");

    // gy
    svgElement
      .append("g")
      .attr("transform", `translate(${marginLeft},0)`)

      .call(
        d3
          .axisLeft(y)
          .ticks(data ? (d3.max(data) as number) : 0)
          .tickFormat(d3.format(".0f")),
      )

      .selectAll("text")
      .style("font-size", "20px");

    // Sorting animation functions
    async function chart() {
      const diffIndex =
        data && newData ? findArrayDifference(data, newData) : null;
      if (diffIndex !== null) {
        let selector = "A" + messageId;
        const lastsvg = d3.select(`#${selector}`);
        const mov1 = lastsvg.select(`.bar:nth-child(${diffIndex[0] + 1})`);
        const colorTween = (startColor: string, endColor: string) => {
          return function (t: number) {
            const interpolateColor = d3.interpolateRgb(startColor, endColor);
            mov1.select("rect").attr("fill", interpolateColor(t));
          };
        };
        const oldHeight =
          diffIndex && data ? (y(data[diffIndex[0]]) as number) : 0;
        const newBarY =
          diffIndex && newData ? (y(newData[diffIndex[0]]) as number) : 0;
        const heightDiff = oldHeight - newBarY;

        mov1
          .transition()
          .duration(1000)
          .tween("color", () => colorTween("steelblue", "orange"))
          .select("rect")
          .attr("y", diffIndex && newData ? y(newData[diffIndex[0]]) : 0)
          .attr("height", function (d) {
            return +d3.select(this).attr("height") + heightDiff;
          })
          .on("end", () => {
            mov1
              .select("rect")
              .attr("y", diffIndex && data ? y(data[diffIndex[0]]) : 0)
              .attr("height", function (d) {
                return +d3.select(this).attr("height") - heightDiff;
              });
            chart();
          });
      }
    }

    if (
      data &&
      newData &&
      !data.every((element, index) => element === newData[index]) &&
      newData.length === 5
    ) {
      chart();
    }
  }, [data, newData, messageId]);

  function findArrayDifference(
    arr1: number[],
    arr2: number[],
  ): number[] | null {
    if (!arr1 || !arr2 || arr1.length !== arr2.length) {
      return null;
    }
    for (let i = 0; i < arr1.length; i++) {
      if (arr1[i] !== arr2[i]) {
        return [i, i + 1];
      }
    }
    return null;
  }

  if (!data || !newData) {
    return null;
  }

  return (
    <div style={{ width: "200px", height: "150px" }}>
      <svg ref={svgRef}></svg>
    </div>
  );
};

export default BarChart_changingAllNumber;
