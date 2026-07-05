import { create } from "zustand";
import { getLatestTrueColorImagery } from "../lib/dates.js";
import {
  DEFAULT_IMAGERY_ZOOM_DEGREES,
  IMAGERY_ZOOM_MAX_DEGREES,
  IMAGERY_ZOOM_MIN_DEGREES,
  clamp,
} from "../lib/geo.js";
import { modalImageryProviders } from "../providers/registry.js";

type SelectedPoint = {
  lat: number;
  lon: number;
  imageryView?: ImageryView;
};

type ImageryView = {
  latSpan: number;
  lonSpan: number;
  pixelWidth: number;
  pixelHeight: number;
};

type GlobeView = {
  lat: number;
  lon: number;
  latSpan: number;
  lonSpan: number;
  distance: number;
  atMaxZoom: boolean;
};

type GlobeFocusRequest = {
  lat: number;
  lon: number;
  immediate: boolean;
  nonce: number;
};

type GlobeZoomRequest = {
  deltaY: number;
  shiftKey: boolean;
  nonce: number;
};

type GlobeDetailViewRequest = {
  lat: number;
  lon: number;
  latSpan: number;
  lonSpan: number;
  active: boolean;
  nonce: number;
};

type AppState = {
  selectedPoint: SelectedPoint | null;
  globeView: GlobeView | null;
  globeFocusRequest: GlobeFocusRequest | null;
  globeZoomRequest: GlobeZoomRequest | null;
  globeDetailViewRequest: GlobeDetailViewRequest | null;
  date: string;
  layerId: string;
  imageryVisible: boolean;
  boundaryLinesVisible: boolean;
  overlayLayersVisible: boolean;
  overlayLayerIds: string[];
  imageryZoomDegrees: number;
  selectPoint: (lat: number, lon: number, zoom?: number | ImageryView) => void;
  setGlobeView: (view: GlobeView) => void;
  focusGlobeAt: (
    lat: number,
    lon: number,
    options?: { immediate?: boolean; syncView?: boolean },
  ) => void;
  requestGlobeZoom: (deltaY: number, shiftKey?: boolean) => void;
  syncGlobeDetailView: (
    view: Pick<GlobeDetailViewRequest, "lat" | "lon" | "latSpan" | "lonSpan"> | null,
  ) => void;
  setDate: (date: string) => void;
  setLayer: (id: string) => void;
  toggleImageryVisible: () => void;
  toggleBoundaryLinesVisible: () => void;
  toggleOverlayLayersVisible: () => void;
  addOverlayLayer: (id: string) => void;
  removeOverlayLayer: (id: string) => void;
  setImageryZoomDegrees: (degrees: number) => void;
  setRegionalView: (lat: number, lon: number, imageryZoomDegrees: number) => void;
};

const initialTrueColorImagery = getLatestTrueColorImagery();
const defaultModalLayerId = modalImageryProviders[0]?.id ?? initialTrueColorImagery.layerId;

const REGIONAL_OPEN_WIDTH_KM = 150;

export const useGlobeStore = create<AppState>((set) => ({
  selectedPoint: null,
  globeView: null,
  globeFocusRequest: null,
  globeZoomRequest: null,
  globeDetailViewRequest: null,
  date: initialTrueColorImagery.date,
  layerId: initialTrueColorImagery.layerId,
  imageryVisible: true,
  boundaryLinesVisible: true,
  overlayLayersVisible: true,
  overlayLayerIds: [],
  imageryZoomDegrees: DEFAULT_IMAGERY_ZOOM_DEGREES,
  selectPoint: (lat, lon, zoom) =>
    set((state) => {
      const latestTrueColorImagery = getLatestTrueColorImagery();
      const zoomDegrees = typeof zoom === "number" ? zoom : zoom?.lonSpan;
      const regionalOpenZoom = clamp(
        REGIONAL_OPEN_WIDTH_KM / (111 * Math.max(Math.cos((lat * Math.PI) / 180), 0.05)),
        IMAGERY_ZOOM_MIN_DEGREES,
        IMAGERY_ZOOM_MAX_DEGREES,
      );

      return {
        selectedPoint: { lat, lon, imageryView: typeof zoom === "object" ? zoom : undefined },
        date: state.date ?? latestTrueColorImagery.date,
        layerId: state.layerId ?? defaultModalLayerId,
        imageryZoomDegrees:
          typeof zoom === "object"
            ? regionalOpenZoom
            : zoomDegrees === undefined
              ? state.globeView?.atMaxZoom
                ? clamp(state.globeView.lonSpan, IMAGERY_ZOOM_MIN_DEGREES, IMAGERY_ZOOM_MAX_DEGREES)
                : state.imageryZoomDegrees
              : clamp(zoomDegrees, IMAGERY_ZOOM_MIN_DEGREES, IMAGERY_ZOOM_MAX_DEGREES),
      };
    }),
  setGlobeView: (globeView) => set({ globeView }),
  focusGlobeAt: (lat, lon, options) =>
    set((state) => ({
      globeFocusRequest: {
        lat,
        lon,
        immediate: options?.immediate ?? false,
        nonce: (state.globeFocusRequest?.nonce ?? 0) + 1,
      },
      globeView: (options?.syncView ?? true) && state.globeView
        ? {
            ...state.globeView,
            lat,
            lon,
          }
        : state.globeView,
    })),
  requestGlobeZoom: (deltaY, shiftKey = false) =>
    set((state) => ({
      globeZoomRequest: {
        deltaY,
        shiftKey,
        nonce: (state.globeZoomRequest?.nonce ?? 0) + 1,
      },
    })),
  syncGlobeDetailView: (view) =>
    set((state) => ({
      globeDetailViewRequest: view
        ? {
            ...view,
            active: true,
            nonce: (state.globeDetailViewRequest?.nonce ?? 0) + 1,
          }
        : state.globeDetailViewRequest
          ? {
              ...state.globeDetailViewRequest,
              active: false,
              nonce: state.globeDetailViewRequest.nonce + 1,
            }
          : null,
    })),
  setDate: (date) => set({ date }),
  setLayer: (layerId) =>
    set((state) => ({
      layerId,
      overlayLayerIds: state.overlayLayerIds.filter((id) => id !== layerId),
    })),
  toggleImageryVisible: () =>
    set((state) => ({
      imageryVisible: !state.imageryVisible,
    })),
  toggleBoundaryLinesVisible: () =>
    set((state) => ({
      boundaryLinesVisible: !state.boundaryLinesVisible,
    })),
  toggleOverlayLayersVisible: () =>
    set((state) => ({
      overlayLayersVisible: !state.overlayLayersVisible,
    })),
  addOverlayLayer: (id) =>
    set((state) => {
      if (id === state.layerId || state.overlayLayerIds.includes(id)) {
        return state;
      }
      return {
        overlayLayerIds: [...state.overlayLayerIds, id],
      };
    }),
  removeOverlayLayer: (id) =>
    set((state) => ({
      overlayLayerIds: state.overlayLayerIds.filter((existing) => existing !== id),
    })),
  setImageryZoomDegrees: (imageryZoomDegrees) => set({ imageryZoomDegrees }),
  setRegionalView: (lat, lon, imageryZoomDegrees) =>
    set((state) => ({
      selectedPoint: state.selectedPoint
        ? {
            ...state.selectedPoint,
            lat,
            lon,
          }
        : { lat, lon },
      imageryZoomDegrees,
    })),
}));
