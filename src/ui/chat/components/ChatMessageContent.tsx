import React, { useState } from "react";
import { ChevronDown, ChevronRight, Paperclip, Wrench } from "lucide-react";
import { Markdown } from "../../markdown/Markdown";

export interface ChatAttachment {
  id?: string;
  name?: string;
  path?: string;
  preview?: string;
  data?: string;
  blob?: Blob;
  type?: string;
  mime?: string;
  size?: number;
  sizeBytes?: number;
  [key: string]: any;
}

export interface ChatMessagePart {
  type?: string;
  content?: string;
  call?: any;
  [key: string]: any;
}

export interface ChatMessageData {
  id?: string;
  role: "user" | "assistant" | "system" | "tool" | string;
  content?: string;
  contentParts?: ChatMessagePart[];
  reasoningContent?: string;
  toolCalls?: any[];
  attachments?: ChatAttachment[];
  isStreaming?: boolean;
  status?: string;
  type?: string;
  npc?: string;
  model?: string;
  provider?: string;
  input_tokens?: number;
  output_tokens?: number;
  cost?: number;
  temperature?: number;
  top_p?: number;
  top_k?: number;
  max_tokens?: number;
  jinxName?: string;
  timestamp?: string;
  [key: string]: any;
}

interface ChatMessageContentProps {
  message: ChatMessageData;
  renderMarkdown?: (content: string, message: ChatMessageData) => React.ReactNode;
  renderToolCall?: (tool: any, idx: number) => React.ReactNode;
  renderAttachments?: (attachments: ChatAttachment[], onOpenFile?: (path: string) => void) => React.ReactNode;
  onOpenFile?: (path: string) => void;
  className?: string;
}

const DefaultToolCall: React.FC<{ tool: any; idx: number }> = ({ tool, idx }) => {
  const [expanded, setExpanded] = useState(false);
  const funcName = tool.function?.name || tool.function_name || tool.name || tool.call?.function?.name || "tool";
  const args = tool.function?.arguments || tool.arguments || tool.call?.function?.arguments;
  const result = tool.result_preview || tool.result;
  const status = tool.status || "pending";
  const statusColor = status === "error" ? "border-red-500" : status === "complete" ? "border-green-500" : "border-blue-500";
  return (
    <div key={idx} className={`my-1.5 rounded-md border-l-2 ${statusColor} overflow-hidden`}>
      <div
        className="flex items-center gap-2 px-3 py-1.5 theme-bg-tertiary cursor-pointer hover:brightness-110 transition-all"
        onClick={() => setExpanded(!expanded)}
      >
        <Wrench size={12} className="text-blue-400 flex-shrink-0" />
        <span className="text-sm font-semibold text-blue-400 flex-shrink-0">{funcName}</span>
        {expanded ? <ChevronDown size={14} className="theme-text-muted flex-shrink-0" /> : <ChevronRight size={14} className="theme-text-muted flex-shrink-0" />}
      </div>
      {expanded && (
        <div className="px-3 py-2 theme-bg-primary border-t border-[var(--border-color,#313244)]">
          {args && (
            <pre className="theme-bg-tertiary p-2 rounded text-xs overflow-x-auto my-1 theme-text-secondary max-h-32 overflow-y-auto">
              {typeof args === "string" ? args : JSON.stringify(args, null, 2)}
            </pre>
          )}
          {result !== undefined && (
            <pre className="theme-bg-tertiary p-2 rounded text-xs overflow-x-auto my-1 theme-text-secondary max-h-48 overflow-y-auto">
              {typeof result === "string" ? result : JSON.stringify(result, null, 2)}
            </pre>
          )}
        </div>
      )}
    </div>
  );
};

