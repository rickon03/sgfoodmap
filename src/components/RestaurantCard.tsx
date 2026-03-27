import { Star, UtensilsCrossed } from "lucide-react";
import type { Restaurant } from "../data/restaurants";
import { getPlaceholderColor } from "../utils/placeholderColor";

type RestaurantCardProps = {
  restaurant: Restaurant;
  onOpen: (r: Restaurant) => void;
};

export function RestaurantCard({
  restaurant: r,
  onOpen,
}: RestaurantCardProps) {
  const couponCount = r.coupons?.length ?? 0;
  const hasCoupons = couponCount > 0;
  const ph = getPlaceholderColor(r.name);

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={() => onOpen(r)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen(r);
        }
      }}
      className="group mb-3 cursor-pointer overflow-hidden rounded-2xl bg-white shadow-sm transition-shadow duration-200 last:mb-0 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-meituan md:mb-0"
    >
      <div
        className={`relative flex h-28 items-center justify-center ${ph.bg}`}
        aria-hidden
      >
        {hasCoupons && (
          <span className="absolute right-2 top-2 rounded-md bg-red-500 px-2 py-0.5 text-[11px] font-bold text-white shadow-md ring-1 ring-white/50">
            {couponCount > 1 ? `${couponCount}项优惠` : "券"}
          </span>
        )}
        <UtensilsCrossed
          className={`h-10 w-10 ${ph.icon} transition-transform duration-200 group-hover:scale-105`}
          strokeWidth={1.75}
        />
      </div>
      <div className="space-y-2 p-4">
        <h3 className="text-base font-bold leading-snug text-gray-900">
          {r.name}
        </h3>
        <p className="truncate text-xs text-gray-500">{r.location}</p>
        <div className="flex items-start justify-between gap-2 text-sm text-gray-600">
          <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
            <span className="inline-flex items-center gap-0.5 font-semibold text-orange-600">
              <Star
                className="h-4 w-4 fill-orange-400 text-orange-500"
                aria-hidden
              />
              {r.rating.toFixed(1)}
            </span>
            <span className="font-medium text-red-600">
              人均 S${Number(r.price).toFixed(2)}
            </span>
          </div>
          <span className="shrink-0 text-sm text-gray-400">{r.distance}</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {r.tags.map((t) => (
            <span
              key={t}
              className="rounded-full bg-orange-50 px-2.5 py-0.5 text-xs font-medium text-orange-900/90"
            >
              {t}
            </span>
          ))}
        </div>
      </div>
    </article>
  );
}
