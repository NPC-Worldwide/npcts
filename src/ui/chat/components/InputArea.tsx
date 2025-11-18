import React, { useMemo, useState } from "react";
import { useChatContext } from "../context/ChatContext";
import type { ModelInfo } from "../../../core/types";

interface Props {
  models?: ModelInfo[];
}

export const InputArea: React.FC<Props> = ({ models }) => {
  const { send, streaming, attachments, setAttachments } = useChatContext();
  const [value, setValue] = useState("");
  const [selectedModelId, setSelectedModelId] = useState<string | undefined>(
    models?.[0]?.id ?? undefined,
  );

  const selectedModel = useMemo(
    () => models?.find((m) => m.id === selectedModelId) ?? selectedModelId ?? "",
    [models, selectedModelId],
  );

  const onSend = async () => {
    if (!value.trim()) return;
    await send({
      prompt: value,
      model: selectedModel || "",
      attachments,
      stream: true,
    });
    setValue("");
    setAttachments([]);
  };

  return (
    <div className="border-t border-gray-200 dark:border-gray-800 p-3 space-y-2">
      {models?.length ? (
        <select
          value={selectedModelId}
          onChange={(e) => setSelectedModelId(e.target.value)}
          className="text-xs px-2 py-1 rounded border border-gray-300 dark:border-gray-700 bg-transparent"
        >
          {models.map((m) => (
            <option key={m.id} value={m.id}>
              {m.displayName || m.id}
            </option>
          ))}
        </select>
      ) : null}
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Message..."
        rows={3}
        className="w-full resize-none rounded border border-gray-300 dark:border-gray-700 bg-transparent px-3 py-2 text-sm"
      />
      <div className="flex items-center gap-2">
        <button
          onClick={onSend}
          disabled={streaming || !value.trim()}
          className="px-3 py-1 rounded bg-blue-600 text-white text-sm hover:bg-blue-500 disabled:opacity-50"
        >
          {streaming ? "Sending..." : "Send"}
        </button>
        <input
          type="file"
          multiple
          onChange={(e) => {
            const files = e.target.files;
            if (!files) return;
            const next = Array.from(files).map((f) => ({
              id: `${f.name}-${f.size}-${f.lastModified}`,
              name: f.name,
              path: (f as any).path || f.name,
              sizeBytes: f.size,
            }));
            setAttachments((prev) => [...prev, ...next]);
          }}
          className="text-xs"
        />
      </div>
    </div>
  );
};
