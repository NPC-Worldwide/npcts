import React, { useRef } from 'react';
import ForceGraph2D from 'react-force-graph-2d';

export interface GraphNode {
  id: string;
  type: string;
  community?: number;
}

export interface GraphLink {
  source: string;
  target: string;
  weight?: number;
}

interface KnowledgeGraphViewerProps {
  nodes: GraphNode[];
  links: GraphLink[];
  width?: number;
  height?: number;
  getNodeColor?: (node: GraphNode) => string;
  getNodeSize?: (node: GraphNode) => number;
  getLinkWidth?: (link: GraphLink) => number;
}

export const KnowledgeGraphViewer: React.FC<KnowledgeGraphViewerProps> = ({
  nodes,
  links,
  width = 800,
  height = 384,
  getNodeColor,
  getNodeSize,
  getLinkWidth
}) => {
  const graphRef = useRef();

  const defaultNodeColor = (node: GraphNode) => {
    return node.type === 'concept' ? '#a855f7' : '#3b82f6';
  };

  const defaultNodeSize = (node: GraphNode) => {
    return node.type === 'concept' ? 6 : 4;
  };

  const defaultLinkWidth = (link: GraphLink) => {
    return link.weight ? Math.min(5, link.weight / 2) : 1;
  };

  return (
    <div className="bg-gray-900 rounded overflow-hidden">
      <ForceGraph2D
        ref={graphRef}
        graphData={{ nodes, links }}
        nodeLabel="id"
        nodeVal={getNodeSize || defaultNodeSize}
        nodeColor={getNodeColor || defaultNodeColor}
        linkWidth={getLinkWidth || defaultLinkWidth}
        linkDirectionalParticles={1}
        linkDirectionalParticleWidth={2}
        linkColor={() => 'rgba(255,255,255,0.2)'}
        width={width}
        height={height}
        backgroundColor="transparent"
      />
    </div>
  );
};
