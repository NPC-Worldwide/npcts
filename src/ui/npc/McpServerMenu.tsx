import React, { useState } from "react";
import { Server, Plus, Trash, RefreshCw } from "lucide-react";
import { Button } from "../primitives/Button";
import { Input } from "../primitives/Input";
import { Modal } from "../primitives/Modal";

interface McpServer {
  id: string;
  name: string;
  url: string;
  status?: "connected" | "disconnected" | "error";
}

interface McpServerMenuProps {
  servers?: McpServer[];
  onAddServer?: (server: Omit<McpServer, "id" | "status">) => void;
  onRemoveServer?: (id: string) => void;
  onRefreshServer?: (id: string) => void;
}

export const McpServerMenu: React.FC<McpServerMenuProps> = ({
  servers = [],
  onAddServer,
  onRemoveServer,
  onRefreshServer,
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newServer, setNewServer] = useState({
    name: "",
    url: "",
  });

  const handleAdd = () => {
    if (newServer.name && newServer.url) {
      onAddServer?.(newServer);
      setNewServer({ name: "", url: "" });
      setIsAdding(false);
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-gray-900 p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Server size={20} />
          <h2 className="text-lg font-semibold">MCP Servers</h2>
        </div>
        <Button size="sm" onClick={() => setIsAdding(true)}>
          <Plus size={14} className="inline mr-1" />
          Add Server
        </Button>
      </div>

      <div className="flex-1 overflow-auto space-y-2">
        {servers.map((server) => (
          <div
            key={server.id}
            className="bg-gray-800 rounded p-3 flex items-start 
              justify-between"
          >
            <div className="flex-1 min-w-0">
              <div className="font-medium">{server.name}</div>
              <div className="text-xs text-gray-500 mt-1 truncate">
                {server.url}
              </div>
              {server.status && (
                <div
                  className={`text-xs mt-1 ${
                    server.status === "connected"
                      ? "text-green-400"
                      : server.status === "error"
                      ? "text-red-400"
                      : "text-gray-400"
                  }`}
                >
                  {server.status}
                </div>
              )}
            </div>
            <div className="flex items-center gap-1 ml-2">
              <button
                onClick={() => onRefreshServer?.(server.id)}
                className="p-2 hover:bg-gray-700 rounded"
                title="Refresh"
              >
                <RefreshCw size={16} className="text-blue-400" />
              </button>
              <button
                onClick={() => onRemoveServer?.(server.id)}
                className="p-2 hover:bg-gray-700 rounded"
                title="Delete"
              >
                <Trash size={16} className="text-red-400" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <Modal
        isOpen={isAdding}
        onClose={() => setIsAdding(false)}
        title="Add MCP Server"
        size="md"
      >
        <div className="space-y-3">
          <Input
            label="Name"
            placeholder="My MCP Server"
            value={newServer.name}
            onChange={(e) => setNewServer({ ...newServer, name: e.target.value })}
          />
          <Input
            label="URL"
            placeholder="http://localhost:3000"
            value={newServer.url}
            onChange={(e) => setNewServer({ ...newServer, url: e.target.value })}
          />
          <div className="flex gap-2">
            <Button variant="primary" onClick={handleAdd}>
              Add Server
            </Button>
            <Button variant="ghost" onClick={() => setIsAdding(false)}>
              Cancel
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
