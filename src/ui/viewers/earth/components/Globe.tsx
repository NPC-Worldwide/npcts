import React from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { Loader2 } from "lucide-react";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Quaternion, Raycaster, Sphere, Vector2, Vector3 } from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { buildGlobalGibsTextureUrl } from "../providers/GibsProvider.js";
import { getImageryProvider } from "../providers/registry.js";
import { useGlobeStore } from "../store/useGlobeStore.js";
import { latLonToVector, normalizeLongitude, pointToLatLon } from "../lib/geo.js";
import { BoundaryLines } from "./BoundaryLines.js";
import { CityLabels } from "./CityLabels.js";
import { Earth, PlaceholderEarth } from "./Earth.js";

const MIN_GLOBE_DISTANCE = 1.06;
const MAX_GLOBE_DISTANCE = 6;
const MAX_ZOOM_DISTANCE = 1.16;
const MIN_ROTATE_SPEED = 0.012;
const MAX_ROTATE_SPEED = 0.36;
const MIN_PAN_SPEED = 0.018;
const MAX_PAN_SPEED = 0.24;
const DRAG_SPEED_CURVE = 1.25;
const MIN_ZOOM_SPEED = 0.075;
const MAX_ZOOM_SPEED = 0.5;
const ZOOM_SPEED_CURVE = 1.45;
const SHIFT_WHEEL_ZOOM_MULTIPLIER = 3.5;
const VIEW_REPORT_INTERVAL = 8;
const INITIAL_GLOBE_TEXTURE_WIDTH = 4096;
const DETAILED_GLOBE_TEXTURE_WIDTH = 8192;
const DETAIL_DISTANCE_MATCH_ITERATIONS = 14;
const CURSOR_ZOOM_ANCHOR_ITERATIONS = 6;

function zoomProgressForDistance(distance: number) {
  const progress = (distance - MIN_GLOBE_DISTANCE) / (MAX_GLOBE_DISTANCE - MIN_GLOBE_DISTANCE);

  return Math.min(1, Math.max(0, progress));
}

