import React, { useMemo, useRef, useState } from "react";
import { useChatContext } from "../context/ChatContext";
import type { ModelInfo } from "../../../core/types";

interface Props {
  models?: ModelInfo[];
}

export const InputArea: React.FC<Props> = ({ models }) => {
  const { send, streaming, attachments, setAttachments } = useChatContext();
  const [value, setValue] = useState("");
  const [selectedModelId, setSelectedModelId] = useState<string | undefined>(models?.[0]?.id);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

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
    <div className="border-t theme-border p-3 space-y-2 theme-bg-tertiary">
      <div className="flex items-center gap-2">
        {models?.length ? (
          <select
            value={selectedModelId}
            onChange={(e) => setSelectedModelId(e.target.value)}
            className="text-xs px-2 py-1 rounded theme-input bg-transparent"
          >
            {models.map((m) => (
              <option key={m.id} value={m.id}>
                {m.displayName || m.id}
              </option>
            ))}
          </select>
        ) : null}
        <button
          className="px-2 py-1 text-xs theme-button theme-hover rounded"
          onClick={() => fileInputRef.current?.click()}
        >
          Attach
        </button>
        <input
          ref={fileInputRef}
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
            e.target.value = "";
          }}
          className="hidden"
        />
        {attachments.length > 0 && (
          <div className="text-[11px] theme-text-muted">
            {attachments.length} file{attachments.length > 1 ? "s" : ""} attached
          </div>
        )}
      </div>
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={streaming ? "Streaming response..." : "Type a message or drop files..."}
        rows={3}
        className={`chat-input-textarea w-full theme-input text-sm rounded-lg pl-4 pr-20 py-3 focus:outline-none border-0 resize-none ${
          streaming ? "opacity-70 cursor-not-allowed" : ""
        }`}
        disabled={streaming}
      />
      <div className="flex items-center gap-2 justify-end">
        <button
          onClick={onSend}
          disabled={streaming || !value.trim()}
          className="px-3 py-1.5 rounded theme-button-primary text-sm font-semibold disabled:opacity-50"
        >
          {streaming ? "Sending..." : "Send"}
        </button>
      </div>
    </div>
  );
};
