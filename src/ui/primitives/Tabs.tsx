import React from 'react';
import { LucideIcon } from 'lucide-react';

interface Tab {
  id: string;
  name: string;
  icon?: LucideIcon;
}

interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  onChange: (tabId: string) => void;
  className?: string;
}

export const Tabs: React.FC<TabsProps> = ({
  tabs,
  activeTab,
  onChange,
  className = ''
}) => {
  return (
    <div className={`flex border-b theme-border ${className}`}>
      {tabs.map((tab) => {
        const Icon = tab.icon;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={`px-4 py-3 flex items-center gap-2 text-sm border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent theme-text-muted theme-hover'
            }`}
          >
            {Icon && <Icon size={16} />}
            {tab.name}
          </button>
        );
      })}
    </div>
  );
};