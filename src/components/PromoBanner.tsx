import { useCallback, useEffect, useRef, useState } from "react";

const BANNERS = [
  "🎉 新用户注册立减2元！立即开启南洋美食之旅 👉",
  "🔥 拉新激励即将上线！邀请好友拼桌赚佣金 💰",
];

/** 抬起时判定为「轻点」的最大位移（移动端手指抖动更大，略放宽） */
const TAP_MAX_DIST_PX = 32;
const TAP_MAX_MS = 750;

type PromoBannerProps = {
  /** 用户轻点横条（非大幅滑动切换）时回调，由父级决定打开登录或提示已登录 */
  onBannerTap: () => void;
};

/** 用原生横向滚动 + scroll-snap；轻点横条触发 onBannerTap */
export function PromoBanner({ onBannerTap }: PromoBannerProps) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const resumeTimerRef = useRef<number>(0);

  /** 仅在 pointerdown 时记录起点，不在 pointermove 里取消（避免移动端抖动误杀） */
  const gestureStartRef = useRef<{
    x: number;
    y: number;
    t: number;
  } | null>(null);

  /** 避免 pointerup + click 连续触发两次 */
  const tapHandledRef = useRef(false);
  const lastTapAtRef = useRef(0);

  const fireBannerTap = useCallback(() => {
    const now = Date.now();
    if (now - lastTapAtRef.current < 450) return;
    lastTapAtRef.current = now;
    onBannerTap();
  }, [onBannerTap]);

  const tryFinishTap = useCallback(
    (clientX: number, clientY: number) => {
      const s = gestureStartRef.current;
      gestureStartRef.current = null;
      if (!s || s.t === 0) return;
      const dt = Date.now() - s.t;
      if (dt > TAP_MAX_MS) return;
      const dist = Math.hypot(clientX - s.x, clientY - s.y);
      if (dist > TAP_MAX_DIST_PX) return;
      tapHandledRef.current = true;
      window.setTimeout(() => {
        tapHandledRef.current = false;
      }, 400);
      fireBannerTap();
    },
    [fireBannerTap]
  );

  const syncIndexFromScroll = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const w = el.clientWidth;
    if (w <= 0) return;
    const i = Math.round(el.scrollLeft / w);
    const clamped = Math.min(Math.max(0, i), BANNERS.length - 1);
    setIndex((prev) => (prev === clamped ? prev : clamped));
  }, []);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const onScroll = () => syncIndexFromScroll();
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [syncIndexFromScroll]);

  useEffect(() => {
    if (paused) return;
    const timer = window.setInterval(() => {
      const el = scrollerRef.current;
      if (!el) return;
      const w = el.clientWidth;
      if (w <= 0) return;
      const next = (Math.round(el.scrollLeft / w) + 1) % BANNERS.length;
      el.scrollTo({ left: next * w, behavior: "smooth" });
    }, 4000);
    return () => window.clearInterval(timer);
  }, [paused]);

  const scheduleResume = useCallback(() => {
    window.clearTimeout(resumeTimerRef.current);
    setPaused(true);
    resumeTimerRef.current = window.setTimeout(() => {
      setPaused(false);
    }, 6000);
  }, []);

  useEffect(() => {
    return () => window.clearTimeout(resumeTimerRef.current);
  }, []);

  const goTo = useCallback(
    (i: number) => {
      const el = scrollerRef.current;
      if (!el) return;
      const w = el.clientWidth;
      if (w <= 0) return;
      scheduleResume();
      el.scrollTo({ left: i * w, behavior: "smooth" });
    },
    [scheduleResume]
  );

  const onScrollerPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    scheduleResume();
    gestureStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      t: Date.now(),
    };
  };

  const onScrollerPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    // 触摸由下方原生 touchend 处理，避免与 Pointer 重复触发登录
    if (e.pointerType === "touch") return;
    if (e.pointerType === "mouse" && e.button !== 0) return;
    tryFinishTap(e.clientX, e.clientY);
  };

  const onScrollerPointerCancel = () => {
    gestureStartRef.current = null;
  };

  /** 部分移动端对可滚动区域只派发 click，用其兜底（与 pointer 去重） */
  const onScrollerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest("button")) return;
    if (tapHandledRef.current) return;
    fireBannerTap();
  };

  /** 移动端对 overflow 横向滚动区常不派发完整 Pointer 链，用 touchstart/touchend 判定轻点 */
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    let start: { x: number; y: number; t: number } | null = null;

    const onTouchStart = (ev: TouchEvent) => {
      const t = ev.touches[0];
      if (!t) return;
      scheduleResume();
      start = { x: t.clientX, y: t.clientY, t: Date.now() };
    };

    const onTouchEnd = (ev: TouchEvent) => {
      const t = ev.changedTouches[0];
      if (!t || !start) return;
      const dt = Date.now() - start.t;
      const dist = Math.hypot(t.clientX - start.x, t.clientY - start.y);
      start = null;
      if (dt > TAP_MAX_MS || dist > TAP_MAX_DIST_PX) return;
      tapHandledRef.current = true;
      window.setTimeout(() => {
        tapHandledRef.current = false;
      }, 400);
      fireBannerTap();
    };

    const onTouchCancel = () => {
      start = null;
    };

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchend", onTouchEnd, { passive: true });
    el.addEventListener("touchcancel", onTouchCancel, { passive: true });
    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchend", onTouchEnd);
      el.removeEventListener("touchcancel", onTouchCancel);
    };
  }, [fireBannerTap, scheduleResume]);

  return (
    <section
      className="my-2 w-full overflow-hidden rounded-xl shadow-[0_2px_12px_rgba(0,0,0,0.06)]"
      aria-label="优惠活动与新用户立减"
    >
      <div className="mx-auto w-full">
        <div className="relative overflow-hidden rounded-xl">
          <div
            ref={scrollerRef}
            className="hide-scrollbar scroll-x-touch flex h-12 cursor-pointer snap-x snap-mandatory overflow-x-auto overflow-y-hidden md:h-14"
            style={{ WebkitOverflowScrolling: "touch" }}
            onPointerDown={onScrollerPointerDown}
            onPointerUp={onScrollerPointerUp}
            onPointerCancel={onScrollerPointerCancel}
            onClick={onScrollerClick}
            onPointerEnter={() => setPaused(true)}
            onPointerLeave={() => setPaused(false)}
          >
            {BANNERS.map((text) => (
              <div
                key={text}
                className="flex h-12 w-full min-w-full shrink-0 snap-center snap-always items-center bg-gradient-to-r from-[#FFC300] to-[#FF9900] px-3 md:h-14 md:px-5"
                role="group"
                aria-roledescription="slide"
              >
                <p className="w-full select-none text-sm font-black text-gray-900 md:text-base">
                  <span className="block w-full truncate">{text}</span>
                </p>
              </div>
            ))}
          </div>

          <div className="pointer-events-none absolute bottom-1.5 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1.5">
            {BANNERS.map((_, i) => (
              <button
                key={`dot-${i}`}
                type="button"
                aria-label={`切换到第 ${i + 1} 条`}
                aria-current={i === index}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  goTo(i);
                }}
                className={`pointer-events-auto h-1.5 w-1.5 rounded-full transition-all ${
                  i === index ? "w-4 bg-gray-900" : "bg-gray-900/40"
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
