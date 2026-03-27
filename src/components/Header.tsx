import { MapPin, UserCircle } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";

type HeaderProps = {
  isLoggedIn: boolean;
  username: string;
  onLoginClick: () => void;
  onProfileClick: () => void;
};

export function Header({
  isLoggedIn,
  username,
  onLoginClick,
  onProfileClick,
}: HeaderProps) {
  const [locText, setLocText] = useState("正在获取定位...");
  const barRef = useRef<HTMLDivElement>(null);
  const [barHeightPx, setBarHeightPx] = useState(88);

  useEffect(() => {
    const t = window.setTimeout(() => {
      setLocText("📍 当前位置：南洋理工大学附近");
    }, 1000);
    return () => window.clearTimeout(t);
  }, []);

  useLayoutEffect(() => {
    const el = barRef.current;
    if (!el) return;
    const update = () => setBarHeightPx(el.offsetHeight);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [isLoggedIn, username]);

  return (
    <header className="relative">
      {/* fixed：脱离文档流，避免 sticky 在部分环境下不生效；占位块保持布局 */}
      <div
        ref={barRef}
        id="header-sticky-bar"
        className="fixed inset-x-0 top-0 z-50 bg-[#FFC300] shadow-sm"
      >
        <div className="mx-auto w-full max-w-7xl space-y-1 px-4 py-2.5 md:space-y-1.5 md:px-6 md:py-3 lg:px-8">
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 flex-1 items-center gap-1.5 text-[11px] leading-snug text-gray-900 sm:gap-2 sm:text-sm">
              <MapPin
                className="h-3.5 w-3.5 shrink-0 text-gray-900 sm:h-4 sm:w-4"
                strokeWidth={2.25}
                aria-hidden
              />
              <span className="min-w-0 truncate font-medium">{locText}</span>
            </div>
            <div className="shrink-0">
              {!isLoggedIn ? (
                <button
                  type="button"
                  onClick={onLoginClick}
                  className="rounded-full bg-gray-900 px-3 py-1.5 text-[11px] font-bold text-meituan shadow-md transition hover:bg-gray-800 active:scale-[0.98] sm:px-4 sm:py-2 sm:text-sm"
                >
                  登录/注册
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onProfileClick}
                  className="flex items-center gap-1 rounded-full border border-gray-900/20 bg-white/90 py-1 pl-1.5 pr-2.5 text-[11px] font-semibold text-gray-900 transition hover:bg-white sm:gap-1.5 sm:py-1.5 sm:pl-2 sm:pr-3 sm:text-sm"
                >
                  <UserCircle
                    className="h-6 w-6 text-gray-900 sm:h-7 sm:w-7"
                    strokeWidth={1.5}
                    aria-hidden
                  />
                  <span className="max-w-20 truncate">{username || "我的"}</span>
                </button>
              )}
            </div>
          </div>

          <div className="min-w-0">
            <h1 className="text-[clamp(1rem,4.5vw,1.5rem)] font-black leading-tight tracking-tight text-gray-900">
              <span className="inline-block rounded-lg bg-gray-900 px-2 py-0.5 text-meituan shadow-sm ring-1 ring-black/10 sm:px-3 sm:py-1">
                新加坡校园
              </span>
            </h1>
          </div>
        </div>
      </div>

      <div
        className="shrink-0"
        style={{ height: barHeightPx }}
        aria-hidden
      />

      {/* 与改版前整段 Header 一致：美团黄底 */}
      <div className="border-b border-black/10 bg-meituan">
        <div className="mx-auto w-full max-w-7xl px-4 pb-2 pt-2 md:px-6 md:pb-2.5 md:pt-2 lg:px-8">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
            <p className="text-xs font-medium text-gray-800/80 sm:text-sm">
              南洋美食地图
            </p>
            <p className="line-clamp-1 text-[11px] text-gray-900/70 sm:max-w-md sm:text-right sm:text-sm">
              拯救大学生的选择困难症
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}
