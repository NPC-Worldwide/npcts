import React from 'react';

interface NetworkStats {
  density?: number;
  avg_degree?: number;
  node_degrees?: Record<string, number>;
}

interface KGStatsProps {
  nodeCount: number;
  linkCount: number;
  networkStats?: NetworkStats;
}

export const KGStats: React.FC<KGStatsProps> = ({
  nodeCount,
  linkCount,
  networkStats
}) => {
  return (
    <div className="p-3 bg-gray-800 rounded space-y-1">
      <h5 className="font-semibold text-sm mb-2">Current View Stats</h5>
      <p className="text-xs text-gray-400">
        Nodes: <span className="font-bold text-white">{nodeCount}</span>
      </p>
      <p className="text-xs text-gray-400">
        Links: <span className="font-bold text-white">{linkCount}</span>
      </p>
      {networkStats && (
        <>
          {networkStats.density !== undefined && (
            <p className="text-xs text-gray-400">
              Density: <span className="font-bold text-white">
                {networkStats.density.toFixed(4)}
              </span>
            </p>
          )}
          {networkStats.avg_degree !== undefined && (
            <p className="text-xs text-gray-400">
              Avg Degree: <span className="font-bold text-white">
                {networkStats.avg_degree.toFixed(2)}
              </span>
            </p>
          )}
        </>
      )}
    </div>
  );
};
