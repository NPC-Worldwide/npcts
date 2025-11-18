import React from "react";
import type { Conversation } from "../../../core/chat";
import { cn } from "../../utils/cn";

interface Props {
  conversations: Conversation[];
  activeId?: string;
  onSelect: (id: string) => void;
  onCreate: () => void;
  onDelete: (id: string) => void;
  loading?: boolean;
}

export const ConversationList: React.FC<Props> = ({
  conversations,
  activeId,
  onSelect,
  onCreate,
  onDelete,
  loading,
}) => {
  return (
    <div className="flex flex-col h-full border-r border-gray-200 dark:border-gray-800">
      <div className="p-3 flex items-center justify-between gap-2">
        <div className="text-sm font-semibold">Conversations</div>
        <button
          onClick={onCreate}
          className="text-xs px-2 py-1 rounded bg-blue-600 text-white hover:bg-blue-500"
          disabled={loading}
        >
          New
        </button>
      </div>
      <div className="flex-1 overflow-y-auto">
        {conversations.map((c) => (
          <div
            key={c.id}
            className={cn(
              "px-3 py-2 cursor-pointer flex items-center justify-between text-sm hover:bg-gray-100 dark:hover:bg-gray-800",
              activeId === c.id ? "bg-gray-100 dark:bg-gray-800 font-semibold" : "",
            )}
            onClick={() => onSelect(c.id)}
          >
            <div className="truncate">{c.title || c.id}</div>
            <button
              className="text-xs text-red-500 hover:text-red-400"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(c.id);
              }}
            >
              Delete
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
