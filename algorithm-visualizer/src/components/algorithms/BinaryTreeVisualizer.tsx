import React from 'react';

interface BinaryTreeVisualizerProps {
  data: number[];
  maxidx: number;
  compareidx?: number;
}

export const BinaryTreeVisualizer: React.FC<BinaryTreeVisualizerProps> = ({ data, maxidx, compareidx }) => {
  return (
    <div className="binary-tree-visualizer">
      <h3>Binary Tree Visualizer</h3>
      <div>Data: {data.join(', ')}</div>
      <div>Max Index: {maxidx}</div>
      {compareidx !== undefined && <div>Compare Index: {compareidx}</div>}
    </div>
  );
};