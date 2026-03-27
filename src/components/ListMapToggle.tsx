export type ViewMode = "list" | "map";

type ListMapToggleProps = {
  mode: ViewMode;
  onChange: (m: ViewMode) => void;
};

export function ListMapToggle({ mode, onChange }: ListMapToggleProps) {
  const seg =
    "relative flex-1 rounded-lg py-2 text-center text-sm transition-all duration-200 sm:py-2.5";

  return (
    <section className="w-full" aria-label="列表与地图切换">
      <div
        role="tablist"
        className="flex gap-0.5 rounded-xl bg-white/60 p-1"
      >
        <button
          type="button"
          role="tab"
          aria-selected={mode === "list"}
          onClick={() => onChange("list")}
          className={`${seg} ${
            mode === "list"
              ? "bg-white font-bold text-gray-900 shadow-sm"
              : "font-medium text-gray-500 hover:text-gray-700"
          }`}
        >
          列表模式
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === "map"}
          onClick={() => onChange("map")}
          className={`${seg} ${
            mode === "map"
              ? "bg-white font-bold text-gray-900 shadow-sm"
              : "font-medium text-gray-500 hover:text-gray-700"
          }`}
        >
          地图模式
        </button>
      </div>
    </section>
  );
}
