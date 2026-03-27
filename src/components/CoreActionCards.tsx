type CoreActionCardsProps = {
  randomLoading: boolean;
  onRandomPick: () => void;
  onOpenGroupDining: () => void;
};

export function CoreActionCards({
  randomLoading,
  onRandomPick,
  onOpenGroupDining,
}: CoreActionCardsProps) {
  return (
    <section className="w-full px-0 pb-0 pt-3">
      <div className="mx-auto grid w-full grid-cols-2 gap-3 md:gap-4">
        <button
          type="button"
          onClick={onRandomPick}
          disabled={randomLoading}
          className="relative flex flex-col items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-[#FFC300] to-[#FFD033] p-3 text-gray-900 shadow-sm transition-transform active:scale-95 disabled:opacity-70 md:p-4"
        >
          <p className="whitespace-nowrap text-base font-black">
            {randomLoading ? "🎲 抽选中..." : "🎲 随机选店"}
          </p>
          <p className="whitespace-nowrap text-xs text-gray-800/80">拯救选择困难</p>
        </button>

        <button
          type="button"
          onClick={onOpenGroupDining}
          className="relative flex flex-col items-center justify-center overflow-hidden rounded-xl border-none bg-white p-3 text-gray-900 shadow-sm transition-transform active:scale-95 md:p-4"
        >
          <span className="absolute right-0 top-0 rounded-bl-lg rounded-tr-xl bg-red-500 px-2 py-0.5 text-[10px] font-bold leading-none text-white">
            实时更新
          </span>
          <p className="whitespace-nowrap text-base font-black">🔥 拼好桌</p>
          <p className="whitespace-nowrap text-xs text-gray-600">组队吃大餐</p>
        </button>
      </div>
    </section>
  );
}

