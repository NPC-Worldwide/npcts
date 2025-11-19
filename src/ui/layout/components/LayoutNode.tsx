import React from "react";
import type { 
  LayoutNode as LayoutNodeType, 
  SplitNode,
  ContentNode 
} from "../../../core/layout";
import { SplitView } from "./SplitView";
import { ContentPaneContainer } from "./ContentPaneContainer";

interface LayoutNodeComponentProps {
  node: LayoutNodeType;
  path: number[];
}

export const LayoutNodeComponent: React.FC<LayoutNodeComponentProps> = ({
  node,
  path,
}) => {
  if (node.type === "split") {
    const splitNode = node as SplitNode;
    return <SplitView node={splitNode} path={path} />;
  }

  const contentNode = node as ContentNode;
  return <ContentPaneContainer node={contentNode} path={path} />;
};

export { LayoutNodeComponent as LayoutNode };