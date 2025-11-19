import React, { useState } from "react";
import { Modal } from "../../../primitives/Modal";
import { Button } from "../../../primitives/Button";
import { AutosizeTextarea } from "../../../primitives/AutosizeTextarea";

interface PromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (prompt: string) => void;
  title?: string;
  placeholder?: string;
  initialValue?: string;
}

export const PromptModal: React.FC<PromptModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  title = "Enter Prompt",
  placeholder = "Type your prompt here...",
  initialValue = "",
}) => {
  const [value, setValue] = useState(initialValue);

  const handleSubmit = () => {
    if (value.trim()) {
      onSubmit(value);
      setValue("");
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="md">
      <div className="space-y-4">
        <AutosizeTextarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          className="w-full bg-gray-800 border border-gray-700 rounded 
            px-3 py-2 text-sm"
          rows={4}
        />
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            variant="primary" 
            onClick={handleSubmit}
            disabled={!value.trim()}
          >
            Submit
          </Button>
        </div>
      </div>
    </Modal>
  );
};