function AdaptiveControls() {
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const camera = useThree((state) => state.camera);
  const gl = useThree((state) => state.gl);
  const focusRequest = useGlobeStore((state) => state.globeFocusRequest);
  const zoomRequest = useGlobeStore((state) => state.globeZoomRequest);
  const detailViewRequest = useGlobeStore((state) => state.globeDetailViewRequest);
  const setGlobeView = useGlobeStore((state) => state.setGlobeView);
  const lastFocusNonce = useRef(0);
  const lastZoomNonce = useRef(0);
  const lastDetailViewNonce = useRef(0);
  const frameCount = useRef(0);
  const lastReportedView = useRef<{
    lat: number;
    lon: number;
    latSpan: number;
    lonSpan: number;
    distance: number;
    atMaxZoom: boolean;
  } | null>(null);
  const raycasterRef = useRef(new Raycaster());
  const sphereRef = useRef(new Sphere(undefined, 1));
  const centerPointRef = useRef(new Vector2(0, 0));
  const intersectionRef = useRef(new Vector3());
  const cursorAnchorRef = useRef(new Vector3());
  const cursorHitRef = useRef(new Vector3());
  const cursorCorrectionRef = useRef(new Quaternion());

  const readSurfaceVector = useCallback(
    (ndcX: number, ndcY: number, target: Vector3) => {
      raycasterRef.current.setFromCamera(centerPointRef.current.set(ndcX, ndcY), camera);

      const point = raycasterRef.current.ray.intersectSphere(sphereRef.current, target);

      return point ? target.copy(point).normalize() : null;
    },
    [camera],
  );

  const readSurfacePoint = useCallback(
    (ndcX: number, ndcY: number) => {
      const point = readSurfaceVector(ndcX, ndcY, intersectionRef.current);

      return point ? pointToLatLon(point) : null;
    },
    [readSurfaceVector],
  );

  const readCurrentView = useCallback(() => {
    const centerPoint = readSurfacePoint(0, 0);

    if (!centerPoint) {
      return null;
    }

    const leftPoint = readSurfacePoint(-1, 0);
    const rightPoint = readSurfacePoint(1, 0);
    const topPoint = readSurfacePoint(0, 1);
    const bottomPoint = readSurfacePoint(0, -1);

    return {
      lat: centerPoint.lat,
      lon: centerPoint.lon,
      latSpan:
        topPoint && bottomPoint
          ? Math.max(0.01, Math.abs(topPoint.lat - bottomPoint.lat))
          : 8,
      lonSpan:
        leftPoint && rightPoint
          ? Math.max(0.01, Math.abs(normalizeLongitude(rightPoint.lon - leftPoint.lon)))
          : 8,
    };
  }, [readSurfacePoint]);

  const moveCameraTo = useCallback(
    (lat: number, lon: number, distance: number) => {
      const direction = latLonToVector(lat, lon).normalize();

      camera.position.copy(direction.multiplyScalar(distance));
      camera.lookAt(0, 0, 0);
      camera.updateMatrixWorld();
    },
    [camera],
  );

  const matchDistanceForDetailView = useCallback(
    (lat: number, lon: number, targetLatSpan: number, targetLonSpan: number) => {
      const targetLat = Math.max(0.01, targetLatSpan);
      const targetLon = Math.max(0.01, targetLonSpan);
      let low = MIN_GLOBE_DISTANCE;
      let high = MAX_ZOOM_DISTANCE;
      let bestDistance = low;
      let bestScore = Number.POSITIVE_INFINITY;

      for (let index = 0; index < DETAIL_DISTANCE_MATCH_ITERATIONS; index += 1) {
        const distance = (low + high) / 2;

        moveCameraTo(lat, lon, distance);
        const view = readCurrentView();

        if (!view) {
          return MIN_GLOBE_DISTANCE;
        }

        const latRatio = view.latSpan / targetLat;
        const lonRatio = view.lonSpan / targetLon;
        const score = Math.abs(Math.log(latRatio)) + Math.abs(Math.log(lonRatio));

        if (score < bestScore) {
          bestScore = score;
          bestDistance = distance;
        }

        if (Math.max(latRatio, lonRatio) > 1) {
          high = distance;
        } else {
          low = distance;
        }
      }

      return bestDistance;
    },
    [moveCameraTo, readCurrentView],
  );

  useEffect(() => {
    const element = gl.domElement;

    function dolly(controls: OrbitControlsImpl, deltaY: number, shiftKey: boolean) {
      const zoomMultiplier = shiftKey ? SHIFT_WHEEL_ZOOM_MULTIPLIER : 1;
      const zoomScale = Math.pow(controls.getZoomScale(), zoomMultiplier);

      if (deltaY < 0) {
        controls.dollyIn(zoomScale);
      } else {
        controls.dollyOut(zoomScale);
      }
    }

    function handleWheel(event: WheelEvent) {
      const controls = controlsRef.current;

      if (!controls || event.deltaY === 0) {
        return;
      }

      event.preventDefault();
      event.stopImmediatePropagation();

      const rect = element.getBoundingClientRect();
      const hasPointer =
        rect.width > 0 &&
        rect.height > 0 &&
        event.clientX >= rect.left &&
        event.clientX <= rect.right &&
        event.clientY >= rect.top &&
        event.clientY <= rect.bottom;
      const ndcX = hasPointer ? ((event.clientX - rect.left) / rect.width) * 2 - 1 : 0;
      const ndcY = hasPointer ? -(((event.clientY - rect.top) / rect.height) * 2 - 1) : 0;
      const anchor = hasPointer ? readSurfaceVector(ndcX, ndcY, cursorAnchorRef.current) : null;
      const originalDamping = controls.enableDamping;
      const originalMinDistance = controls.minDistance;

      controls.enableDamping = false;
      controls.minDistance = MIN_GLOBE_DISTANCE;
      controls.target.set(0, 0, 0);
      dolly(controls, event.deltaY, event.shiftKey);
      controls.update();

      if (anchor) {
        for (let index = 0; index < CURSOR_ZOOM_ANCHOR_ITERATIONS; index += 1) {
          const currentHit = readSurfaceVector(ndcX, ndcY, cursorHitRef.current);

          if (!currentHit) {
            break;
          }

          if (currentHit.angleTo(anchor) < 0.0001) {
            break;
          }

          cursorCorrectionRef.current.setFromUnitVectors(currentHit, anchor);
          camera.position.applyQuaternion(cursorCorrectionRef.current);
          camera.lookAt(controls.target);
          camera.updateMatrixWorld();
          controls.update();
        }
      }

      controls.minDistance = originalMinDistance;
      controls.enableDamping = originalDamping;
    }

    element.addEventListener("wheel", handleWheel, { capture: true, passive: false });
    return () => {
      element.removeEventListener("wheel", handleWheel, { capture: true });
    };
  }, [camera, gl, readSurfaceVector]);

  useFrame(() => {
    const controls = controlsRef.current;

    if (!controls) {
      return;
    }

    if (detailViewRequest && detailViewRequest.nonce !== lastDetailViewNonce.current) {
      lastDetailViewNonce.current = detailViewRequest.nonce;

      if (detailViewRequest.active) {
        const distance = matchDistanceForDetailView(
          detailViewRequest.lat,
          detailViewRequest.lon,
          detailViewRequest.latSpan,
          detailViewRequest.lonSpan,
        );
        const originalDamping = controls.enableDamping;

        controls.enableDamping = false;
        controls.target.set(0, 0, 0);
        moveCameraTo(detailViewRequest.lat, detailViewRequest.lon, distance);
        controls.update();
        controls.enableDamping = originalDamping;
      }
    }

    if (focusRequest && focusRequest.nonce !== lastFocusNonce.current) {
      const distance = Math.max(MIN_GLOBE_DISTANCE, camera.position.distanceTo(controls.target));
      const direction = latLonToVector(focusRequest.lat, focusRequest.lon).normalize();
      const originalDamping = controls.enableDamping;

      controls.enableDamping = focusRequest.immediate ? false : originalDamping;
      controls.target.set(0, 0, 0);
      camera.position.copy(direction.multiplyScalar(distance));
      camera.lookAt(controls.target);
      controls.update();
      controls.enableDamping = originalDamping;
      lastFocusNonce.current = focusRequest.nonce;
    }

    if (zoomRequest && zoomRequest.nonce !== lastZoomNonce.current && zoomRequest.deltaY !== 0) {
      const zoomMultiplier = zoomRequest.shiftKey ? SHIFT_WHEEL_ZOOM_MULTIPLIER : 1;
      const zoomScale = Math.pow(controls.getZoomScale(), zoomMultiplier);

      if (zoomRequest.deltaY < 0) {
        controls.dollyIn(zoomScale);
      } else {
        controls.dollyOut(zoomScale);
      }

      controls.update();
      lastZoomNonce.current = zoomRequest.nonce;
    }

    const distance = camera.position.distanceTo(controls.target);
    const zoomProgress = zoomProgressForDistance(distance);
    const dragSpeedProgress = Math.pow(zoomProgress, DRAG_SPEED_CURVE);
    const zoomSpeedProgress = Math.pow(zoomProgress, ZOOM_SPEED_CURVE);

    controls.rotateSpeed = MIN_ROTATE_SPEED + dragSpeedProgress * (MAX_ROTATE_SPEED - MIN_ROTATE_SPEED);
    controls.panSpeed = MIN_PAN_SPEED + dragSpeedProgress * (MAX_PAN_SPEED - MIN_PAN_SPEED);
    controls.zoomSpeed = MIN_ZOOM_SPEED + zoomSpeedProgress * (MAX_ZOOM_SPEED - MIN_ZOOM_SPEED);

    frameCount.current += 1;

    if (frameCount.current % VIEW_REPORT_INTERVAL !== 0) {
      return;
    }

    const view = readCurrentView();

    if (!view) {
      return;
    }

    const atMaxZoom = distance <= MAX_ZOOM_DISTANCE;
    const previous = lastReportedView.current;

    if (
      previous &&
      previous.atMaxZoom === atMaxZoom &&
      Math.abs(previous.distance - distance) < 0.005 &&
      Math.abs(previous.lat - view.lat) < 0.01 &&
      Math.abs(previous.lon - view.lon) < 0.01 &&
      Math.abs(previous.latSpan - view.latSpan) < 0.05 &&
      Math.abs(previous.lonSpan - view.lonSpan) < 0.05
    ) {
      return;
    }

    const nextView = { ...view, distance, atMaxZoom };
    lastReportedView.current = nextView;
    setGlobeView(nextView);
  });

  return (
    <OrbitControls
      ref={controlsRef}
      enablePan={false}
      enableZoom={false}
      enableDamping
      dampingFactor={0.08}
      minDistance={MIN_GLOBE_DISTANCE}
      maxDistance={MAX_GLOBE_DISTANCE}
      rotateSpeed={MIN_ROTATE_SPEED}
      zoomSpeed={MIN_ZOOM_SPEED}
      panSpeed={MIN_PAN_SPEED}
    />
  );
}

