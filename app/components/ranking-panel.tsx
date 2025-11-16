import React from "react";
import styles from "./home.module.scss";

interface Node {
  id: string;
  label?: string;
  rank: number;
}

interface GraphData {
  nodes: Node[];
  links?: any[];
}

interface RankingPanelProps {
  graphData: GraphData;
}

const TOTAL_VISITORS = 100;

const RankingPanel: React.FC<RankingPanelProps> = ({ graphData }) => {
  // 按rank值从高到低排序
  const sortedNodes = React.useMemo(() => {
    if (!graphData?.nodes) return [];
    return [...graphData.nodes].sort((a, b) => b.rank - a.rank);
  }, [graphData]);

  return (
    <div className={styles["ranking-panel"]}>
      <h3 className={styles["ranking-title"]}>网页排名</h3>
      <div className={styles["ranking-list"]}>
        {sortedNodes.map((node, index) => (
          <div key={node.id} className={styles["ranking-item"]}>
            <span className={styles["rank-number"]}>{index + 1}.</span>
            <span className={styles["node-label"]}>
              {node.label || node.id}
            </span>
            <span className={styles["node-votes"]}>
              {Math.round(node.rank * TOTAL_VISITORS)}票
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RankingPanel;
