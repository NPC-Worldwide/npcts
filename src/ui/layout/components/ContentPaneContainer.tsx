import React, { memo, useCallback } from "react";
import type { ContentNode } from "../../../core/layout";
import { useLayout } from "../context/LayoutContext";
import { PaneHeader } from "./PaneHeader";
import { CodeEditor } from "../../viewers/components/CodeEditor";
import { Terminal } from "../../viewers/components/Terminal";
import { BrowserViewer } from "../../viewers/components/BrowserViewer";
import { PdfViewer } from "../../viewers/components/PdfViewer";
import { CsvViewer } from "../../viewers/components/CsvViewer";
import { ImageViewer } from "../../viewers/components/ImageViewer";
import { 
  File, 
  MessageSquare, 
  Terminal as TerminalIcon, 
  Globe,
  FileText,
  Image as ImageIcon,
  FileSpreadsheet,
} from "lucide-react";

interface ContentPaneContainerProps {
  node: ContentNode;
  path: number[];
}

export const ContentPaneContainer: React.FC<ContentPaneContainerProps> = 
  memo(({ node, path }) => {
  const {
    contentDataRef,
    activeContentPaneId,
    setActiveContentPaneId,
    draggedItem,
    setDraggedItem,
    paneContextMenu,
    setPaneContextMenu,
    closeContentPane,
    findNodePath,
    rootLayoutNode,
  } = useLayout();

  const paneData = contentDataRef.current[node.id];
  const contentType = paneData?.contentType;
  const contentId = paneData?.contentId;
  const isActive = node.id === activeContentPaneId;

  let headerIcon = <File size={14} className="text-gray-400" />;
  let headerTitle = "Empty Pane";

  if (contentType === "chat") {
    headerIcon = <MessageSquare size={14} />;
    headerTitle = `Conversation: ${contentId?.slice(-8) || "None"}`;
  } else if (contentType === "editor") {
    headerIcon = <FileText size={14} />;
    headerTitle = contentId?.split("/").pop() || "Untitled";
  } else if (contentType === "terminal") {
    headerIcon = <TerminalIcon size={14} />;
    headerTitle = "Terminal";
  } else if (contentType === "browser") {
    headerIcon = <Globe size={14} />;
    headerTitle = paneData?.browserUrl || "Browser";
  } else if (contentType === "pdf") {
    headerIcon = <File size={14} />;
    headerTitle = contentId?.split("/").pop() || "PDF";
  } else if (contentType === "csv") {
    headerIcon = <FileSpreadsheet size={14} />;
    headerTitle = contentId?.split("/").pop() || "CSV";
  } else if (contentType === "image") {
    headerIcon = <ImageIcon size={14} />;
    headerTitle = contentId?.split("/").pop() || "Image";
  }

  const nodePath = findNodePath(rootLayoutNode, node.id);

  const handleEditorChange = useCallback((value: string) => {
    if (contentDataRef.current[node.id]) {
      contentDataRef.current[node.id].fileContent = value;
      contentDataRef.current[node.id].fileChanged = true;
    }
  }, [node.id, contentDataRef]);

  const handleEditorSave = useCallback(async () => {
    const data = contentDataRef.current[node.id];
    if (data?.contentId && data.fileContent !== undefined) {
      data.fileChanged = false;
    }
  }, [node.id, contentDataRef]);

  const handleTerminalCommand = useCallback((command: string) => {
    console.log(`Terminal ${node.id} command:`, command);
  }, [node.id]);

  const handleBrowserNavigate = useCallback((url: string) => {
    if (contentDataRef.current[node.id]) {
      contentDataRef.current[node.id].browserUrl = url;
    }
  }, [node.id, contentDataRef]);

  const renderContent = () => {
    switch (contentType) {
      case "chat":
        return (
          <div className="p-4 theme-text-muted">
            Chat view for: {contentId}
          </div>
        );

      case "editor":
        return (
          <CodeEditor
            value={paneData?.fileContent || ""}
            onChange={handleEditorChange}
            onSave={handleEditorSave}
            filePath={contentId}
          />
        );

      case "terminal":
        return (
          <Terminal
            terminalId={node.id}
            onCommand={handleTerminalCommand}
          />
        );

      case "browser":
        return (
          <BrowserViewer
            initialUrl={paneData?.browserUrl}
            viewId={node.id}
            onNavigate={handleBrowserNavigate}
          />
        );

      case "pdf":
        return (
          <PdfViewer
            filePath={contentId || ""}
            onTextSelect={(text) => console.log("PDF text:", text)}
          />
        );

      case "csv":
        return (
          <CsvViewer
            filePath={contentId || ""}
            data={paneData?.csvData}
          />
        );

      case "image":
        return (
          <ImageViewer
            filePath={contentId || ""}
            imageData={paneData?.imageData}
          />
        );

      default:
        return (
          <div className="p-4 theme-text-muted text-center">
            Drop content here
          </div>
        );
    }
  };

  return (
    <div
      className={`flex-1 flex flex-col theme-bg-secondary relative 
        ${isActive ? "ring-2 ring-blue-500" : ""}`}
      onClick={() => setActiveContentPaneId(node.id)}
    >
      <PaneHeader
        nodeId={node.id}
        icon={headerIcon}
        title={headerTitle}
        fileChanged={paneData?.fileChanged}
        findNodePath={findNodePath}
        rootLayoutNode={rootLayoutNode}
        setDraggedItem={setDraggedItem}
        setPaneContextMenu={setPaneContextMenu}
        closeContentPane={closeContentPane}
      />
      <div className="flex-1 min-h-0 overflow-hidden">
        {renderContent()}
      </div>
    </div>
  );
});

ContentPaneContainer.displayName = "ContentPaneContainer";
