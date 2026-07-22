import { useEffect, useMemo, useRef, useState } from 'react';
import * as Tabs from '@radix-ui/react-tabs';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertCircle,
  Eye,
  Image as ImageIcon,
  Minus,
  Plus,
  RotateCcw,
  SlidersHorizontal
} from 'lucide-react';
import { cn } from '../../utils/utils';

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const MECHANICAL_EASE = [0.85, 0, 0.15, 1];
const MECHANICAL_TRANSITION = { duration: 0.22, ease: MECHANICAL_EASE };

function useElementWidth(ref) {
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const element = ref.current;
    if (!element) return undefined;

    const update = () => setWidth(element.clientWidth || 0);
    update();

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', update);
      return () => window.removeEventListener('resize', update);
    }

    const observer = new ResizeObserver((entries) => {
      const next = entries[0]?.contentRect?.width ?? element.clientWidth ?? 0;
      setWidth(next);
    });

    observer.observe(element);
    window.addEventListener('resize', update);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', update);
    };
  }, [ref]);

  return width;
}

function useImageMeta(url) {
  const [state, setState] = useState({
    status: url ? 'loading' : 'idle',
    width: 0,
    height: 0
  });

  useEffect(() => {
    let active = true;
    const img = new Image();
    const timeoutId = setTimeout(() => {
      if (!active) return;
      setState({ status: 'error', width: 0, height: 0 });
    }, 8000);

    if (!url) {
      setState({ status: 'idle', width: 0, height: 0 });
      clearTimeout(timeoutId);
      return undefined;
    }

    setState({ status: 'loading', width: 0, height: 0 });

    img.onload = () => {
      if (!active) return;
      clearTimeout(timeoutId);
      setState({
        status: 'ready',
        width: Number(img.naturalWidth || 0),
        height: Number(img.naturalHeight || 0)
      });
    };

    img.onerror = () => {
      if (!active) return;
      clearTimeout(timeoutId);
      setState({ status: 'error', width: 0, height: 0 });
    };

    img.src = url;

    return () => {
      active = false;
      clearTimeout(timeoutId);
      img.onload = null;
      img.onerror = null;
    };
  }, [url]);

  return state;
}

function Placeholder({ title, description }) {
  return (
    <div className="flex min-h-[360px] w-full flex-col items-center justify-center rounded-[1.5rem] border border-dashed border-[#353848] bg-[#12141d] px-6 text-center">
      <AlertCircle size={28} className="mb-3 text-[#575a6d]" />
      <p className="text-sm font-semibold text-[#f8f8f2]">{title}</p>
      <p className="mt-1 max-w-md text-sm text-[#8f93a8]">{description}</p>
    </div>
  );
}

function StatusChip({ children, tone = 'slate' }) {
  return (
    <span
      className={cn(
        'inline-flex rounded-full border px-3 py-1 text-[11px] font-semibold tracking-[0.14em] uppercase',
        tone === 'green' && 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300',
        tone === 'blue' && 'border-sky-500/20 bg-sky-500/10 text-sky-200',
        tone === 'red' && 'border-rose-500/25 bg-rose-500/10 text-rose-300',
        tone === 'slate' && 'border-[#313544] bg-[#181b26] text-[#a4a9bf]'
      )}
    >
      {children}
    </span>
  );
}

