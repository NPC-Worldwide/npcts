import React from "react";
import { LayoutProvider } from "../context/LayoutContext";
import { ChatProvider } from "../../chat/context/ChatContext";
import { FileSystemProvider } from "../../files/context/FileSystemContext";
import { Sidebar } from "../../files/components/Sidebar";
import { LayoutNodeComponent } from "./LayoutNode";
import { AppServices } from "../../../adapters/base";

interface AppShellProps {
  services: AppServices;
  workspacePath?: string;
}

export const AppShell: React.FC<AppShellProps> = ({
  services,
  workspacePath = "",
}) => {
  return (
    <LayoutProvider>
      <ChatProvider services={services} workspacePath={workspacePath}>
        <FileSystemProvider client={services.files}>
          <div className="flex h-screen w-screen overflow-hidden bg-gray-900">
            <Sidebar />
            <div className="flex-1 flex flex-col overflow-hidden">
              <LayoutNodeComponent
                node={{
                  id: "root",
                  type: "content",
                  contentType: "chat",
                }}
                path={[]}
              />
            </div>
          </div>
        </FileSystemProvider>
      </ChatProvider>
    </LayoutProvider>
  );
};
