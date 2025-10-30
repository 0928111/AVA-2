import React from 'react'
import PageRankVisualizer from '../components/visualizations/PageRankVisualizer'

const sampleNodes = [
  { id: 'A', value: 0.38 },
  { id: 'B', value: 0.24 },
  { id: 'C', value: 0.18 },
  { id: 'D', value: 0.20 }
]

const sampleLinks = [
  { source: 'A', target: 'B' },
  { source: 'A', target: 'C' },
  { source: 'B', target: 'C' },
  { source: 'C', target: 'A' },
  { source: 'D', target: 'A' }
]

export default function PageRankPage() {
  return (
    <div className="pagerank-page">
      <h2>PageRank 可视化（示例）</h2>
      <PageRankVisualizer nodes={sampleNodes} links={sampleLinks} />
    </div>
  )
}
