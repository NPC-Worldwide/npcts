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

/**
 * Find a node in the layout tree by following a path of indices
 * @param node - The root layout node to search from
 * @param path - Array of child indices to follow
 * @returns The node at the specified path, or null if not found
 */
export const findNodeByPath = (node: LayoutNode | null, path: number[]): LayoutNode | null => {
    if (!node || !path) return null;
    let currentNode: LayoutNode | null = node;
    for (const index of path) {
        if (currentNode && currentNode.type === 'split' && currentNode.children && currentNode.children[index]) {
            currentNode = currentNode.children[index];
        } else {
            return null;
        }
    }
    return currentNode;
};

/**
 * Find the path to a node with the given ID in the layout tree
 * @param node - The root layout node to search from
 * @param id - The ID of the node to find
 * @param currentPath - The current path (used internally for recursion)
 * @returns Array of indices representing the path to the node, or null if not found
 */
export const findNodePath = (node: LayoutNode | null, id: string, currentPath: number[] = []): number[] | null => {
    if (!node) return null;
    if (node.id === id) return currentPath;
    if (node.type === 'split') {
        for (let i = 0; i < node.children.length; i++) {
            const result = findNodePath(node.children[i], id, [...currentPath, i]);
            if (result) return result;
        }
    }
    return null;
};
