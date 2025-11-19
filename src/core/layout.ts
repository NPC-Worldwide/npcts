export type SplitDirection = 'horizontal' | 'vertical';

export interface SplitNode {
  type: 'split';
  id: string;
  direction: SplitDirection;
  children: LayoutNode[];
  sizes: number[];
}

export interface ContentNode {
  type: 'content';
  id: string;
  contentType: string;
  data?: any;
}

export type LayoutNode = SplitNode | ContentNode;
