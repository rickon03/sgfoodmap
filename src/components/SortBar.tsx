export type SortMode = "default" | "distance" | "rating" | "price";
export type PriceOrder = "asc" | "desc";

type SortBarProps = {
  mode: SortMode;
  priceOrder: PriceOrder;
  onChangeMode: (m: SortMode) => void;
  onTogglePriceOrder: () => void;
};

export function SortBar({
  mode,
  priceOrder,
  onChangeMode,
  onTogglePriceOrder,
}: SortBarProps) {
  const btnCls = (active: boolean) =>
    [
      "rounded-full px-3 py-1.5 text-xs font-semibold transition sm:text-sm",
      active
        ? "bg-meituan text-gray-900 ring-1 ring-black/10"
        : "bg-white text-gray-600 ring-1 ring-gray-200 hover:bg-gray-50",
    ].join(" ");

  return (
    <section className="px-4 pt-3 md:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="hide-scrollbar scroll-x-touch flex items-center gap-2 overflow-x-auto pb-1">
          <span className="shrink-0 text-xs font-semibold text-gray-400 sm:text-sm">
            排序
          </span>
          <button
            type="button"
            className={btnCls(mode === "default")}
            onClick={() => onChangeMode("default")}
          >
            综合排序
          </button>
          <button
            type="button"
            className={btnCls(mode === "distance")}
            onClick={() => onChangeMode("distance")}
          >
            距离最近
          </button>
          <button
            type="button"
            className={btnCls(mode === "rating")}
            onClick={() => onChangeMode("rating")}
          >
            评分最高
          </button>
          <button
            type="button"
            className={btnCls(mode === "price")}
            onClick={() => {
              if (mode === "price") {
                onTogglePriceOrder();
              } else {
                onChangeMode("price");
              }
            }}
          >
            {priceOrder === "asc" ? "价格最低" : "价格最高"}
          </button>
        </div>
      </div>
    </section>
  );
}

