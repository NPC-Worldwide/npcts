import React from 'react';
import { Search } from 'lucide-react';

interface MemoryFiltersProps {
  searchTerm: string;
  onSearchChange: (term: string) => void;
  statusFilter: string;
  onStatusFilterChange: (status: string) => void;
  npcFilter?: string;
  onNpcFilterChange?: (npc: string) => void;
  availableNpcs?: string[];
}

export const MemoryFilters: React.FC<MemoryFiltersProps> = ({
  searchTerm,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  npcFilter,
  onNpcFilterChange,
  availableNpcs = []
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div>
        <label className="text-sm font-medium mb-2 block">Search Memories</label>
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search content..."
            className="w-full pl-10 pr-3 py-2 bg-gray-800 border border-gray-700 rounded text-sm"
          />
        </div>
      </div>
      
      <div>
        <label className="text-sm font-medium mb-2 block">Filter by Status</label>
        <select
          value={statusFilter}
          onChange={(e) => onStatusFilterChange(e.target.value)}
          className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-sm"
        >
          <option value="all">All Statuses</option>
          <option value="pending_approval">Pending Approval</option>
          <option value="human-approved">Approved</option>
          <option value="human-edited">Edited</option>
          <option value="human-rejected">Rejected</option>
        </select>
      </div>
      
      {onNpcFilterChange && (
        <div>
          <label className="text-sm font-medium mb-2 block">Filter by NPC</label>
          <select
            value={npcFilter}
            onChange={(e) => onNpcFilterChange(e.target.value)}
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-sm"
          >
            <option value="all">All NPCs</option>
            {availableNpcs.map(npc => (
              <option key={npc} value={npc}>{npc}</option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
};
