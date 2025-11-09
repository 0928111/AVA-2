import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';

interface PageRankNode {
  id: string;
  rank: number;
  x: number;
  y: number;
  color: string;
}

interface PageRankLink {
  source: string;
  target: string;
  weight: number;
}

interface PageRankAnimationProps {
  currentStep: number;
}

const PageRankAnimation: React.FC<PageRankAnimationProps> = ({ currentStep }) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [nodes] = useState<PageRankNode[]>([
    { id: 'A', rank: 0.33, x: 25, y: 50, color: '#E0F2FE' },
    { id: 'B', rank: 0.67, x: 75, y: 50, color: '#DBEAFE' }
  ]);
  
  const [links] = useState<PageRankLink[]>([
    { source: 'A', target: 'B', weight: 0.5 }
  ]);

  const steps = [
    { a: 0.33, b: 0.67, w: 0.50 },
    { a: 0.25, b: 0.75, w: 0.58 },
    { a: 0.22, b: 0.78, w: 0.65 }
  ];

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    // 获取容器实际尺寸
    const container = svgRef.current.parentElement;
    const width = container?.clientWidth || 400;
    const height = container?.clientHeight || 300;
    
    // 设置SVG尺寸
    svg.attr('width', width).attr('height', height);
    
    const currentData = steps[currentStep % steps.length];

    // 创建箭头标记
    svg.append('defs')
      .append('marker')
      .attr('id', 'arrow')
      .attr('markerWidth', 10)
      .attr('markerHeight', 10)
      .attr('refX', 10)
      .attr('refY', 3)
      .attr('orient', 'auto')
      .attr('markerUnits', 'strokeWidth')
      .append('path')
      .attr('d', 'M0,0 L0,6 L9,3 z')
      .attr('fill', '#60A5FA');

    // 计算相对位置
    const x1 = width * 0.25;
    const y1 = height * 0.5;
    const x2 = width * 0.75;
    const y2 = height * 0.5;
    
    // 绘制边
    const edge = svg.append('line')
      .attr('id', 'edgeAB')
      .attr('x1', x1)
      .attr('y1', y1)
      .attr('x2', x2)
      .attr('y2', y2)
      .attr('stroke', '#93C5FD')
      .attr('stroke-width', 2.5)
      .attr('marker-end', 'url(#arrow)')
      .style('transition', 'all 0.3s ease');

    // 边权重文本
    svg.append('text')
      .attr('id', 'wAB')
      .attr('x', width * 0.5)
      .attr('y', height * 0.43)
      .attr('text-anchor', 'middle')
      .attr('class', 'text-sm fill-slate-600')
      .text(`权重: ${currentData.w.toFixed(2)}`);

    // 节点A
    const nodeA = svg.append('g').attr('id', 'nodeA').style('transition', 'all 0.3s ease').style('animation', 'floaty 3s ease-in-out infinite');
    
    nodeA.append('circle')
      .attr('cx', x1)
      .attr('cy', y1)
      .attr('r', 20 + currentData.a * 40)
      .attr('fill', `rgba(147, 197, 253, ${0.4 + currentData.a * 0.6})`)
      .attr('stroke', '#BAE6FD')
      .attr('stroke-width', 2);

    nodeA.append('text')
      .attr('x', x1)
      .attr('y', y1)
      .attr('text-anchor', 'middle')
      .attr('dy', 4)
      .attr('class', 'fill-slate-700 font-semibold text-base')
      .text('A');

    nodeA.append('text')
      .attr('id', 'prA')
      .attr('x', x1)
      .attr('y', y1 + 30)  // 增加垂直间距，避开边的显示区域
      .attr('text-anchor', 'middle')
      .attr('class', 'text-xs fill-slate-500')
      .attr('stroke', '#ffffff')  // 添加白色描边
      .attr('stroke-width', '2px')  // 增加描边宽度，防止被线条遮挡
      .attr('paint-order', 'stroke')  // 确保描边在填充下方
      .attr('stroke-linejoin', 'round')  // 描边角圆滑
      .attr('stroke-linecap', 'round')  // 描边线端圆滑
      .style('font-weight', '700')  // 加粗字体
      .text(currentData.a.toFixed(2));  // 简化显示，只显示数值

    // 节点B
    const nodeB = svg.append('g')
      .attr('id', 'nodeB')
      .style('transition', 'all 0.3s ease')
      .style('animation', 'floaty 3s ease-in-out infinite')
      .style('animation-delay', '1.2s');
    
    nodeB.append('circle')
      .attr('cx', x2)
      .attr('cy', y2)
      .attr('r', 20 + currentData.b * 40)
      .attr('fill', `rgba(147, 197, 253, ${0.4 + currentData.b * 0.6})`)
      .attr('stroke', '#93C5FD')
      .attr('stroke-width', 2);

    nodeB.append('text')
      .attr('x', x2)
      .attr('y', y2)
      .attr('text-anchor', 'middle')
      .attr('dy', 4)
      .attr('class', 'fill-slate-700 font-semibold text-base')
      .text('B');

    nodeB.append('text')
      .attr('id', 'prB')
      .attr('x', x2)
      .attr('y', y2 + 30)  // 增加垂直间距，避开边的显示区域
      .attr('text-anchor', 'middle')
      .attr('class', 'text-xs fill-slate-500')
      .attr('stroke', '#ffffff')  // 添加白色描边
      .attr('stroke-width', '2px')  // 增加描边宽度，防止被线条遮挡
      .attr('paint-order', 'stroke')  // 确保描边在填充下方
      .attr('stroke-linejoin', 'round')  // 描边角圆滑
      .attr('stroke-linecap', 'round')  // 描边线端圆滑
      .style('font-weight', '700')  // 加粗字体
      .text(currentData.b.toFixed(2));  // 简化显示，只显示数值

  }, [currentStep]);

  return (
    <div className="w-full h-full flex items-center justify-center">
      <svg 
        ref={svgRef} 
        id="demoSvg"
        className="w-full h-full"
      ></svg>
    </div>
  );
};

export default PageRankAnimation;