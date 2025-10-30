import React, { useMemo } from 'react'

type Node = { id: string; value: number; x?: number; y?: number }
type Link = { source: string; target: string }

// 简单静态 PageRank 可视化占位（使用 SVG）
export default function PageRankVisualizer({
  nodes = [],
  links = []
}: {
  nodes?: Node[]
  links?: Link[]
}) {
  const w = 800
  const h = 500

  // 计算节点半径（根据 value）
  const maxVal = useMemo(() => Math.max(1, ...(nodes.map((n) => n.value || 1))), [nodes])

  return (
    <svg width={w} height={h} style={{ background: '#fff' }}>
      {/* links */}
      <g stroke="#666" strokeOpacity={0.5}>
        {links.map((l, i) => {
          const s = nodes.find((n) => n.id === l.source)
          const t = nodes.find((n) => n.id === l.target)
          const sx = s?.x ?? (Math.random() * w * 0.8 + 40)
          const sy = s?.y ?? (Math.random() * h * 0.8 + 20)
          const tx = t?.x ?? (Math.random() * w * 0.8 + 40)
          const ty = t?.y ?? (Math.random() * h * 0.8 + 20)
          return <line key={i} x1={sx} y1={sy} x2={tx} y2={ty} />
        })}
      </g>

      {/* nodes */}
      <g>
        {nodes.map((n, i) => {
          const x = n.x ?? (Math.random() * w * 0.8 + 40)
          const y = n.y ?? (Math.random() * h * 0.8 + 20)
          const r = 8 + (n.value / maxVal) * 18
          return (
            <g key={n.id} transform={`translate(${x},${y})`}>
              <circle r={r} fill="#2b7cff" fillOpacity={0.85} stroke="#0b3d91" />
              <text x={r + 6} y={4} fontSize={12} fill="#222">
                {n.id} ({n.value.toFixed(2)})
              </text>
            </g>
          )
        })}
      </g>
    </svg>
  )
}
