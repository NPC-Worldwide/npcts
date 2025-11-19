import React from 'react';
import { Search, Filter } from 'lucide-react';

interface ExecutionFiltersProps {
  searchTerm: string;
  onSearchChange: (term: string) => void;
  labelFilter: string;
  onLabelFilterChange: (label: string) => void;
  dateRange: string;
  onDateRangeChange: (range: string) => void;
}

export const ExecutionFilters: React.FC<ExecutionFiltersProps> = ({
  searchTerm,
  onSearchChange,
  labelFilter,
  onLabelFilterChange,
  dateRange,
  onDateRangeChange
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div>
        <label className="text-sm font-medium mb-2 block">
          <Search size={14} className="inline mr-1" />
          Search
        </label>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search executions..."
          className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-sm"
        />
      </div>
      
      <div>
        <label className="text-sm font-medium mb-2 block">
          <Filter size={14} className="inline mr-1" />
          Label Filter
        </label>
        <select
          value={labelFilter}
          onChange={(e) => onLabelFilterChange(e.target.value)}
          className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-sm"
        >
          <option value="all">All Labels</option>
          <option value="good">Good</option>
          <option value="bad">Bad</option>
          <option value="neutral">Neutral</option>
          <option value="unlabeled">Unlabeled</option>
        </select>
      </div>
      
      <div>
        <label className="text-sm font-medium mb-2 block">Date Range</label>
        <select
          value={dateRange}
          onChange={(e) => onDateRangeChange(e.target.value)}
          className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-sm"
        >
          <option value="all">All Time</option>
          <option value="7d">Last 7 Days</option>
          <option value="30d">Last 30 Days</option>
          <option value="90d">Last 90 Days</option>
        </select>
      </div>
    </div>
  );
};
