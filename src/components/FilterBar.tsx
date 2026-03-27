import { Check, ChevronDown } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { PriceFilterSelection } from "../data/restaurants";
import {
  CATEGORIES,
  PRICE_OPTIONS,
  isPriceFilterActive,
  priceFilterButtonLabel,
} from "../data/restaurants";
import {
  UNIVERSITIES,
  getSubLocationOptions,
  type University,
} from "../data/universities";
import type { PriceOrder, SortMode } from "./SortBar";

export type ActiveDropdown = "university" | "category" | "sort" | "filter" | null;

type FilterBarProps = {
  university: University;
  subLocation: string;
  category: string;
  categoryMultiSelect: boolean;
  selectedCategories: string[];
  onCategoryMultiSelectChange: (multi: boolean) => void;
  onToggleCategoryMulti: (c: string) => void;
  onUniversity: (v: University) => void;
  onSubLocation: (v: string) => void;
  onCategory: (v: string) => void;
  priceFilter: PriceFilterSelection;
  onPriceFilterChange: (v: PriceFilterSelection) => void;
  sortMode: SortMode;
  priceOrder: PriceOrder;
  onSortMode: (m: SortMode) => void;
  onTogglePriceOrder: () => void;
  onClearCategoryFilter: () => void;
};

function shortUniversityLabel(u: University): string {
  if (u === "全部") return "高校";
  if (u.includes("NTU")) return "NTU";
  if (u.includes("NUS")) return "NUS";
  return u;
}

function sortCompactLabel(mode: SortMode, priceOrder: PriceOrder): string {
  switch (mode) {
    case "default":
      return "排序";
    case "distance":
      return "距离";
    case "rating":
      return "评分";
    case "price":
      return priceOrder === "asc" ? "价低" : "价高";
    default:
      return "排序";
  }
}

function digitsOnly(raw: string): string {
  return raw.replace(/\D/g, "");
}

function parsePositiveInt(s: string): number | undefined {
  const t = s.trim();
  if (t === "") return undefined;
  const n = Number.parseInt(t, 10);
  if (!Number.isFinite(n) || n < 1) return undefined;
  return n;
}

function categoryTriggerLabel(
  multi: boolean,
  single: string,
  selected: string[]
): string {
  if (multi) {
    if (selected.length === 0) return "品类";
    if (selected.length === 1) return selected[0]!;
    return `已选${selected.length}类`;
  }
  return single === "全部" ? "品类" : single;
}

function triggerTextClass(open: boolean, active: boolean): string {
  if (open || active) return "text-orange-600";
  return "text-gray-700";
}