export default function DiffViewer({
  expectedUrl,
  actualUrl,
  diffUrl,
  expectedRenderUrl,
  actualRenderUrl,
  mismatchPercentage,
  boxes = [],
  comparisonWidth = 0,
  comparisonHeight = 0,
  viewportWidth = 0,
  viewportHeight = 0
}) {
  const [activeTab, setActiveTab] = useState('output');
  const [showBoxes, setShowBoxes] = useState(true);
  const [sliderSplit, setSliderSplit] = useState(52);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [selectedHotspot, setSelectedHotspot] = useState(null);
  const [actualRenderStatus, setActualRenderStatus] = useState(actualRenderUrl ? 'loading' : 'idle');
  const [expectedRenderStatus, setExpectedRenderStatus] = useState(expectedRenderUrl ? 'loading' : 'idle');

  const hostRef = useRef(null);
  const viewportRef = useRef(null);
  const contentRef = useRef(null);
  const panRef = useRef({ pointerId: null, startX: 0, startY: 0, startPanX: 0, startPanY: 0, moved: false });
  const sliderRef = useRef({ pointerId: null });

  const actualMeta = useImageMeta(actualUrl);
  const expectedMeta = useImageMeta(expectedUrl);
  const diffMeta = useImageMeta(diffUrl);
  const hostWidth = useElementWidth(hostRef);

  useEffect(() => {
    setActiveTab('output');
    setShowBoxes(true);
    setSliderSplit(52);
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setSelectedHotspot(null);
  }, [expectedUrl, actualUrl, diffUrl, expectedRenderUrl, actualRenderUrl, comparisonWidth, comparisonHeight, viewportWidth, viewportHeight]);

  useEffect(() => {
    setActualRenderStatus(actualRenderUrl ? 'loading' : 'idle');
    if (!actualRenderUrl) return undefined;

    const timeoutId = window.setTimeout(() => {
      setActualRenderStatus((prev) => (prev === 'loading' ? 'error' : prev));
    }, 8000);

    return () => window.clearTimeout(timeoutId);
  }, [actualRenderUrl]);

  useEffect(() => {
    setExpectedRenderStatus(expectedRenderUrl ? 'loading' : 'idle');
    if (!expectedRenderUrl) return undefined;

    const timeoutId = window.setTimeout(() => {
      setExpectedRenderStatus((prev) => (prev === 'loading' ? 'error' : prev));
    }, 8000);

    return () => window.clearTimeout(timeoutId);
  }, [expectedRenderUrl]);

  const normalizedBoxes = useMemo(() => {
    if (!Array.isArray(boxes)) return [];
    return boxes
      .map((box) => ({
        x: Number(box?.x),
        y: Number(box?.y),
        width: Number(box?.width),
        height: Number(box?.height)
      }))
      .filter((box) =>
        Number.isFinite(box.x) &&
        Number.isFinite(box.y) &&
        Number.isFinite(box.width) &&
        Number.isFinite(box.height) &&
        box.width > 0 &&
        box.height > 0
      );
  }, [boxes]);

  const stageWidth = Math.max(
    Number(comparisonWidth || 0),
    Number(viewportWidth || 0),
    Number(actualMeta.width || 0),
    Number(expectedMeta.width || 0),
    Number(diffMeta.width || 0),
    1
  );
  const stageHeight = Math.max(
    Number(comparisonHeight || 0),
    Number(viewportHeight || 0),
    Number(actualMeta.height || 0),
    Number(expectedMeta.height || 0),
    Number(diffMeta.height || 0),
    1
  );

  const baseScale = hostWidth > 0 && stageWidth > 0 ? Math.min(1, hostWidth / stageWidth) : 1;
  const displayHeight = Math.max(260, stageHeight * baseScale);
  const displayScale = baseScale * zoom;

  const outputReady = actualRenderUrl ? actualRenderStatus === 'ready' : actualMeta.status === 'ready';
  const outputErrored = actualRenderUrl ? actualRenderStatus === 'error' : actualMeta.status === 'error';
  const perfectReady = expectedRenderUrl ? expectedRenderStatus === 'ready' : expectedMeta.status === 'ready';
  const perfectErrored = expectedRenderUrl ? expectedRenderStatus === 'error' : expectedMeta.status === 'error';
  const sliderLeftReady = actualRenderUrl ? actualRenderStatus === 'ready' : actualMeta.status === 'ready';
  const sliderLeftErrored = actualRenderUrl ? actualRenderStatus === 'error' : actualMeta.status === 'error';

  const activeReady = activeTab === 'output'
    ? outputReady
    : activeTab === 'perfect'
      ? perfectReady
      : sliderLeftReady && diffMeta.status === 'ready';

  const activeErrored = activeTab === 'output'
    ? outputErrored
    : activeTab === 'perfect'
      ? perfectErrored
      : sliderLeftErrored || diffMeta.status === 'error';

  const resetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setSelectedHotspot(null);
  };

  const zoomAtPoint = (clientX, clientY, nextZoom) => {
    const content = contentRef.current;
    if (!content || !displayScale || !baseScale) return;

    const rect = content.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    const clampedZoom = clamp(nextZoom, 1, 4);
    const nextDisplayScale = baseScale * clampedZoom;
    const ux = (clientX - rect.left) / displayScale;
    const uy = (clientY - rect.top) / displayScale;
    const nextLeft = clientX - ux * nextDisplayScale;
    const nextTop = clientY - uy * nextDisplayScale;

    setZoom(clampedZoom);
    setPan((prev) => ({
      x: prev.x + (nextLeft - rect.left),
      y: prev.y + (nextTop - rect.top)
    }));
  };

  const zoomBy = (delta) => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const rect = viewport.getBoundingClientRect();
    zoomAtPoint(rect.left + rect.width / 2, rect.top + rect.height / 2, zoom + delta);
  };

  const focusHotspot = (box, index) => {
    const viewport = viewportRef.current;
    const content = contentRef.current;
    if (!viewport || !content || !baseScale) return;

    const viewportRect = viewport.getBoundingClientRect();
    const contentRect = content.getBoundingClientRect();
    if (!viewportRect.width || !viewportRect.height || !contentRect.width || !contentRect.height) return;

    const hotspotWidth = (box.width / 100) * stageWidth;
    const hotspotHeight = (box.height / 100) * stageHeight;
    const hotspotCenterX = ((box.x + box.width / 2) / 100) * stageWidth;
    const hotspotCenterY = ((box.y + box.height / 2) / 100) * stageHeight;

    const fitZoom = Math.min(
      viewportRect.width / Math.max(hotspotWidth * baseScale * 1.4, 1),
      viewportRect.height / Math.max(hotspotHeight * baseScale * 1.4, 1),
      4
    );
    const nextZoom = clamp(Math.max(1.2, fitZoom), 1, 4);
    const nextScale = baseScale * nextZoom;

    const desiredLeft = viewportRect.left + (viewportRect.width / 2) - hotspotCenterX * nextScale;
    const desiredTop = viewportRect.top + (viewportRect.height / 2) - hotspotCenterY * nextScale;

    setSelectedHotspot(index);
    setZoom(nextZoom);
    setPan((prev) => ({
      x: prev.x + (desiredLeft - contentRect.left),
      y: prev.y + (desiredTop - contentRect.top)
    }));
  };

  const onWheel = (event) => {
    if (!activeReady) return;
    event.preventDefault();
    const direction = event.deltaY > 0 ? -1 : 1;
    zoomAtPoint(event.clientX, event.clientY, zoom + direction * 0.18);
  };

  const onPointerDown = (event) => {
    if (!activeReady) return;
    if (activeTab === 'slider') return;
    if (event.button !== 0) return;

    panRef.current.pointerId = event.pointerId;
    panRef.current.startX = event.clientX;
    panRef.current.startY = event.clientY;
    panRef.current.startPanX = pan.x;
    panRef.current.startPanY = pan.y;
    panRef.current.moved = false;

    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch (_) {
      // Ignore capture errors.
    }
  };

  const onPointerMove = (event) => {
    if (panRef.current.pointerId == null || panRef.current.pointerId !== event.pointerId) return;
    const dx = event.clientX - panRef.current.startX;
    const dy = event.clientY - panRef.current.startY;
    panRef.current.moved = true;
    setPan({
      x: panRef.current.startPanX + dx,
      y: panRef.current.startPanY + dy
    });
  };

  const endPan = (event) => {
    if (panRef.current.pointerId == null) return;
    if (event && panRef.current.pointerId !== event.pointerId) return;
    panRef.current.pointerId = null;
  };

  const setSliderFromClientX = (clientX) => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const rect = viewport.getBoundingClientRect();
    if (!rect.width) return;
    setSliderSplit(clamp(((clientX - rect.left) / rect.width) * 100, 0, 100));
  };

  const onSliderPointerDown = (event) => {
    if (activeTab !== 'slider' || !activeReady) return;
    sliderRef.current.pointerId = event.pointerId;
    setSliderFromClientX(event.clientX);
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch (_) {
      // Ignore capture errors.
    }
  };

  const onSliderPointerMove = (event) => {
    if (sliderRef.current.pointerId == null || sliderRef.current.pointerId !== event.pointerId) return;
    setSliderFromClientX(event.clientX);
  };

  const endSlider = (event) => {
    if (sliderRef.current.pointerId == null) return;
    if (event && sliderRef.current.pointerId !== event.pointerId) return;
    sliderRef.current.pointerId = null;
  };

  const renderRasterLayer = (url, meta, alt, tone) => {
    if (!url || meta.status === 'idle') {
      return (
        <Placeholder
          title="Artifact not available."
          description="This visual artifact has not been generated for the current evaluation."
        />
      );
    }

    if (meta.status === 'error') {
      return (
        <Placeholder
          title="Artifact failed to load."
          description="Refresh the results page or replay the evaluation to regenerate this asset."
        />
      );
    }

    return (
      <div className="relative h-full w-full">
        <div className="absolute left-4 top-4 z-20">
          <StatusChip tone={tone}>{alt}</StatusChip>
        </div>

        {meta.status !== 'ready' && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-[#0b0d13]/80 backdrop-blur-sm">
            <Placeholder title="Loading artifact..." description="Preparing the visual panel." />
          </div>
        )}

        <div className="relative h-full w-full bg-white">
          <img
            src={url}
            alt={alt}
            className="absolute left-0 top-0"
            style={{
              width: `${stageWidth}px`,
              height: `${stageHeight}px`,
              objectFit: 'contain',
              objectPosition: 'top left',
              imageRendering: 'auto'
            }}
            loading="lazy"
          />
        </div>
      </div>
    );
  };

  const renderFrameLayer = (url, alt, tone, status, onReady, onError) => {
    if (!url || status === 'idle') {
      return (
        <Placeholder
          title="Render snapshot not available."
          description="This evaluation does not include a live render artifact for this panel."
        />
      );
    }

    if (status === 'error') {
      return (
        <Placeholder
          title="Render snapshot failed to load."
          description="Refresh the results page or replay the evaluation to regenerate this render."
        />
      );
    }

    return (
      <div className="relative h-full w-full">
        <div className="absolute left-4 top-4 z-20">
          <StatusChip tone={tone}>{alt}</StatusChip>
        </div>

        {status !== 'ready' && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-[#0b0d13]/80 backdrop-blur-sm">
            <Placeholder title="Loading render..." description="Preparing the high-fidelity review surface." />
          </div>
        )}

        <div className="relative h-full w-full overflow-hidden bg-white">
          <iframe
            key={url}
            src={url}
            title={alt}
            sandbox=""
            loading="lazy"
            onLoad={onReady}
            onError={onError}
            className="absolute left-0 top-0 block border-0 bg-white"
            style={{
              width: `${stageWidth}px`,
              height: `${stageHeight}px`,
              pointerEvents: 'none'
            }}
          />
        </div>
      </div>
    );
  };

  const renderHotspots = () => {
    if (!showBoxes || normalizedBoxes.length === 0) return null;

    return normalizedBoxes.map((box, index) => (
      <button
        key={`hotspot-${index}`}
        type="button"
        className={cn(
          'absolute z-30 overflow-hidden rounded-sm border-2 transition-all',
          selectedHotspot === index
            ? 'border-rose-400 bg-rose-500/18 shadow-[0_0_0_1px_rgba(251,113,133,0.35),0_0_22px_rgba(244,63,94,0.24)]'
            : 'border-rose-400/80 bg-rose-500/10 hover:bg-rose-500/16'
        )}
        style={{
          left: `${box.x}%`,
          top: `${box.y}%`,
          width: `${box.width}%`,
          height: `${box.height}%`
        }}
        onClick={(event) => {
          event.stopPropagation();
          focusHotspot(box, index);
        }}
      />
    ));
  };

  const renderStageContent = () => {
    if (activeErrored) {
      return (
        <Placeholder
          title="Visual review unavailable."
          description="One or more artifacts failed to load for this mode."
        />
      );
    }

    return (
      <div
        ref={viewportRef}
        className={cn(
          'relative overflow-hidden rounded-[1.5rem] border border-[#2a2f3a] bg-[#0b0d13]',
          activeTab === 'slider' ? 'cursor-col-resize' : activeReady ? 'cursor-grab' : 'cursor-default'
        )}
        style={{ height: `${displayHeight}px` }}
        onWheel={onWheel}
        onPointerDown={activeTab === 'slider' ? onSliderPointerDown : onPointerDown}
        onPointerMove={activeTab === 'slider' ? onSliderPointerMove : onPointerMove}
        onPointerUp={activeTab === 'slider' ? endSlider : endPan}
        onPointerCancel={activeTab === 'slider' ? endSlider : endPan}
        onPointerLeave={activeTab === 'slider' ? endSlider : endPan}
      >
        <div
          ref={contentRef}
          className="absolute left-0 top-0"
          style={{
            width: `${stageWidth}px`,
            height: `${stageHeight}px`,
            transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${displayScale})`,
            transformOrigin: 'top left',
            willChange: activeReady ? 'transform' : 'auto'
          }}
        >
          {activeTab === 'output' && (
            actualRenderUrl
              ? renderFrameLayer(
                  actualRenderUrl,
                  'Student Output',
                  'green',
                  actualRenderStatus,
                  () => setActualRenderStatus('ready'),
                  () => setActualRenderStatus('error')
                )
              : renderRasterLayer(actualUrl, actualMeta, 'Student Output', 'green')
          )}
          {activeTab === 'perfect' && (
            expectedRenderUrl
              ? renderFrameLayer(
                  expectedRenderUrl,
                  'Perfect Output',
                  'blue',
                  expectedRenderStatus,
                  () => setExpectedRenderStatus('ready'),
                  () => setExpectedRenderStatus('error')
                )
              : renderRasterLayer(expectedUrl, expectedMeta, 'Perfect Output', 'blue')
          )}
          {activeTab === 'slider' && (
            <div className="relative h-full w-full bg-white">
              <div className="absolute left-4 top-4 z-20">
                <StatusChip tone="green">Student Output</StatusChip>
              </div>
              <div className="absolute right-4 top-4 z-20">
                <StatusChip tone="red">Heatmap</StatusChip>
              </div>

              {!sliderLeftReady || diffMeta.status !== 'ready' ? (
                <div className="absolute inset-0 z-20 flex items-center justify-center bg-[#0b0d13]/80 backdrop-blur-sm">
                  <Placeholder title="Loading slider..." description="Preparing student output and heatmap." />
                </div>
              ) : null}

              {actualRenderUrl ? (
                <iframe
                  key={actualRenderUrl}
                  src={actualRenderUrl}
                  title="Student output render"
                  sandbox=""
                  loading="lazy"
                  onLoad={() => setActualRenderStatus('ready')}
                  onError={() => setActualRenderStatus('error')}
                  className="absolute left-0 top-0 block border-0 bg-white"
                  style={{
                    width: `${stageWidth}px`,
                    height: `${stageHeight}px`,
                    pointerEvents: 'none'
                  }}
                />
              ) : (
                <img
                  key={actualUrl}
                  src={actualUrl}
                  alt="Student output"
                  className="absolute left-0 top-0"
                  style={{
                    width: `${stageWidth}px`,
                    height: `${stageHeight}px`,
                    objectFit: 'contain',
                    objectPosition: 'top left',
                    imageRendering: 'auto'
                  }}
                  loading="lazy"
                />
              )}

              <div
                className="absolute inset-0 overflow-hidden"
                style={{ clipPath: `inset(0 0 0 ${sliderSplit}%)` }}
              >
                <img
                  key={diffUrl}
                  src={diffUrl}
                  alt="Heatmap"
                  className="absolute left-0 top-0"
                  style={{
                    width: `${stageWidth}px`,
                    height: `${stageHeight}px`,
                    objectFit: 'contain',
                    objectPosition: 'top left',
                    imageRendering: 'auto'
                  }}
                  loading="lazy"
                />
              </div>
            </div>
          )}

          {renderHotspots()}
        </div>

        {activeTab === 'slider' && activeReady && (
          <motion.div
            animate={{ left: `${sliderSplit}%` }}
            transition={MECHANICAL_TRANSITION}
            className="pointer-events-none absolute inset-y-0 z-40 flex w-12 -translate-x-1/2 flex-col items-center justify-center"
          >
            <div className="w-[2px] flex-1 bg-white shadow-[0_0_18px_rgba(255,255,255,0.95)]" />
            <div className="flex h-11 w-11 items-center justify-center rounded-full border border-white bg-[#11131a] text-white shadow-[0_12px_32px_rgba(0,0,0,0.38)]">
              <SlidersHorizontal size={16} />
            </div>
            <div className="w-[2px] flex-1 bg-white shadow-[0_0_18px_rgba(255,255,255,0.95)]" />
          </motion.div>
        )}
      </div>
    );
  };

  const tabs = [
    { id: 'output', label: 'Output', icon: <Eye size={15} /> },
    { id: 'perfect', label: 'Perfect Output', icon: <ImageIcon size={15} /> },
    { id: 'slider', label: 'Slider', icon: <SlidersHorizontal size={15} /> }
  ];

  return (
    <div className="overflow-hidden rounded-[2rem] border border-[#2a2f3a] bg-[#0f1117] text-[#f8f8f2] shadow-[0_24px_80px_rgba(0,0,0,0.28)]">
      <div className="border-b border-[#202432] bg-[linear-gradient(180deg,#141824_0%,#10131c_100%)] px-5 py-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold tracking-[0.04em] text-[#f8f8f2]">Visual Review</h3>
            <p className="mt-1 text-sm text-[#8f93a8]">
              Premium inspection view for student output, perfect reference, and heatmap mismatch.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <StatusChip tone={Number(mismatchPercentage || 0) <= 1 ? 'green' : Number(mismatchPercentage || 0) <= 5 ? 'blue' : 'red'}>
              {Number(mismatchPercentage || 0).toFixed(2)}% mismatch
            </StatusChip>
            <StatusChip tone="slate">Zoom {zoom.toFixed(2)}x</StatusChip>
          </div>
        </div>
      </div>

      <Tabs.Root value={activeTab} onValueChange={setActiveTab}>
        <div className="border-b border-[#202432] bg-[#11141d] px-4 py-3">
          <Tabs.List className="flex flex-wrap gap-2">
            {tabs.map((tab) => (
              <Tabs.Trigger
                key={tab.id}
                value={tab.id}
                className={cn(
                  'inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-all',
                  activeTab === tab.id
                    ? 'border-[#3a4154] bg-[#181b26] text-[#f8f8f2]'
                    : 'border-transparent bg-transparent text-[#8f93a8] hover:border-[#2a2f3a] hover:bg-[#151823] hover:text-[#f8f8f2]'
                )}
              >
                {tab.icon}
                {tab.label}
              </Tabs.Trigger>
            ))}
          </Tabs.List>
        </div>

        <div className="border-b border-[#202432] bg-[#11141d] px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setShowBoxes((prev) => !prev)}
                className={cn(
                  'rounded-full border px-3 py-1.5 text-xs font-medium transition',
                  showBoxes
                    ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300'
                    : 'border-[#303547] bg-[#181b26] text-[#a4a9bf] hover:text-[#f8f8f2]'
                )}
              >
                {showBoxes ? 'Hotspots on' : 'Hotspots off'}
              </button>
              <button
                type="button"
                onClick={() => zoomBy(0.2)}
                className="rounded-full border border-[#303547] bg-[#181b26] px-3 py-1.5 text-xs font-medium text-[#d7d9e4] transition hover:border-[#4b5268]"
              >
                <Plus size={14} />
              </button>
              <button
                type="button"
                onClick={() => zoomBy(-0.2)}
                className="rounded-full border border-[#303547] bg-[#181b26] px-3 py-1.5 text-xs font-medium text-[#d7d9e4] transition hover:border-[#4b5268]"
              >
                <Minus size={14} />
              </button>
              <button
                type="button"
                onClick={resetView}
                className="inline-flex items-center gap-2 rounded-full border border-[#303547] bg-[#181b26] px-3 py-1.5 text-xs font-medium text-[#d7d9e4] transition hover:border-[#4b5268]"
              >
                <RotateCcw size={14} />
                Reset View
              </button>
            </div>

            {activeTab === 'slider' && (
              <div className="flex items-center gap-3">
                <span className="text-xs text-[#8f93a8]">Split {Math.round(sliderSplit)}%</span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={sliderSplit}
                  onChange={(event) => setSliderSplit(clamp(Number(event.target.value), 0, 100))}
                  className="w-40 accent-emerald-500"
                  aria-label="Heatmap split"
                />
              </div>
            )}
          </div>

          {normalizedBoxes.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="text-[11px] uppercase tracking-[0.18em] text-[#6f748c]">Hotspots</span>
              {normalizedBoxes.slice(0, 10).map((box, index) => (
                <button
                  key={`chip-${index}`}
                  type="button"
                  onClick={() => focusHotspot(box, index)}
                  className={cn(
                    'rounded-full border px-3 py-1 text-xs font-medium transition',
                    selectedHotspot === index
                      ? 'border-rose-500/30 bg-rose-500/12 text-rose-200'
                      : 'border-[#303547] bg-[#181b26] text-[#a4a9bf] hover:text-[#f8f8f2]'
                  )}
                >
                  #{index + 1}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="bg-[radial-gradient(circle_at_top,_rgba(255,121,198,0.08),_transparent_36%),linear-gradient(180deg,#10131c_0%,#0d1018_100%)] p-5">
          <div ref={hostRef} className="w-full">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={MECHANICAL_TRANSITION}
              >
                {renderStageContent()}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </Tabs.Root>
    </div>
  );
}