export function Globe() {
  const date = useGlobeStore((state) => state.date);
  const layerId = useGlobeStore((state) => state.layerId);
  const imageryVisible = useGlobeStore((state) => state.imageryVisible);
  const boundaryLinesVisible = useGlobeStore((state) => state.boundaryLinesVisible);
  const overlayLayersVisible = useGlobeStore((state) => state.overlayLayersVisible);
  const overlayLayerIds = useGlobeStore((state) => state.overlayLayerIds);
  const selectPoint = useGlobeStore((state) => state.selectPoint);
  const provider = getImageryProvider(layerId);
  const globeProvider = provider.layerId ? provider : getImageryProvider("viirs-noaa20");
  const baseDate = globeProvider.fixedDate ?? date;
  const textureUrl = buildGlobalGibsTextureUrl(globeProvider.layerId ?? "", baseDate, {
    width: INITIAL_GLOBE_TEXTURE_WIDTH,
  });
  const upgradeTextureUrl = buildGlobalGibsTextureUrl(globeProvider.layerId ?? "", baseDate, {
    width: DETAILED_GLOBE_TEXTURE_WIDTH,
  });
  const overlayTextures = useMemo(
    () =>
      overlayLayersVisible
        ? overlayLayerIds
            .map((id) => {
              const overlay = getImageryProvider(id);
              if (!overlay.layerId) return null;
              const overlayDate = overlay.fixedDate ?? date;
              return {
                id,
                url: buildGlobalGibsTextureUrl(overlay.layerId, overlayDate, { transparent: true }),
              };
            })
            .filter((entry): entry is { id: string; url: string } => entry !== null)
        : [],
    [date, overlayLayerIds, overlayLayersVisible],
  );
  const [loadedTextureUrl, setLoadedTextureUrl] = useState<string | null>(null);
  const globeLoading = loadedTextureUrl !== textureUrl && loadedTextureUrl !== upgradeTextureUrl;

  const handleEarthReady = useCallback((url: string) => {
    setLoadedTextureUrl(url);
  }, []);

  return (
    <div
      className="globe-stage absolute inset-0"
      data-testid="globe-stage"
      onDragStart={(event) => {
        event.preventDefault();
      }}
    >
      <Canvas
        className="globe-canvas !w-full !h-full"
        style={{ width: "100%", height: "100%" }}
        camera={{ position: [0, 0, 3.35], fov: 42, near: 0.01, far: 100 }}
        draggable={false}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true }}
        onDragStart={(event) => {
          event.preventDefault();
        }}
      >
        <color attach="background" args={["#05070d"]} />
        <ambientLight intensity={0.5} />
        <directionalLight position={[4, 2.8, 2.2]} intensity={1.8} />
        <directionalLight position={[-3, -1.8, -3]} intensity={0.2} color="#ffffff" />
        <Suspense fallback={<PlaceholderEarth onSelect={selectPoint} />}>
          <Earth
            imageryVisible={imageryVisible}
            textureUrl={textureUrl}
            upgradeTextureUrl={upgradeTextureUrl}
            overlayTextures={overlayTextures}
            onSelect={selectPoint}
            onReady={handleEarthReady}
          />
        </Suspense>
        {boundaryLinesVisible ? <BoundaryLines /> : null}
        <CityLabels />
        <AdaptiveControls />
      </Canvas>
      {imageryVisible && globeLoading && (
        <div className="pointer-events-none absolute bottom-6 left-1/2 z-10 -translate-x-1/2">
          <div className="flex items-center gap-2 rounded-md border border-white/10 bg-black/60 px-3 py-2 text-sm text-white shadow-xl backdrop-blur">
            <Loader2 className="h-4 w-4 animate-spin text-teal-400" />
            Loading globe imagery
          </div>
        </div>
      )}
    </div>
  );
}
