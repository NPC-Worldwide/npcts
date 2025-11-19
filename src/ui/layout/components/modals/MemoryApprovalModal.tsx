import React from "react";
import { Modal } from "../../../primitives/Modal";
import { Button } from "../../../primitives/Button";

interface MemoryItem {
  id: string;
  content: string;
  type: string;
}

interface MemoryApprovalModalProps {
  isOpen: boolean;
  onClose: () => void;
  memories: MemoryItem[];
  onApprove: (ids: string[]) => void;
  onReject: (ids: string[]) => void;
}

export const MemoryApprovalModal: React.FC<MemoryApprovalModalProps> = ({
  isOpen,
  onClose,
  memories,
  onApprove,
  onReject,
}) => {
  const handleApproveAll = () => {
    onApprove(memories.map((m) => m.id));
    onClose();
  };

  const handleRejectAll = () => {
    onReject(memories.map((m) => m.id));
    onClose();
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title="Approve Memories" 
      size="md"
    >
      <div className="space-y-4">
        <div className="text-sm text-gray-400">
          Review and approve the following memories:
        </div>

        <div className="space-y-2 max-h-96 overflow-auto">
          {memories.map((memory) => (
            <div
              key={memory.id}
              className="bg-gray-800 border border-gray-700 rounded p-3"
            >
              <div className="text-xs text-gray-500 mb-1">{memory.type}</div>
              <div className="text-sm">{memory.content}</div>
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="danger" onClick={handleRejectAll}>
            Reject All
          </Button>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleApproveAll}>
            Approve All
          </Button>
        </div>
      </div>
    </Modal>
  );
};
