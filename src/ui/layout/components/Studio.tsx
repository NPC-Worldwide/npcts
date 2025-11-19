import React from "react";
import { LayoutProvider } from "../context/LayoutContext";
import { LayoutNodeComponent } from "./LayoutNode";
import { AppServices } from "../../../adapters/base";

interface StudioProps {
  services: AppServices;
}

export const Studio: React.FC<StudioProps> = ({ services }) => {
  return (
    <LayoutProvider>
      <div className="flex h-screen w-screen overflow-hidden bg-gray-900">
        <LayoutNodeComponent
          node={{
            id: "root",
            type: "content",
            contentType: "chat",
          }}
          path={[]}
        />
      </div>
    </LayoutProvider>
  );
};
