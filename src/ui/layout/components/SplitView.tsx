import React, { memo, useCallback } from "react";
import type { SplitNode } from "../../../core/layout";
import { useLayout } from "../context/LayoutContext";
import { LayoutNodeComponent } from "./LayoutNode";

interface SplitViewProps {
  node: SplitNode;
  path: number[];
}

export const SplitView: React.FC<SplitViewProps> = memo(({ 
  node, 
  path 
}) => {
  const { setRootLayoutNode, findNodeByPath } = useLayout();

  const handleResize = useCallback((e: React.MouseEvent, index: number) => {
    e.preventDefault();
    const startSizes = [...node.sizes];
    const isHorizontal = node.direction === "horizontal";
    const startPos = isHorizontal ? e.clientX : e.clientY;
    
    const target = e.currentTarget as HTMLElement;
    const container = target.parentElement;
    if (!container) return;
    
    const containerSize = isHorizontal 
      ? container.offsetWidth 
      : container.offsetHeight;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const currentPos = isHorizontal 
        ? moveEvent.clientX 
        : moveEvent.clientY;
      const deltaPercent = 
        ((currentPos - startPos) / containerSize) * 100;
      const newSizes = [...startSizes];
      const amount = Math.min(
        newSizes[index + 1] - 10,
        Math.max(-(newSizes[index] - 10), deltaPercent)
      );
      newSizes[index] += amount;
      newSizes[index + 1] -= amount;

      setRootLayoutNode((currentRoot) => {
        if (!currentRoot) return null;
        const newRoot = JSON.parse(JSON.stringify(currentRoot));
        const targetNode = findNodeByPath(newRoot, path);
        if (targetNode) targetNode.sizes = newSizes;
        return newRoot;
      });
    };

    const onMouseUp = () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  }, [node.sizes, node.direction, path, setRootLayoutNode, findNodeByPath]);

  return (
    <div
      className={`flex flex-1 ${
        node.direction === "horizontal" ? "flex-row" : "flex-col"
      } w-full h-full overflow-hidden`}
    >
      {node.children.map((child, index) => (
        <React.Fragment key={child.id}>
          <div
            className="flex overflow-hidden"
            style={{ flexBasis: `${node.sizes[index]}%` }}
          >
            <LayoutNodeComponent node={child} path={[...path, index]} />
          </div>
          {index < node.children.length - 1 && (
            <div
              className={`flex-shrink-0 ${
                node.direction === "horizontal"
                  ? "w-1 cursor-col-resize"
                  : "h-1 cursor-row-resize"
              } bg-gray-700 hover:bg-blue-500 transition-colors`}
              onMouseDown={(e) => handleResize(e, index)}
            />
          )}
        </React.Fragment>
      ))}
    </div>
  );
});

SplitView.displayName = "SplitView";
