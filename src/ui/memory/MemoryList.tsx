import React from 'react';
import { Edit, Trash2, CheckCircle, XCircle } from 'lucide-react';

export interface Memory {
  id: string;
  memory_id?: string;
  initial_memory: string;
  final_memory?: string;
  status: 'pending_approval' | 'human-approved' | 'human-edited' | 'human-rejected';
  npc?: string;
  timestamp: string;
}

interface MemoryListProps {
  memories: Memory[];
  onEdit?: (memory: Memory) => void;
  onDelete?: (id: string) => void;
  onApprove?: (id: string) => void;
  onReject?: (id: string) => void;
}

export const MemoryList: React.FC<MemoryListProps> = ({
  memories,
  onEdit,
  onDelete,
  onApprove,
  onReject
}) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'human-approved': return 'bg-green-900 text-green-300';
      case 'human-edited': return 'bg-blue-900 text-blue-300';
      case 'human-rejected': return 'bg-red-900 text-red-300';
      default: return 'bg-yellow-900 text-yellow-300';
    }
  };

  return (
    <div className="space-y-2">
      {memories.map(memory => (
        <div 
          key={memory.id || memory.memory_id}
          className="p-3 bg-gray-800 rounded border border-gray-700 hover:border-gray-600"
        >
          <div className="flex justify-between items-start gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm break-words">
                {memory.final_memory || memory.initial_memory}
              </p>
              {memory.final_memory && memory.final_memory !== memory.initial_memory && (
                <p className="text-xs text-gray-500 mt-1">
                  Original: {memory.initial_memory}
                </p>
              )}
              <div className="flex items-center gap-2 mt-2">
                <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(memory.status)}`}>
                  {memory.status}
                </span>
                {memory.npc && (
                  <span className="text-xs text-gray-500">NPC: {memory.npc}</span>
                )}
                <span className="text-xs text-gray-500">
                  {new Date(memory.timestamp).toLocaleString()}
                </span>
              </div>
            </div>
            
            <div className="flex gap-1 flex-shrink-0">
              {onApprove && memory.status === 'pending_approval' && (
                <button
                  onClick={() => onApprove(memory.id)}
                  className="p-1 hover:bg-gray-700 rounded text-green-400"
                  title="Approve"
                >
                  <CheckCircle size={14} />
                </button>
              )}
              {onReject && memory.status === 'pending_approval' && (
                <button
                  onClick={() => onReject(memory.id)}
                  className="p-1 hover:bg-gray-700 rounded text-red-400"
                  title="Reject"
                >
                  <XCircle size={14} />
                </button>
              )}
              {onEdit && (
                <button
                  onClick={() => onEdit(memory)}
                  className="p-1 hover:bg-gray-700 rounded"
                  title="Edit"
                >
                  <Edit size={14} />
                </button>
              )}
              {onDelete && (
                <button
                  onClick={() => onDelete(memory.id)}
                  className="p-1 hover:bg-gray-700 rounded text-red-400"
                  title="Delete"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          </div>
        </div>
      ))}
      {memories.length === 0 && (
        <div className="text-center p-8 text-gray-500">
          No memories found
        </div>
      )}
    </div>
  );
};
