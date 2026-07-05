import React, { useEffect } from "react";
import { Satellite } from "lucide-react";
import { Globe } from "./Globe.js";
import { MaxZoomImagery } from "./MaxZoomImagery.js";
import { formatGibsCaptureTime } from "../lib/captureTime.js";
import { getImageryProvider } from "../providers/registry.js";
import { useGlobeStore } from "../store/useGlobeStore.js";
import { LayerSwitcher } from "./LayerSwitcher.js";
import { DatePicker } from "./DatePicker.js";

export interface EarthViewProps {
  className?: string;
}

function EarthStyles() {
  useEffect(() => {
    if (document.getElementById("npcts-earth-view-styles")) return;
    const style = document.createElement("style");
    style.id = "npcts-earth-view-styles";
    style.textContent = `
      :root {
        --earth-bg: 224 28% 6%;
        --earth-fg: 210 40% 96%;
        --earth-card: 222 22% 10%;
        --earth-primary: 174 58% 48%;
        --earth-primary-fg: 222 47% 7%;
        --earth-secondary: 222 18% 16%;
        --earth-muted: 223 18% 15%;
        --earth-muted-fg: 215 18% 67%;
        --earth-border: 218 20% 22%;
        --earth-radius: 0.5rem;
      }
      .earth-bg-space {
        background:
          radial-gradient(circle at 24% 18%, hsl(174 45% 18% / 0.22), transparent 22rem),
          radial-gradient(circle at 84% 72%, hsl(211 54% 22% / 0.2), transparent 24rem),
          linear-gradient(145deg, hsl(224 33% 5%) 0%, hsl(220 28% 7%) 46%, hsl(210 29% 9%) 100%);
      }
      .earth-city-label {
        display: block;
        color: hsl(210 40% 96% / 0.84);
        font-size: 10px;
        font-weight: 400;
        letter-spacing: 0;
        line-height: 1;
        opacity: 0.82;
        pointer-events: none;
        text-shadow: 0 1px 2px hsl(220 35% 3% / 0.68);
        user-select: none;
        white-space: nowrap;
      }
      .globe-stage,
      .globe-stage canvas {
        -webkit-user-drag: none;
        user-select: none;
      }
      body.earth-map-dragging,
      body.earth-map-dragging * {
        cursor: grabbing !important;
        user-select: none !important;
      }
    `;
    document.head.appendChild(style);
    return () => {
      style.remove();
    };
  }, []);
  return null;
}

export const EarthView: React.FC<EarthViewProps> = ({ className = "" }) => {
  const date = useGlobeStore((state) => state.date);
  const layerId = useGlobeStore((state) => state.layerId);
  const globeView = useGlobeStore((state) => state.globeView);
  const provider = getImageryProvider(layerId);
  const captureLabel = formatGibsCaptureTime(date, provider.id, globeView?.lon);

  return (
    <>
      <EarthStyles />
      <main
        className={`relative h-full w-full overflow-hidden earth-bg-space ${className}`}
      >
        <Globe />
        <MaxZoomImagery />

        <header className="pointer-events-none absolute left-4 top-4 z-10 flex max-w-[calc(100vw-2rem)] items-center gap-3 rounded-lg border border-white/10 bg-black/55 px-4 py-3 shadow-2xl backdrop-blur md:left-6 md:top-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-teal-500 text-black">
            <Satellite className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-base font-semibold tracking-normal text-white">Earth View</h1>
            <p className="truncate text-sm text-gray-300">
              {provider.name} · {captureLabel}
            </p>
          </div>
        </header>

        <div className="pointer-events-auto absolute right-4 top-4 z-20 flex w-64 flex-col gap-4 rounded-lg border border-white/10 bg-black/70 p-4 shadow-2xl backdrop-blur md:right-6 md:top-6">
          <DatePicker value={date} onChange={(value) => useGlobeStore.getState().setDate(value)} />
          <LayerSwitcher
            value={layerId}
            onValueChange={(value) => useGlobeStore.getState().setLayer(value)}
          />
        </div>

        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-40 bg-gradient-to-t from-black/75 to-transparent" />
      </main>
    </>
  );
};