const DefaultAttachments: React.FC<{ attachments: ChatAttachment[]; onOpenFile?: (path: string) => void }> = ({ attachments, onOpenFile }) => {
  if (!attachments.length) return null;
  return (
    <div className="mt-2 flex flex-wrap gap-2 border-t theme-border pt-2">
      {attachments.map((attachment, idx) => {
        const name = attachment.name || `attachment-${idx}`;
        const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(name);
        const isPdf = /\.pdf$/i.test(name);
        const isClickable = !!attachment.path;
        const imageSrc = attachment.preview || (attachment.path ? `media://${attachment.path}` : attachment.data);
        return (
          <div
            key={attachment.id || idx}
            className={`text-xs theme-bg-tertiary rounded px-2 py-1 flex items-center gap-1 ${isClickable ? "cursor-pointer hover:bg-blue-500/20" : ""}`}
            onDoubleClick={() => isClickable && onOpenFile?.(attachment.path!)}
            title={isClickable ? `Double-click to open: ${attachment.path}` : name}
          >
            <Paperclip size={12} className="flex-shrink-0" />
            <span className="truncate">{name}</span>
            {isImage && imageSrc && <img src={imageSrc} alt={name} className="mt-1 max-w-[100px] max-h-[100px] rounded-md object-cover" />}
            {isPdf && <span className="ml-1 text-red-400 text-[10px]">PDF</span>}
          </div>
        );
      })}
    </div>
  );
};

export const ChatMessageContent: React.FC<ChatMessageContentProps> = ({
  message,
  renderMarkdown,
  renderToolCall,
  renderAttachments,
  onOpenFile,
  className,
}) => {
  const [expandedReasoning, setExpandedReasoning] = useState<Set<number | string>>(new Set());
  const toggleReasoning = (key: number | string) => {
    setExpandedReasoning((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const showStreaming = !!message.isStreaming;
  const hasContentParts = message.contentParts && message.contentParts.length > 0;

  const renderBody = (content: string) => {
    if (renderMarkdown) return renderMarkdown(content, message);
    return <Markdown content={content || ""} />;
  };

  const renderReasoning = (content: string, key: number | string) => {
    const isExpanded = expandedReasoning.has(key);
    return (
      <div key={`reasoning-${key}`} className="mb-3 rounded-md border-l-2 border-yellow-500 overflow-hidden">
        <div
          className="flex items-center gap-2 px-3 py-1.5 theme-bg-tertiary cursor-pointer hover:brightness-110 transition-all"
          onClick={() => toggleReasoning(key)}
        >
          <span className="text-xs text-yellow-400 font-semibold">Thinking Process:</span>
          {isExpanded ? <ChevronDown size={14} className="theme-text-muted flex-shrink-0" /> : <ChevronRight size={14} className="theme-text-muted flex-shrink-0" />}
        </div>
        {isExpanded && (
          <div className="px-3 py-2 theme-bg-primary border-t border-[var(--border-color,#313244)]">
            <div className="prose prose-sm prose-invert max-w-none theme-text-secondary text-sm">{renderBody(content)}</div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={className}>
      {message.reasoningContent && !hasContentParts && renderReasoning(message.reasoningContent, -1)}

      {hasContentParts ? (
        <>
          {message.contentParts!.map((part, idx) => {
            if (!part) return null;
            if (part.type === "text") {
              return (
                <div key={idx} className="prose prose-sm prose-invert max-w-none theme-text-primary">
                  {renderBody(part.content || "")}
                </div>
              );
            }
            if (part.type === "tool_call") {
              const tool = part.call || part;
              return renderToolCall ? renderToolCall(tool, idx) : <DefaultToolCall key={idx} tool={tool} idx={idx} />;
            }
            if (part.type === "reasoning") {
              return renderReasoning(part.content || "", idx);
            }
            return null;
          })}
          {showStreaming && message.type !== "error" && (
            <span className="ml-1 inline-block w-0.5 h-4 theme-text-primary animate-pulse stream-cursor" />
          )}
        </>
      ) : (
        <>
          <div className="prose prose-sm prose-invert max-w-none theme-text-primary">
            {renderBody(message.content || "")}
            {showStreaming && message.type !== "error" && (
              <span className="ml-1 inline-block w-0.5 h-4 theme-text-primary animate-pulse stream-cursor" />
            )}
          </div>
        </>
      )}

      {message.toolCalls && message.toolCalls.length > 0 && (
        <div className="mt-2">
          {message.toolCalls.map((tool, idx) => (renderToolCall ? renderToolCall(tool, idx) : <DefaultToolCall key={idx} tool={tool} idx={idx} />))}
        </div>
      )}

      {message.attachments && message.attachments.length > 0 &&
        (renderAttachments ? renderAttachments(message.attachments, onOpenFile) : <DefaultAttachments attachments={message.attachments} onOpenFile={onOpenFile} />)}
    </div>
  );
};
