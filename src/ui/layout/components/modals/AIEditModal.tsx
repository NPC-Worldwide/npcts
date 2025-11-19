import React, { useState } from "react";
import { Modal } from "../../../primitives/Modal";
import { Button } from "../../../primitives/Button";
import { Select } from "../../../primitives/Select";
import { AutosizeTextarea } from "../../../primitives/AutosizeTextarea";

interface AIEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (action: string, customPrompt?: string) => void;
  selectedText: string;
}

const editActions = [
  { value: "improve", label: "Improve Writing" },
  { value: "fix", label: "Fix Grammar" },
  { value: "simplify", label: "Simplify" },
  { value: "expand", label: "Expand" },
  { value: "summarize", label: "Summarize" },
  { value: "custom", label: "Custom Prompt" },
];

export const AIEditModal: React.FC<AIEditModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  selectedText,
}) => {
  const [action, setAction] = useState("improve");
  const [customPrompt, setCustomPrompt] = useState("");

  const handleSubmit = () => {
    onSubmit(action, action === "custom" ? customPrompt : undefined);
    setAction("improve");
    setCustomPrompt("");
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="AI Edit" size="md">
      <div className="space-y-4">
        <div className="bg-gray-800 border border-gray-700 rounded p-3 
          max-h-40 overflow-auto">
          <div className="text-xs text-gray-400 mb-1">Selected Text:</div>
          <div className="text-sm">{selectedText}</div>
        </div>

        <Select
          label="Action"
          options={editActions}
          value={action}
          onChange={(e) => setAction(e.target.value)}
        />

        {action === "custom" && (
          <AutosizeTextarea
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            placeholder="Describe what you want to do..."
            className="w-full bg-gray-800 border border-gray-700 rounded 
              px-3 py-2 text-sm"
            rows={3}
          />
        )}

        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            variant="primary" 
            onClick={handleSubmit}
            disabled={action === "custom" && !customPrompt.trim()}
          >
            Apply
          </Button>
        </div>
      </div>
    </Modal>
  );
};
