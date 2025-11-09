import React from 'react';

interface PageRankVisualizerProps {
  data: number[];
  maxidx: number;
  compareidx?: number;
}

export const PageRankVisualizer: React.FC<PageRankVisualizerProps> = ({ data, maxidx, compareidx }) => {
  return (
    <div className="page-rank-visualizer">
      <h3>PageRank Visualizer</h3>
      <div>Data: {data.join(', ')}</div>
      <div>Max Index: {maxidx}</div>
      {compareidx !== undefined && <div>Compare Index: {compareidx}</div>}
    </div>
  );
};