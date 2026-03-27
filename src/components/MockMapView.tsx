import { MapPin, Star } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import type { Restaurant } from "../data/restaurants";
import {
  computeBounds,
  coordsToPercent,
  coordsToPercentValues,
  miniPopPlacement,
} from "../utils/mapPinLayout";

type MockMapViewProps = {
  restaurants: Restaurant[];
  onOpenRestaurant: (r: Restaurant) => void;
  embedded?: boolean;
};

function PinPopoverContent({
  r,
  onOpenDetail,
}: {
  r: Restaurant;
  onOpenDetail: () => void;
}) {
  return (
    <>
      <p className="break-words text-sm font-bold leading-snug text-gray-900">
        {r.name}
      </p>
      <div className="mt-1 flex flex-wrap items-center gap-x-1 gap-y-0.5 text-orange-600">
        <Star className="h-3.5 w-3.5 shrink-0 fill-orange-400 text-orange-500" />
        <span className="text-xs font-semibold sm:text-sm">
          {r.rating.toFixed(1)}
        </span>
        <span className="min-w-0 max-w-full break-words text-[11px] leading-snug text-gray-500 sm:text-xs">
          · {r.location}
        </span>
      </div>
      {r.signature_dishes ? (
        <p className="mt-1.5 break-words text-[11px] leading-relaxed text-gray-600 sm:text-xs">
          {r.signature_dishes}
        </p>
      ) : null}
      <button
        type="button"
        onClick={onOpenDetail}
        className="btn-meituan mt-2 w-full rounded-lg py-2 text-xs font-bold shadow-md sm:text-sm"
      >
        去看看
      </button>
    </>
  );
}

