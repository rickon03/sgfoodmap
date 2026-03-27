import { useCallback, useEffect, useRef, useState } from "react";

const BANNERS = [
  "🎉 新用户注册立减2元！立即开启南洋美食之旅 👉",
  "🔥 拉新激励即将上线！邀请好友拼桌赚佣金 💰",
];

/** 用原生横向滚动 + scroll-snap，手机端可手指拖动切换（避免仅靠 Pointer 与页面纵向滚动抢手势） */
export function PromoBanner() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const resumeTimerRef = useRef<number>(0);

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

  const goTo = useCallback((i: number) => {
    const el = scrollerRef.current;
    if (!el) return;
    const w = el.clientWidth;
    if (w <= 0) return;
    scheduleResume();
    el.scrollTo({ left: i * w, behavior: "smooth" });
  }, [scheduleResume]);

  return (
    <section className="my-2 w-full overflow-hidden rounded-xl shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
      <div className="mx-auto w-full">
        <div className="relative overflow-hidden rounded-xl">
          <div
            ref={scrollerRef}
            className="hide-scrollbar scroll-x-touch flex h-12 snap-x snap-mandatory overflow-x-auto overflow-y-hidden md:h-14"
            style={{ WebkitOverflowScrolling: "touch" }}
            onPointerDown={() => scheduleResume()}
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
                onClick={() => goTo(i)}
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
