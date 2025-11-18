export type SplitDirection = "horizontal" | "vertical";

export interface ContentPane {
  id: string;
  kind: string;
  title?: string;
  meta?: Record<string, unknown>;
}

export interface SplitNode {
  id: string;
  type: "split";
  direction: SplitDirection;
  sizes: number[];
  children: LayoutNode[];
}

export interface ContentNode {
  id: string;
  type: "content";
  panes: ContentPane[];
  activePaneId?: string;
}

export type LayoutNode = SplitNode | ContentNode;

export interface LayoutManager {
  root: LayoutNode;
  setRoot: (root: LayoutNode) => void;
  activatePane: (paneId: string) => void;
  closePane: (paneId: string) => void;
  splitPane: (paneId: string, direction: SplitDirection, newPane: ContentPane) => void;
  movePane: (paneId: string, targetNodeId: string) => void;
}
