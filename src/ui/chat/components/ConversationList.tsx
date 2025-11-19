import React, { useMemo, useState } from "react";
import { File, ChevronRight } from "lucide-react";
import type { Conversation } from "../../../core/chat";
import { cn } from "../../utils/cn";

type ConversationWithTimestamps = Conversation & {
  timestamp?: string;
  last_message_timestamp?: string;
};

type Props = {
  conversations?: ConversationWithTimestamps[] | null;
  activeConversationId?: string | null;
  currentFile?: string | null;
  conversationsCollapsed?: boolean;
  onToggleCollapse?: (collapsed: boolean) => void;
  selectedConvos?: Set<string> | null;
  onSelectedConvosChange?: (set: Set<string>) => void;
  lastClickedIndex?: number | null;
  onLastClickedIndexChange?: (index: number | null) => void;
  onConversationSelect?: (id: string) => void;
  onRefresh?: () => void;
  onConversationContextMenu?: (pos: { x: number; y: number }) => void;
  onConversationDragStart?: (e: React.DragEvent, conversation: ConversationWithTimestamps) => void;
  onConversationDragEnd?: (e: React.DragEvent, conversation: ConversationWithTimestamps) => void;
  loading?: boolean;
};

export const ConversationList: React.FC<Props> = ({
  conversations,
  activeConversationId = null,
  currentFile = null,
  conversationsCollapsed,
  onToggleCollapse,
  selectedConvos,
  onSelectedConvosChange,
  lastClickedIndex,
  onLastClickedIndexChange,
  onConversationSelect,
  onRefresh,
  onConversationContextMenu,
  onConversationDragStart,
  onConversationDragEnd,
  loading,
}) => {
  const [internalCollapsed, setInternalCollapsed] = useState(false);
  const collapsed = conversationsCollapsed ?? internalCollapsed;
  const toggleCollapsed = () => {
    const next = !collapsed;
    onToggleCollapse ? onToggleCollapse(next) : setInternalCollapsed(next);
  };

  const [localSelected, setLocalSelected] = useState<Set<string>>(new Set());
  const selected = selectedConvos ?? localSelected;
  const setSelected = (s: Set<string>) => {
    onSelectedConvosChange ? onSelectedConvosChange(s) : setLocalSelected(s);
  };

  const [localLastIndex, setLocalLastIndex] = useState<number | null>(null);
  const lastIndex = lastClickedIndex ?? localLastIndex;
  const setLastIndex = (i: number | null) => {
    onLastClickedIndexChange ? onLastClickedIndexChange(i) : setLocalLastIndex(i);
  };

  const convArray = useMemo(() => {
    if (!Array.isArray(conversations)) return [];
    return [...conversations].sort((a, b) => {
      const aTimestamp = new Date((a as ConversationWithTimestamps).last_message_timestamp || (a as ConversationWithTimestamps).timestamp || 0).getTime();
      const bTimestamp = new Date((b as ConversationWithTimestamps).last_message_timestamp || (b as ConversationWithTimestamps).timestamp || 0).getTime();
      return bTimestamp - aTimestamp;
    });
  }, [conversations]);

  const header = (
    <div className="flex items-center justify-between px-4 py-2 mt-4">
      <div className="text-xs text-gray-500 font-medium">Conversations ({convArray.length})</div>
      <div className="flex items-center gap-1">
        {onRefresh && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRefresh();
            }}
            className="p-1 theme-hover rounded-full transition-all"
            title="Refresh conversations"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.44-4.5M22 12.5a10 10 0 0 1-18.44 4.5" />
            </svg>
          </button>
        )}
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleCollapsed();
          }}
          className="p-1 theme-hover rounded-full transition-all"
          title={collapsed ? "Expand conversations" : "Collapse conversations"}
        >
          <ChevronRight size={16} className={`transform transition-transform ${collapsed ? "" : "rotate-90"}`} />
        </button>
      </div>
    </div>
  );

  if (!convArray.length) {
    return (
      <div className="mt-4">
        {header}
        <div className="px-4 py-2 text-xs text-gray-500">No conversations.</div>
      </div>
    );
  }

  if (collapsed) {
    const activeConversation = activeConversationId ? convArray.find((c) => c.id === activeConversationId) : null;
    return (
      <div className="mt-4">
        {header}
        {activeConversation && !currentFile && (
          <div className="px-1 mt-1">
            <button
              key={activeConversation.id}
              onClick={() => onConversationSelect?.(activeConversation.id)}
              className="flex items-center gap-2 px-4 py-2 w-full theme-hover text-left rounded-lg transition-all duration-200 conversation-selected border-l-2 border-blue-500"
            >
              <File size={16} className="text-gray-400 flex-shrink-0" />
              <div className="flex flex-col overflow-hidden">
                <span className="text-sm truncate">{activeConversation.title || activeConversation.id}</span>
                <span className="text-xs text-gray-500">
                  {(activeConversation as ConversationWithTimestamps).timestamp
                    ? new Date((activeConversation as ConversationWithTimestamps).timestamp as string).toLocaleString()
                    : ""}
                </span>
              </div>
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="mt-4">
      {header}
      <div className="px-1">
        {convArray.map((conv, index) => {
          const isSelected = selected?.has(conv.id);
          const isActive = conv.id === activeConversationId && !currentFile;

          return (
            <button
              key={conv.id}
              draggable="true"
              onDragStart={(e) => {
                e.dataTransfer.effectAllowed = "copyMove";
                onConversationDragStart?.(e, conv);
              }}
              onDragEnd={(e) => onConversationDragEnd?.(e, conv)}
              onClick={(e) => {
                if (e.ctrlKey || e.metaKey) {
                  const next = new Set(selected || new Set<string>());
                  if (next.has(conv.id)) next.delete(conv.id);
                  else next.add(conv.id);
                  setSelected(next);
                  setLastIndex(index);
                } else if (e.shiftKey && lastIndex !== null) {
                  const next = new Set<string>();
                  const start = Math.min(lastIndex, index);
                  const end = Math.max(lastIndex, index);
                  for (let i = start; i <= end; i++) {
                    if (convArray[i]) next.add(convArray[i].id);
                  }
                  setSelected(next);
                } else {
                  setSelected(new Set([conv.id]));
                  onConversationSelect?.(conv.id);
                  setLastIndex(index);
                }
              }}
              onContextMenu={(e) => {
                e.preventDefault();
                if (!selected?.has(conv.id)) {
                  const next = new Set([conv.id]);
                  setSelected(next);
                }
                onConversationContextMenu?.({ x: e.clientX, y: e.clientY });
              }}
              className={cn(
                "flex items-center gap-2 px-4 py-2 w-full theme-hover text-left rounded-lg transition-all duration-200",
                isSelected || isActive ? "conversation-selected" : "theme-text-primary",
                isActive ? "border-l-2 border-blue-500" : "",
              )}
            >
              <File size={16} className="text-gray-400 flex-shrink-0" />
              <div className="flex flex-col overflow-hidden">
                <span className="text-sm truncate">{conv.title || conv.id}</span>
                <span className="text-xs text-gray-500">
                  {(conv as ConversationWithTimestamps).timestamp
                    ? new Date((conv as ConversationWithTimestamps).timestamp as string).toLocaleString()
                    : ""}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
