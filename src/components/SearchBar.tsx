import { Search } from "lucide-react";

type SearchBarProps = {
  value: string;
  onChange: (value: string) => void;
};

export function SearchBar({ value, onChange }: SearchBarProps) {
  return (
    <section className="w-full pt-0" aria-label="搜索餐厅">
      <div className="w-full rounded-xl bg-white px-3 py-2 shadow-sm sm:px-3.5 sm:py-2">
        <label className="relative block">
          <span className="sr-only">搜索餐厅、招牌菜或品类</span>
          <Search
            className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 sm:left-3 sm:h-[18px] sm:w-[18px]"
            aria-hidden
          />
          <input
            type="search"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="搜索餐厅、招牌菜或品类..."
            autoComplete="off"
            className="focus-meituan w-full min-w-0 rounded-xl border border-transparent bg-gray-50/80 py-2 pl-9 pr-2.5 text-sm text-gray-900 transition placeholder:text-gray-400 sm:py-2.5 sm:pl-10 sm:text-[15px]"
          />
        </label>
      </div>
    </section>
  );
}
