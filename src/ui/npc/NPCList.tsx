import React from 'react';
import { Bot, Edit, Trash2, Star } from 'lucide-react';

export interface NPC {
  name: string;
  model: string;
  provider: string;
  primary_directive?: string;
  jinxs?: string[];
  is_forenpc?: boolean;
}

interface NPCListProps {
  npcs: NPC[];
  selectedNpc: string | null;
  onNpcSelect: (npc: NPC) => void;
  onEdit?: (npc: NPC) => void;
  onDelete?: (name: string) => void;
  onSetForenpc?: (name: string) => void;
}

export const NPCList: React.FC<NPCListProps> = ({
  npcs,
  selectedNpc,
  onNpcSelect,
  onEdit,
  onDelete,
  onSetForenpc
}) => {
  return (
    <div className="space-y-2">
      {npcs.map(npc => (
        <div
          key={npc.name}
          className={`p-3 rounded border group ${
            selectedNpc === npc.name
              ? 'bg-blue-600/20 border-blue-600'
              : 'bg-gray-800 border-gray-700 hover:border-gray-600'
          }`}
        >
          <div className="flex items-start justify-between gap-2">
            <button
              onClick={() => onNpcSelect(npc)}
              className="flex-1 text-left"
            >
              <div className="flex items-center gap-2 mb-1">
                <Bot size={16} className="text-purple-400" />
                <span className="font-semibold">{npc.name}</span>
                {npc.is_forenpc && (
                  <Star size={14} className="text-yellow-400 fill-yellow-400" />
                )}
              </div>
              <p className="text-xs text-gray-400">
                {npc.model} ({npc.provider})
              </p>
              {npc.primary_directive && (
                <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                  {npc.primary_directive}
                </p>
              )}
            </button>
            
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {onSetForenpc && (
                <button
                  onClick={() => onSetForenpc(npc.name)}
                  className="p-1 hover:bg-gray-700 rounded"
                  title="Set as forenpc"
                >
                  <Star size={14} className={npc.is_forenpc ? 'fill-yellow-400 text-yellow-400' : ''} />
                </button>
              )}
              {onEdit && (
                <button
                  onClick={() => onEdit(npc)}
                  className="p-1 hover:bg-gray-700 rounded"
                  title="Edit"
                >
                  <Edit size={14} />
                </button>
              )}
              {onDelete && (
                <button
                  onClick={() => onDelete(npc.name)}
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
      {npcs.length === 0 && (
        <div className="text-center p-8 text-gray-500">
          No NPCs found
        </div>
      )}
    </div>
  );
};
