import { X } from "lucide-react";
import type { Restaurant } from "../data/restaurants";
import { RestaurantCard } from "./RestaurantCard";

type HeroProps = {
  picked: Restaurant | null;
  randomHint: string | null;
  onOpenDetail: (r: Restaurant) => void;
  /** 关闭「今日推荐」卡片 */
  onDismissPicked?: () => void;
};

export function Hero({
  picked,
  randomHint,
  onOpenDetail,
  onDismissPicked,
}: HeroProps) {
  return (
    <section className="w-full px-0 pt-0">
      <div className="mx-auto w-full max-w-full">
        <div className="flex flex-col items-center gap-5">
          {randomHint && (
            <p className="text-center text-sm text-orange-600">{randomHint}</p>
          )}

          {picked && (
            <div className="relative w-full max-w-md animate-fade-up">
              <button
                type="button"
                onClick={() => onDismissPicked?.()}
                className="absolute -right-1 -top-1 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white text-gray-500 shadow-sm ring-1 ring-gray-200/80 transition hover:bg-gray-50 hover:text-gray-800"
                aria-label="关闭今日推荐"
              >
                <X className="h-4 w-4" strokeWidth={2.5} />
              </button>
              <p className="mb-2 text-center text-xs font-semibold uppercase tracking-wide text-orange-600">
                今日推荐
              </p>
              <RestaurantCard restaurant={picked} onOpen={onOpenDetail} />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
