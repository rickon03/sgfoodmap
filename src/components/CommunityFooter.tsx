import { MessageCircle, QrCode, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

export function CommunityFooter() {
  const [qrOpen, setQrOpen] = useState(false);

  const close = useCallback(() => setQrOpen(false), []);

  useEffect(() => {
    if (!qrOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [qrOpen, close]);

  return (
    <>
      <footer className="w-full pb-10 pt-10">
        <div className="w-full overflow-hidden rounded-2xl bg-gradient-to-br from-meituan-soft via-amber-50/80 to-meituan-soft p-5 shadow-sm ring-1 ring-meituan-border/40 sm:p-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between sm:gap-8">
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-bold text-gray-900 sm:text-xl">
                🍔 加入大学城吃货情报局！
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-gray-600 sm:text-[15px]">
                获取独家隐藏菜单、商家霸王餐和深夜拼单信息。
              </p>
            </div>
            <button
              type="button"
              onClick={() => setQrOpen(true)}
              className="btn-meituan inline-flex w-full shrink-0 items-center justify-center gap-2 rounded-xl px-5 py-3.5 text-sm active:scale-[0.99] sm:w-auto sm:py-3"
            >
              <MessageCircle className="h-5 w-5" aria-hidden />
              点击加入微信群
              <QrCode className="h-5 w-5 opacity-90" aria-hidden />
            </button>
          </div>
        </div>
      </footer>

      {qrOpen && (
        <div
          className="fixed inset-0 z-[70] flex items-end justify-center bg-black/50 p-0 md:items-center md:bg-black/50 md:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="qr-modal-title"
          onClick={close}
        >
          <div
            className="relative w-full max-w-full min-w-0 rounded-t-3xl bg-white p-5 shadow-2xl md:max-w-md md:rounded-2xl md:p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={close}
              className="absolute right-3 top-3 rounded-full p-2 text-gray-500 transition-colors hover:bg-gray-100"
              aria-label="关闭"
            >
              <X className="h-5 w-5" />
            </button>
            <h3
              id="qr-modal-title"
              className="pr-10 text-base font-bold text-gray-900"
            >
              微信群二维码
            </h3>
            <div
              className="mx-auto mt-4 flex aspect-square w-full max-w-[220px] flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-gray-200 bg-gray-100 text-gray-500"
              aria-hidden
            >
              <QrCode className="h-16 w-16 text-gray-400" strokeWidth={1.25} />
              <span className="px-2 text-center text-sm font-medium text-gray-500">
                请扫码进群
              </span>
            </div>
            <p className="mt-4 text-center text-sm font-semibold text-red-600">
              暗号：今天吃什么
            </p>
          </div>
        </div>
      )}
    </>
  );
}
