import React from 'react';
import { X, Users } from 'lucide-react';

export interface TeamSection {
  group: string;
  items: { id: string; label: string; icon?: React.ReactNode }[];
}

export interface TeamManagementShellProps {
  title?: string;
  activeTab: string;
  onTabChange: (id: string) => void;
  onClose?: () => void;
  sections: TeamSection[];
  teamSelector?: React.ReactNode;
  headerActions?: React.ReactNode;
  children: React.ReactNode;
  embedded?: boolean;
}

export const TeamManagementShell: React.FC<TeamManagementShellProps> = ({
  title = 'Team',
  activeTab,
  onTabChange,
  onClose,
  sections,
  teamSelector,
  headerActions,
  children,
  embedded = false,
}) => {
  const content = (
    <div className={embedded ? "flex flex-col h-full" : "relative w-[90vw] max-w-6xl h-[85vh] theme-bg-primary rounded-xl shadow-2xl border theme-border flex flex-col overflow-hidden"}>
      <div className="flex items-center justify-between px-4 py-3 border-b theme-border flex-shrink-0">
        <div className="flex items-center gap-3">
          <Users className="text-purple-400" size={20} />
          <h2 className="text-lg font-semibold">{title}</h2>
        </div>
        <div className="flex items-center gap-2">
          {headerActions}
          {!embedded && onClose && (
            <button onClick={onClose} className="p-1.5 rounded-lg theme-hover transition-colors">
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="w-44 flex-shrink-0 border-r theme-border overflow-y-auto py-2 space-y-2">
          {sections.map((section) => (
            <div key={section.group}>
              <div className="px-4 py-1 text-[10px] uppercase tracking-wider theme-text-muted font-semibold">
                {section.group}
              </div>
              {section.group.toLowerCase() === 'team' && teamSelector}
              {section.items.map((item) => (
                <button
                  key={item.id}
                  onClick={() => onTabChange(item.id)}
                  className={`w-full flex items-center gap-2.5 px-4 py-2 text-sm transition-colors ${
                    activeTab === item.id
                      ? 'bg-purple-600/15 text-purple-400 border-l-2 border-purple-500'
                      : 'theme-text-secondary hover:theme-text-primary hover:bg-white/5 border-l-2 border-transparent'
                  }`}
                >
                  {item.icon}
                  {item.label}
                </button>
              ))}
            </div>
          ))}
        </div>

        <div className="flex-1 flex flex-col overflow-hidden">
          {children}
        </div>
      </div>
    </div>
  );

  if (embedded) {
    return <>{content}</>;
  }

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        />
        {content}
      </div>
    </>
  );
};
