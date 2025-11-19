import React, { useState } from "react";
import { Modal } from "../../../primitives/Modal";
import { Button } from "../../../primitives/Button";
import { Select } from "../../../primitives/Select";

interface ResendModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (model: string, npc?: string) => void;
  availableModels?: Array<{ value: string; label: string }>;
  availableNPCs?: Array<{ value: string; label: string }>;
}

export const ResendModal: React.FC<ResendModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  availableModels = [],
  availableNPCs = [],
}) => {
  const [selectedModel, setSelectedModel] = useState(
    availableModels[0]?.value || ""
  );
  const [selectedNPC, setSelectedNPC] = useState("");

  const handleSubmit = () => {
    onSubmit(selectedModel, selectedNPC || undefined);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Resend Message" size="sm">
      <div className="space-y-4">
        <Select
          label="Model"
          options={availableModels}
          value={selectedModel}
          onChange={(e) => setSelectedModel(e.target.value)}
        />

        {availableNPCs.length > 0 && (
          <Select
            label="NPC (optional)"
            options={[
              { value: "", label: "None" },
              ...availableNPCs,
            ]}
            value={selectedNPC}
            onChange={(e) => setSelectedNPC(e.target.value)}
          />
        )}

        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            variant="primary" 
            onClick={handleSubmit}
            disabled={!selectedModel}
          >
            Resend
          </Button>
        </div>
      </div>
    </Modal>
  );
};
