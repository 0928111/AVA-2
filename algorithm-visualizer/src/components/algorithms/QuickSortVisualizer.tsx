import React from 'react';

interface QuickSortVisualizerProps {
  data: number[];
  maxidx: number;
  compareidx?: number;
}

export const QuickSortVisualizer: React.FC<QuickSortVisualizerProps> = ({ data, maxidx, compareidx }) => {
  return (
    <div className="quick-sort-visualizer">
      <h3>QuickSort Visualizer</h3>
      <div>Data: {data.join(', ')}</div>
      <div>Max Index: {maxidx}</div>
      {compareidx !== undefined && <div>Compare Index: {compareidx}</div>}
    </div>
  );
};