export function MockMapView({
  restaurants,
  onOpenRestaurant,
  embedded = false,
}: MockMapViewProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [portalEl, setPortalEl] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setPortalEl(document.body);
  }, []);

  const bounds = useMemo(
    () => computeBounds(restaurants),
    [restaurants]
  );

  const activeRestaurant = useMemo(
    () => restaurants.find((r) => r.id === activeId) ?? null,
    [restaurants, activeId]
  );

  useEffect(() => {
    setActiveId(null);
  }, [restaurants]);

  const popLayout = useMemo(() => {
    if (!activeRestaurant) return null;
    const pos = coordsToPercent(activeRestaurant.coordinates, bounds);
    const { topPct } = coordsToPercentValues(
      activeRestaurant.coordinates,
      bounds
    );
    const pop = miniPopPlacement(topPct);
    const popPosClass =
      pop.vertical === "above"
        ? "bottom-full left-1/2 mb-2 -translate-x-1/2"
        : "top-full left-1/2 mt-2 -translate-x-1/2";
    return { pos, popPosClass, r: activeRestaurant };
  }, [activeRestaurant, bounds]);

  useEffect(() => {
    if (!popLayout) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setActiveId(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [popLayout]);

  /** 移动端底部抽屉打开时禁止背后滚动 */
  useEffect(() => {
    if (!popLayout) return;
    const mq = window.matchMedia("(max-width: 767px)");
    if (!mq.matches) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [popLayout]);

  const mobileSheet =
    popLayout &&
    portalEl &&
    createPortal(
      <div
        className="fixed inset-0 z-[200] flex flex-col justify-end md:hidden"
        role="presentation"
      >
        <button
          type="button"
          className="absolute inset-0 bg-black/40"
          aria-label="关闭"
          onClick={() => setActiveId(null)}
        />
        <div
          className="map-mini-pop relative mx-auto w-full max-w-lg rounded-t-2xl border border-gray-200 bg-white shadow-2xl"
          style={{
            paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))",
          }}
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-label={`${popLayout.r.name} 简介`}
        >
          <div className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-gray-200" />
          <div className="max-h-[min(65dvh,480px)] min-w-0 overflow-y-auto overflow-x-hidden px-4 pb-3 pt-2">
            <PinPopoverContent
              r={popLayout.r}
              onOpenDetail={() => onOpenRestaurant(popLayout.r)}
            />
          </div>
        </div>
      </div>,
      portalEl
    );

  return (
    <section
      className={
        embedded ? "pb-0 pt-0" : "px-4 pb-2 pt-4 md:px-6 lg:px-8"
      }
    >
      <div className={embedded ? "w-full" : "mx-auto max-w-7xl"}>
        <div
          className={`relative isolate w-full rounded-2xl border border-gray-200/90 shadow-md ring-1 ring-black/5 ${
            embedded
              ? "min-h-[min(64vh,480px)] lg:min-h-[min(72vh,640px)]"
              : "min-h-[min(68vh,520px)] sm:min-h-[min(70vh,600px)]"
          }`}
          role="application"
          aria-label="模拟地图"
          onClick={() => setActiveId(null)}
        >
          <div
            className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl"
            aria-hidden
          >
            <div className="absolute inset-0 bg-gradient-to-br from-sky-100/90 via-[#dfe8f0] to-emerald-50/80" />
            <div
              className="pointer-events-none absolute inset-0 opacity-[0.35]"
              style={{
                backgroundImage: `
                linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px),
                linear-gradient(rgba(255,255,255,0.45) 1px, transparent 1px),
                linear-gradient(105deg, transparent 40%, rgba(180,190,200,0.25) 40%, rgba(180,190,200,0.25) 41%, transparent 41%),
                linear-gradient(-18deg, transparent 55%, rgba(160,170,185,0.2) 55%, rgba(160,170,185,0.2) 56%, transparent 56%)
              `,
                backgroundSize: "28px 28px, 28px 28px, 100% 100%, 100% 100%",
              }}
            />
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_30%_20%,rgba(255,255,255,0.5),transparent_50%)]" />
          </div>

          {restaurants.length === 0 ? (
            <div className="relative z-10 flex min-h-[12rem] items-center justify-center p-6 text-center text-sm text-gray-500">
              当前筛选下暂无店铺，请切换列表模式调整条件
            </div>
          ) : (
            <>
              {restaurants.map((r) => {
                const pos = coordsToPercent(r.coordinates, bounds);
                const isOn = activeId === r.id;
                return (
                  <div
                    key={r.id}
                    className="absolute z-10 -translate-x-1/2 -translate-y-full"
                    style={{ left: pos.left, top: pos.top }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      aria-label={`${r.name}，评分 ${r.rating}`}
                      aria-pressed={isOn}
                      onClick={() =>
                        setActiveId((id) => (id === r.id ? null : r.id))
                      }
                      className="flex flex-col items-center gap-0.5 drop-shadow-md transition-transform duration-200 hover:scale-110 active:scale-95"
                    >
                      <MapPin
                        className={`h-9 w-9 sm:h-10 sm:w-10 ${
                          isOn
                            ? "fill-red-600 text-red-700"
                            : "fill-red-500 text-red-600"
                        }`}
                        strokeWidth={1.5}
                      />
                    </button>
                  </div>
                );
              })}

              {/* 桌面/大屏：锚定在图钉旁；宽度相对地图用 max-w，避免 100vw 比地图宽导致裁切 */}
              {popLayout && (
                <div
                  className="map-mini-pop absolute z-[100] hidden -translate-x-1/2 -translate-y-full md:block"
                  style={{ left: popLayout.pos.left, top: popLayout.pos.top }}
                  onClick={(e) => e.stopPropagation()}
                  role="dialog"
                  aria-label={`${popLayout.r.name} 简介`}
                >
                  <div
                    className={`absolute w-[min(15.5rem,calc(100vw-2rem))] max-w-[min(15.5rem,calc(100vw-2rem))] ${popLayout.popPosClass}`}
                  >
                    <div className="max-h-[min(42vh,240px)] min-w-0 overflow-y-auto overflow-x-hidden rounded-xl border border-gray-200 bg-white p-2.5 shadow-xl shadow-black/20">
                      <PinPopoverContent
                        r={popLayout.r}
                        onOpenDetail={() => onOpenRestaurant(popLayout.r)}
                      />
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
      {mobileSheet}
    </section>
  );
}
