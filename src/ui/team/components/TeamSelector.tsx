import React from 'react';
import { Search, Plus } from 'lucide-react';

export interface TeamSelectorTeam {
  name: string;
  path: string;
  npcCount?: number;
  [key: string]: any;
}

export interface TeamSelectorProjectTeam {
  key: string;
  label: string;
  path: string;
}

export interface TeamSelectorProps {
  registeredTeams: Record<string, string>;
  projectTeam?: TeamSelectorProjectTeam | null;
  selectedTeam: string;
  onSelectTeam: (key: string) => void;
  discoveredTeams?: TeamSelectorTeam[];
  scanning?: boolean;
  onScan?: () => void;
  onRegisterTeam?: (team: TeamSelectorTeam) => void;
  onRegisterProjectTeam?: () => void;
  className?: string;
}

export const TeamSelector: React.FC<TeamSelectorProps> = ({
  registeredTeams,
  projectTeam,
  selectedTeam,
  onSelectTeam,
  discoveredTeams = [],
  scanning = false,
  onScan,
  onRegisterTeam,
  onRegisterProjectTeam,
  className = '',
}) => {
  return (
    <div className={`px-3 py-1.5 ${className}`}>
      <select
        value={selectedTeam}
        onChange={(e) => onSelectTeam(e.target.value)}
        className="w-full theme-input text-xs py-1.5 px-2 rounded"
      >
        {Object.entries(registeredTeams).map(([key, teamPath]) => {
          const parentName = typeof teamPath === 'string' && teamPath.endsWith('/npc_team')
            ? teamPath.split('/').slice(-2)[0]
            : key;
          return (
            <option key={key} value={key}>{parentName}</option>
          );
        })}
        {projectTeam && (
          <option value={projectTeam.key}>{projectTeam.label} (unregistered)</option>
        )}
      </select>
      {selectedTeam === projectTeam?.key && projectTeam && (
        <button
          onClick={onRegisterProjectTeam}
          className="mt-1 w-full px-2 py-1 rounded text-[10px] bg-purple-600 hover:bg-purple-500 text-white transition flex items-center justify-center gap-1"
        >
          <Plus size={10} /> Register Team
        </button>
      )}
      {onScan && (
        <button
          onClick={onScan}
          disabled={scanning}
          className="mt-1 w-full px-2 py-1 rounded text-[10px] theme-text-muted hover:text-white hover:bg-white/5 transition flex items-center justify-center gap-1"
          title="Discover team directories"
        >
          <Search size={10} /> {scanning ? 'Scanning...' : 'Discover'}
        </button>
      )}
      {discoveredTeams.length > 0 && (
        <div className="mt-1 theme-bg-tertiary rounded border theme-border max-h-32 overflow-y-auto">
          {discoveredTeams.map((team, i) => (
            <div key={i} className="flex items-center justify-between px-2 py-1 border-b theme-border last:border-b-0 hover:bg-white/5 text-[10px]">
              <div className="flex-1 min-w-0">
                <span className="font-medium theme-text-primary">{team.name}</span>
                <span className="theme-text-muted ml-1">{team.npcCount || 0} NPC{team.npcCount !== 1 ? 's' : ''}</span>
              </div>
              {onRegisterTeam && (
                <button
                  onClick={() => onRegisterTeam(team)}
                  className="ml-1 px-1 py-0.5 rounded bg-purple-600 hover:bg-purple-500 text-white flex-shrink-0 text-[9px]"
                >
                  Register
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
