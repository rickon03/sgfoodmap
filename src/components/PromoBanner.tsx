import { useCallback, useEffect, useRef, useState } from "react";

const BANNERS = [
  "🎉 新用户注册立减2元！立即开启南洋美食之旅 👉",
  "🔥 拉新激励即将上线！邀请好友拼桌赚佣金 💰",
];

const SWIPE_PX = 40;

export function PromoBanner() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const dragStartX = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (paused) return;
    const timer = window.setInterval(() => {
      setIndex((prev) => (prev + 1) % BANNERS.length);
    }, 4000);

    return () => {
      window.clearInterval(timer);
    };
  }, [paused]);

  const goPrev = useCallback(() => {
    setIndex((prev) => (prev - 1 + BANNERS.length) % BANNERS.length);
  }, []);

  const goNext = useCallback(() => {
    setIndex((prev) => (prev + 1) % BANNERS.length);
  }, []);

  const endDragIfNeeded = useCallback(
    (clientX: number, pointerId: number, pointerType: string) => {
      const el = containerRef.current;
      if (!el || dragStartX.current == null) return;

      const delta = clientX - dragStartX.current;
      dragStartX.current = null;
      try {
        el.releasePointerCapture(pointerId);
      } catch {
        /* 已释放或非当前 capture */
      }

      if (Math.abs(delta) >= SWIPE_PX) {
        if (delta > 0) goPrev();
        else goNext();
      }
      if (pointerType === "touch") setPaused(false);
    },
    [goNext, goPrev]
  );

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    dragStartX.current = e.clientX;
    e.currentTarget.setPointerCapture(e.pointerId);
    if (e.pointerType === "touch") setPaused(true);
  };

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (dragStartX.current == null) return;
    endDragIfNeeded(e.clientX, e.pointerId, e.pointerType);
  };

  const onPointerCancel = (e: React.PointerEvent<HTMLDivElement>) => {
    dragStartX.current = null;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    if (e.pointerType === "touch") setPaused(false);
  };

  return (
    <section className="my-2 w-full overflow-hidden rounded-xl shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
      <div className="mx-auto w-full">
        <div className="overflow-hidden rounded-xl">
          <div
            ref={containerRef}
            className="relative h-12 cursor-grab active:cursor-grabbing md:h-14"
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
            onPointerDown={onPointerDown}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerCancel}
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

            <div className="pointer-events-none absolute bottom-1.5 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1.5">
              {BANNERS.map((_, i) => (
                <button
                  key={`dot-${i}`}
                  type="button"
                  aria-label={`切换到第 ${i + 1} 条`}
                  onClick={() => setIndex(i)}
                  className={`pointer-events-auto h-1.5 w-1.5 rounded-full transition-all ${
                    i === index ? "w-4 bg-gray-900" : "bg-gray-900/40"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
