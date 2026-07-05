import React from "react";
import { Layers } from "lucide-react";
import { modalImageryProviders } from "../providers/registry.js";

type LayerSwitcherProps = {
  value: string;
  onValueChange: (value: string) => void;
};

export function LayerSwitcher({ value, onValueChange }: LayerSwitcherProps) {
  return (
    <div className="space-y-2">
      <label className="inline-flex items-center gap-2 text-xs text-gray-300">
        <Layers className="h-3.5 w-3.5" />
        Imagery
      </label>
      <div className="max-h-60 space-y-1 overflow-y-auto">
        {modalImageryProviders.map((provider, index) => {
          const selected = provider.id === value;

          return (
            <button
              key={provider.id}
              type="button"
              onClick={() => onValueChange(provider.id)}
              className={`flex w-full items-center gap-2 rounded-md border px-2 py-1.5 text-left text-xs transition-colors ${
                selected
                  ? "border-teal-500/60 bg-teal-500/15 text-white"
                  : "border-white/10 bg-black/40 text-gray-400 hover:border-white/20 hover:bg-black/60 hover:text-white"
              }`}
            >
              <span
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-sm border text-[11px] font-semibold ${
                  selected
                    ? "border-teal-500 bg-teal-500 text-black"
                    : "border-white/20 bg-black/60 text-gray-400"
                }`}
              >
                {index + 1}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{provider.name}</span>
                <span className="block truncate text-[11px] opacity-75">{provider.category}</span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