export function FilterBar({
  university,
  subLocation,
  category,
  categoryMultiSelect,
  selectedCategories,
  onCategoryMultiSelectChange,
  onToggleCategoryMulti,
  onUniversity,
  onSubLocation,
  onCategory,
  priceFilter,
  onPriceFilterChange,
  sortMode,
  priceOrder,
  onSortMode,
  onTogglePriceOrder,
  onClearCategoryFilter,
}: FilterBarProps) {
  const [activeDropdown, setActiveDropdown] = useState<ActiveDropdown>(null);
  const [customMin, setCustomMin] = useState("");
  const [customMax, setCustomMax] = useState("");

  const showSubLocation = university !== "全部";
  const subOptions = useMemo(
    () => (showSubLocation ? getSubLocationOptions(university) : ([] as readonly string[])),
    [showSubLocation, university]
  );

  const filterHasExtra =
    isPriceFilterActive(priceFilter) ||
    (showSubLocation && subLocation !== "全部");

  const categoryTriggerActive = categoryMultiSelect
    ? selectedCategories.length > 0
    : category !== "全部";

  const closeDropdown = useCallback(() => setActiveDropdown(null), []);

  useEffect(() => {
    if (activeDropdown !== "filter") return;
    if (priceFilter.kind === "range") {
      setCustomMin(
        priceFilter.min != null ? String(priceFilter.min) : ""
      );
      setCustomMax(
        priceFilter.max != null ? String(priceFilter.max) : ""
      );
    } else {
      setCustomMin("");
      setCustomMax("");
    }
  }, [activeDropdown, priceFilter]);

  const toggleDropdown = useCallback((id: NonNullable<ActiveDropdown>) => {
    setActiveDropdown((prev) => (prev === id ? null : id));
  }, []);

  useEffect(() => {
    if (!activeDropdown) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeDropdown();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [activeDropdown, closeDropdown]);

  /** 选中行：浅底 + 字重，避免与 hover 抢对比 */
  const rowSelected =
    "bg-orange-50/50 font-semibold text-gray-900";
  const rowDefault = "text-gray-900 hover:bg-gray-50/90";
  const rowBase = "flex w-full text-left text-sm transition-colors";

  const panelMaxH =
    activeDropdown === "category"
      ? "max-h-[min(28vh,220px)]"
      : activeDropdown === "filter"
        ? "max-h-[min(40vh,320px)]"
        : "max-h-[min(48vh,380px)]";

  const dropdownPanel = activeDropdown && (
    <div
      className={`absolute left-0 right-0 top-full z-50 mt-0 w-full overflow-y-auto overflow-x-hidden rounded-t-none rounded-b-2xl border border-t-0 border-gray-100 bg-white shadow-md ${panelMaxH}`}
      role="listbox"
      onClick={(e) => e.stopPropagation()}
    >
      {activeDropdown === "university" && (
        <ul className="py-0">
          {UNIVERSITIES.map((u) => (
            <li
              key={u}
              className="border-b border-gray-50 last:border-b-0"
            >
              <button
                type="button"
                className={`${rowBase} items-center px-4 py-3 ${
                  university === u ? rowSelected : rowDefault
                }`}
                onClick={() => {
                  onUniversity(u);
                  if (u === "全部") onSubLocation("全部");
                  closeDropdown();
                }}
              >
                {u}
              </button>
            </li>
          ))}
        </ul>
      )}

      {activeDropdown === "category" && (
        <div>
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 px-4 pb-2 pt-3 mb-2">
            <span className="text-xs font-medium text-gray-500">选择品类</span>
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                className={`rounded-full px-3 py-1 text-xs font-bold transition ${
                  categoryMultiSelect
                    ? "pill-meituan-active ring-1 ring-black/10"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
                onClick={() =>
                  onCategoryMultiSelectChange(!categoryMultiSelect)
                }
              >
                多选
              </button>
              <button
                type="button"
                className="rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-700 transition hover:bg-gray-200"
                onClick={() => {
                  onClearCategoryFilter();
                  closeDropdown();
                }}
              >
                清除
              </button>
            </div>
          </div>
          <ul className="py-0">
            {CATEGORIES.map((c) => {
              const checkedMulti =
                c === "全部"
                  ? selectedCategories.length === 0
                  : selectedCategories.includes(c);
              const active = categoryMultiSelect
                ? checkedMulti
                : category === c;
              return (
                <li
                  key={c}
                  className="border-b border-gray-50 last:border-b-0"
                >
                  <button
                    type="button"
                    className={`${rowBase} items-center gap-2 px-4 py-3 ${
                      active ? rowSelected : rowDefault
                    }`}
                    onClick={() => {
                      if (categoryMultiSelect) {
                        onToggleCategoryMulti(c);
                      } else {
                        onCategory(c);
                        closeDropdown();
                      }
                    }}
                  >
                    {categoryMultiSelect && (
                      <span
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
                          checkedMulti
                            ? "border-meituan-border bg-meituan text-gray-900"
                            : "border-gray-300 bg-white"
                        }`}
                      >
                        {checkedMulti && (
                          <Check className="h-3 w-3" strokeWidth={3} aria-hidden />
                        )}
                      </span>
                    )}
                    <span className="min-w-0 flex-1">{c}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {activeDropdown === "sort" && (
        <ul className="py-0">
          {(
            [
              ["default", "综合排序"],
              ["distance", "距离最近"],
              ["rating", "评分最高"],
              ["price", "按价格"],
            ] as const
          ).map(([m, label]) => (
            <li
              key={m}
              className="border-b border-gray-50 last:border-b-0"
            >
              <button
                type="button"
                className={`${rowBase} items-center px-4 py-3 ${
                  sortMode === m ? rowSelected : rowDefault
                }`}
                onClick={() => {
                  if (m === "price") {
                    if (sortMode === "price") onTogglePriceOrder();
                    else onSortMode("price");
                  } else {
                    onSortMode(m);
                  }
                  closeDropdown();
                }}
              >
                {m === "price"
                  ? `按价格（${priceOrder === "asc" ? "低到高" : "高到低"}）`
                  : label}
              </button>
            </li>
          ))}
        </ul>
      )}

      {activeDropdown === "filter" && (
        <div className="pb-1.5 pt-0">
          <p className="border-b border-gray-100 px-4 pb-2 pt-3 text-xs font-bold uppercase tracking-wide text-gray-400">
            人均
          </p>
          <ul className="py-0">
            {PRICE_OPTIONS.map((p) => (
              <li
                key={p}
                className="border-b border-gray-50 last:border-b-0"
              >
                <button
                  type="button"
                  className={`${rowBase} items-center px-4 py-3 ${
                    priceFilter.kind === "preset" &&
                    priceFilter.tier === p
                      ? rowSelected
                      : rowDefault
                  }`}
                  onClick={() => {
                    onPriceFilterChange({ kind: "preset", tier: p });
                    closeDropdown();
                  }}
                >
                  {p}
                </button>
              </li>
            ))}
          </ul>
          <div className="border-t border-gray-100 px-4 pb-1.5 pt-2">
            <div className="mb-1.5 flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5">
              <span className="text-xs font-bold text-gray-500">
                自定义区间（元）
              </span>
              <span className="text-[11px] text-gray-400">
                正整数
                <span className="mx-1 text-gray-300">·</span>
                可只填一侧
              </span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                inputMode="numeric"
                autoComplete="off"
                placeholder="下限"
                value={customMin}
                onChange={(e) =>
                  setCustomMin(digitsOnly(e.target.value))
                }
                className="focus-meituan min-w-0 flex-1 rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1.5 text-sm text-gray-900 outline-none"
              />
              <span className="shrink-0 text-gray-400">—</span>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="off"
                placeholder="上限"
                value={customMax}
                onChange={(e) =>
                  setCustomMax(digitsOnly(e.target.value))
                }
                className="focus-meituan min-w-0 flex-1 rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1.5 text-sm text-gray-900 outline-none"
              />
            </div>
            <button
              type="button"
              className="btn-meituan mt-1.5 w-full rounded-lg py-1.5 text-sm font-bold shadow-sm"
              onClick={() => {
                const min = parsePositiveInt(customMin);
                const max = parsePositiveInt(customMax);
                if (min === undefined && max === undefined) {
                  onPriceFilterChange({
                    kind: "preset",
                    tier: "全部",
                  });
                } else {
                  let a = min;
                  let b = max;
                  if (a != null && b != null && a > b) {
                    const t = a;
                    a = b;
                    b = t;
                  }
                  onPriceFilterChange({
                    kind: "range",
                    min: a,
                    max: b,
                  });
                }
                closeDropdown();
              }}
            >
              应用自定义
            </button>
          </div>
          {showSubLocation && (
            <>
              <p className="mt-1.5 border-t border-gray-100 px-4 pb-2 pt-3 text-xs font-bold uppercase tracking-wide text-gray-400">
                具体位置
              </p>
              <ul className="py-0">
                {subOptions.map((loc) => (
                  <li
                    key={loc}
                    className="border-b border-gray-50 last:border-b-0"
                  >
                    <button
                      type="button"
                      className={`${rowBase} items-center px-4 py-3 ${
                        subLocation === loc ? rowSelected : rowDefault
                      }`}
                      onClick={() => {
                        onSubLocation(loc);
                        closeDropdown();
                      }}
                    >
                      {loc}
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  );

  return (
    <>
      <div className="relative z-40 w-full">
          <div className="flex items-center justify-between gap-1 bg-white px-3 py-3 shadow-sm sm:gap-2 sm:px-4 rounded-xl">
            <button
              type="button"
              className={`flex min-w-0 flex-1 items-center justify-center gap-0.5 rounded-lg px-1 py-1 text-xs font-medium transition sm:text-sm ${triggerTextClass(
                activeDropdown === "university",
                university !== "全部"
              )}`}
              onClick={() => toggleDropdown("university")}
            >
              <span className="truncate">{shortUniversityLabel(university)}</span>
              <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
            </button>
            <button
              type="button"
              className={`flex min-w-0 flex-1 items-center justify-center gap-0.5 rounded-lg px-1 py-1 text-xs font-medium transition sm:text-sm ${triggerTextClass(
                activeDropdown === "filter",
                filterHasExtra
              )}`}
              onClick={() => toggleDropdown("filter")}
            >
              <span className="truncate">
                {priceFilterButtonLabel(priceFilter)}
              </span>
              <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
            </button>
            <button
              type="button"
              className={`flex min-w-0 flex-1 items-center justify-center gap-0.5 rounded-lg px-1 py-1 text-xs font-medium transition sm:text-sm ${triggerTextClass(
                activeDropdown === "category",
                categoryTriggerActive
              )}`}
              onClick={() => toggleDropdown("category")}
            >
              <span className="truncate">
                {categoryTriggerLabel(
                  categoryMultiSelect,
                  category,
                  selectedCategories
                )}
              </span>
              <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
            </button>
            <button
              type="button"
              className={`flex min-w-0 flex-1 items-center justify-center gap-0.5 rounded-lg px-1 py-1 text-xs font-medium transition sm:text-sm ${triggerTextClass(
                activeDropdown === "sort",
                sortMode !== "default"
              )}`}
              onClick={() => toggleDropdown("sort")}
            >
              <span className="truncate">{sortCompactLabel(sortMode, priceOrder)}</span>
              <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
            </button>
          </div>
          {activeDropdown && (
            <div
              role="presentation"
              aria-hidden
              className="absolute left-1/2 top-full z-40 h-[100vh] w-screen max-w-[100vw] -translate-x-1/2 bg-black/40"
              onClick={closeDropdown}
            />
          )}
          {dropdownPanel}
        </div>
    </>
  );
}
