import { useCallback, useEffect, useRef, useState } from "react";

const BANNERS = [
  "🎉 新用户注册立减2元！立即开启南洋美食之旅 👉",
  "🔥 拉新激励即将上线！邀请好友拼桌赚佣金 💰",
];

/** 判定为「横滑切下一条」的最小水平位移（px） */
const SWIPE_X_PX = 48;
/** 判定为「轻点打开登录」的最大总位移（px） */
const TAP_MAX_DIST_PX = 28;
const TAP_MAX_MS = 800;

type PromoBannerProps = {
  onBannerTap: () => void;
};

/**
 * 非 overflow 横向滚动：避免 touch-action: pan-x 与滚动容器吞掉轻点。
 * 叠层轮播 + 手势：小幅位移视为轻点（登录），明显横滑仅切换文案。
 */
export function PromoBanner({ onBannerTap }: PromoBannerProps) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const resumeTimerRef = useRef<number>(0);

  const startRef = useRef<{ x: number; y: number; t: number } | null>(null);
  const lastTapAtRef = useRef(0);

  const scheduleResume = useCallback(() => {
    window.clearTimeout(resumeTimerRef.current);
    setPaused(true);
    resumeTimerRef.current = window.setTimeout(() => setPaused(false), 6000);
  }, []);

  useEffect(() => {
    return () => window.clearTimeout(resumeTimerRef.current);
  }, []);

  useEffect(() => {
    if (paused) return;
    const timer = window.setInterval(() => {
      setIndex((prev) => (prev + 1) % BANNERS.length);
    }, 4000);
    return () => window.clearInterval(timer);
  }, [paused]);

  const goPrev = useCallback(() => {
    setIndex((prev) => (prev - 1 + BANNERS.length) % BANNERS.length);
  }, []);

  const goNext = useCallback(() => {
    setIndex((prev) => (prev + 1) % BANNERS.length);
  }, []);

  const goTo = useCallback(
    (i: number) => {
      scheduleResume();
      setIndex(i);
    },
    [scheduleResume]
  );

  const fireLogin = useCallback(() => {
    const now = Date.now();
    if (now - lastTapAtRef.current < 400) return;
    lastTapAtRef.current = now;
    onBannerTap();
  }, [onBannerTap]);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    scheduleResume();
    startRef.current = { x: e.clientX, y: e.clientY, t: Date.now() };
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  };

  const finishGesture = (clientX: number, clientY: number) => {
    const s = startRef.current;
    startRef.current = null;
    if (!s) return;
    const dt = Date.now() - s.t;
    const dx = clientX - s.x;
    const dy = clientY - s.y;

    if (dt > TAP_MAX_MS) return;

    if (Math.abs(dx) >= SWIPE_X_PX && Math.abs(dx) > Math.abs(dy)) {
      if (dx > 0) goPrev();
      else goNext();
      return;
    }

    if (Math.hypot(dx, dy) <= TAP_MAX_DIST_PX) {
      fireLogin();
    }
  };

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    finishGesture(e.clientX, e.clientY);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  };

  const onPointerCancel = () => {
    startRef.current = null;
  };

  return (
    <section
      className="my-2 w-full overflow-hidden rounded-xl shadow-[0_2px_12px_rgba(0,0,0,0.06)]"
      aria-label="优惠活动与新用户立减"
    >
      <div className="mx-auto w-full">
        <div className="relative overflow-hidden rounded-xl">
          {/* 无 overflow-x scroll、无 pan-x，移动端轻点可稳定触发 */}
          <div
            className="relative h-12 cursor-pointer touch-manipulation md:h-14"
            style={{ touchAction: "manipulation" }}
            onPointerDown={onPointerDown}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerCancel}
            onPointerEnter={() => setPaused(true)}
            onPointerLeave={() => setPaused(false)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                fireLogin();
              }
            }}
            aria-label="查看优惠，点击进入登录"
          >
            {BANNERS.map((text, i) => (
              <p
                key={text}
                className={`pointer-events-none absolute inset-0 flex select-none items-center bg-gradient-to-r from-[#FFC300] to-[#FF9900] px-3 text-sm font-black text-gray-900 transition-opacity duration-500 md:px-5 md:text-base ${
                  i === index ? "opacity-100" : "opacity-0"
                }`}
                aria-hidden={i !== index}
              >
                <span className="block w-full truncate">{text}</span>
              </p>
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
