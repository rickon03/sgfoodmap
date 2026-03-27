import {
  Clock,
  MapPin,
  MapPinned,
  Sparkles,
  Star,
  User,
  X,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import {
  type Coupon,
  type Restaurant,
  buildAmapMarkerUrl,
} from "../data/restaurants";
import { supabase } from "../lib/supabaseClient";

type TabId = "menu" | "promo" | "reviews";

type DetailModalProps = {
  restaurant: Restaurant | null;
  onClose: () => void;
  isLoggedIn: boolean;
  userId: string | null;
  currentUsername: string;
  claimedCouponKeys: Set<string>;
  onClaimCoupon: (restaurantName: string, coupon: Coupon) => boolean;
  /** 未登录时诱导登录（与拼好桌一致）：展示内容，点击后打开登录弹窗 */
  onRequestLogin?: (introBanner: string) => void;
};

const INTRO_CLAIM_COUPON =
  "登录后即可领取优惠券，已领券将保存在「我的卡包」～";
const INTRO_WRITE_REVIEW =
  "登录后即可发布评价，与同学分享真实体验～";

const TABS: { id: TabId; label: string }[] = [
  { id: "menu", label: "店铺菜单" },
  { id: "promo", label: "优惠活动" },
  { id: "reviews", label: "详细评价" },
];

/** 与 `index.css` 主弹窗关闭动画时长对齐（略大于 keyframes） */
const MAIN_CLOSE_MS = 300;

function StarRow({ rating }: { rating: number }) {
  return (
    <span className="flex shrink-0 items-center gap-0.5" aria-label={`${rating} 星`}>
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          className={`h-3.5 w-3.5 transition-colors duration-200 sm:h-4 sm:w-4 ${
            i < rating
              ? "fill-orange-400 text-orange-500"
              : "fill-gray-200 text-gray-200"
          }`}
          aria-hidden
        />
      ))}
    </span>
  );
}

const NESTED_CLOSE_MS = 260;

function WriteReviewModal({
  restaurantId,
  restaurantName,
  isLoggedIn,
  userId,
  currentUsername,
  onSubmitted,
  onClose,
}: {
  restaurantId: string;
  restaurantName: string;
  isLoggedIn: boolean;
  userId: string | null;
  currentUsername: string;
  onSubmitted: () => void;
  onClose: () => void;
}) {
  const [stars, setStars] = useState(0);
  const [text, setText] = useState("");
  const [exiting, setExiting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestClose = useCallback(() => {
    if (exiting) return;
    setExiting(true);
  }, [exiting]);

  useEffect(() => {
    if (!exiting) return;
    const t = window.setTimeout(() => onClose(), NESTED_CLOSE_MS);
    return () => window.clearTimeout(t);
  }, [exiting, onClose]);

  const submit = async () => {
    if (!isLoggedIn) {
      setError("请先登录后再发布评价。");
      return;
    }
    const content = text.trim();
    if (stars < 1 || stars > 5) {
      setError("请先选择 1-5 星评分。");
      return;
    }
    if (!content) {
      setError("评价内容不能为空。");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      const { error: insertError } = await supabase.from("reviews").insert([
        {
          restaurant_id: restaurantId,
          user_id: userId,
          username: currentUsername || "同学",
          rating: stars,
          content,
        },
      ]);
      if (insertError) throw insertError;
      setStars(0);
      setText("");
      onSubmitted();
      requestClose();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "发布评价失败，请稍后重试";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") requestClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [requestClose]);

  return (
    <div
      className={`modal-nested-backdrop fixed inset-0 z-[60] flex items-end justify-center bg-black/50 p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] md:items-center md:p-4 ${exiting ? "is-closing" : ""}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="write-review-title"
      onClick={requestClose}
    >
      <div
        className={`modal-nested-panel w-full max-w-full min-w-0 rounded-t-3xl bg-white shadow-2xl md:max-w-md md:rounded-2xl ${exiting ? "is-closing" : ""}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
          <h3
            id="write-review-title"
            className="min-w-0 truncate pr-2 text-base font-bold text-gray-900"
          >
            写评价 · {restaurantName}
          </h3>
          <button
            type="button"
            onClick={requestClose}
            className="shrink-0 rounded-full p-2 text-gray-500 transition-colors duration-200 hover:bg-gray-100"
            aria-label="关闭"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="space-y-4 px-4 py-4">
          <div>
            <p className="mb-2 text-xs font-semibold text-gray-500">星级评分</p>
            <div className="flex flex-wrap items-center gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setStars(n)}
                  className="rounded-md p-1 transition-transform duration-200 hover:scale-110 active:scale-95"
                  aria-label={`${n} 星`}
                >
                  <Star
                    className={`h-8 w-8 transition-all duration-200 ${
                      n <= stars
                        ? "fill-orange-400 text-orange-500"
                        : "fill-transparent text-gray-300"
                    }`}
                    strokeWidth={1.5}
                  />
                </button>
              ))}
            </div>
          </div>
          <div>
            <label
              htmlFor="review-text"
              className="mb-2 block text-xs font-semibold text-gray-500"
            >
              评价内容
            </label>
            <textarea
              id="review-text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={4}
              placeholder="说说口味、环境、服务…"
              className="focus-meituan w-full min-w-0 resize-none rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 outline-none transition-shadow duration-200 placeholder:text-gray-400"
            />
          </div>
          {error && (
            <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
              {error}
            </p>
          )}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={requestClose}
              className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 transition-colors duration-200 hover:bg-gray-50"
            >
              取消
            </button>
            <button
              type="button"
              onClick={submit}
              disabled={submitting}
              className="btn-meituan rounded-xl px-4 py-2.5 text-sm shadow-md disabled:opacity-60"
            >
              {submitting ? "提交中..." : "提交评价"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

type ReviewRow = {
  id: string;
  restaurant_id: string;
  user_id: string | null;
  username: string;
  rating: number;
  content: string;
  created_at: string;
};

export function DetailModal({
  restaurant: r,
  onClose,
  isLoggedIn,
  userId,
  currentUsername,
  claimedCouponKeys,
  onClaimCoupon,
  onRequestLogin,
}: DetailModalProps) {
  const [tab, setTab] = useState<TabId>("menu");
  const [writeOpen, setWriteOpen] = useState(false);
  const [mainExiting, setMainExiting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewsError, setReviewsError] = useState<string | null>(null);

  useEffect(() => {
    if (r) {
      setTab("menu");
      setWriteOpen(false);
      setMainExiting(false);
    }
  }, [r?.id]);

  const fetchReviews = useCallback(async () => {
    if (!r) return;
    try {
      setReviewsLoading(true);
      setReviewsError(null);
      const { data, error } = await supabase
        .from("reviews")
        .select("*")
        .eq("restaurant_id", r.id)
        .order("created_at", { ascending: false })
        .returns<ReviewRow[]>();
      if (error) throw error;
      setReviews(data ?? []);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "获取评价失败";
      setReviewsError(msg);
    } finally {
      setReviewsLoading(false);
    }
  }, [r]);

  useEffect(() => {
    if (!r) return;
    fetchReviews();
  }, [r?.id, fetchReviews]);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2800);
  }, []);

  const requestCloseMain = useCallback(() => {
    if (!r || mainExiting) return;
    if (writeOpen) setWriteOpen(false);
    setMainExiting(true);
  }, [r, mainExiting, writeOpen]);

  useEffect(() => {
    if (!mainExiting) return;
    const t = window.setTimeout(() => {
      setMainExiting(false);
      onClose();
    }, MAIN_CLOSE_MS);
    return () => window.clearTimeout(t);
  }, [mainExiting, onClose]);

  useEffect(() => {
    if (!r) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (writeOpen) return;
      if (mainExiting) return;
      requestCloseMain();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [r, writeOpen, mainExiting, requestCloseMain]);

  const openMap = () => {
    if (!r) return;
    const url = buildAmapMarkerUrl(r.name, r.coordinates);
    window.open(url, "_blank", "noopener,noreferrer");
  };

  if (!r) return null;

  const claimCoupon = (coupon: Coupon) => {
    if (!isLoggedIn) {
      onRequestLogin?.(INTRO_CLAIM_COUPON);
      return;
    }
    const ok = onClaimCoupon(r.name, coupon);
    if (!ok) {
      showToast("这张券已在您的卡包中");
      return;
    }
    showToast("领取成功！已放入您的卡包。");
  };

  const dishes = r.signature_dishes
    .split(/[,，]/)
    .map((s) => s.trim())
    .filter(Boolean);

  return (
    <>
      <div
        className={`modal-main-backdrop fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] md:items-center md:p-4 md:pb-4 ${mainExiting ? "is-closing" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        onClick={requestCloseMain}
      >
        <div
          className={`modal-main-panel max-h-[min(92vh,100dvh)] w-full max-w-full min-w-0 overflow-hidden rounded-t-3xl bg-white shadow-2xl md:max-h-[min(88vh,840px)] md:max-w-2xl md:rounded-2xl ${mainExiting ? "is-closing" : ""}`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="sticky top-0 z-10 flex items-start gap-2 border-b border-gray-100 bg-white/95 px-4 py-3 backdrop-blur-md sm:px-5">
            <h2
              id="modal-title"
              className="min-w-0 flex-1 break-words pr-1 text-lg font-bold leading-snug text-gray-900"
            >
              {r.name}
            </h2>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                openMap();
              }}
              className="shrink-0 rounded-full p-2 text-gray-900 transition-colors duration-200 hover:bg-meituan-soft"
              title="地图导航"
              aria-label="在高德地图中打开位置"
            >
              <MapPinned className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={requestCloseMain}
              className="shrink-0 rounded-full p-2 text-gray-500 transition-colors duration-200 hover:bg-gray-100 hover:text-gray-800"
              aria-label="关闭"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="max-h-[calc(92dvh-9rem)] overflow-y-auto overflow-x-hidden md:max-h-[calc(88vh-10rem)]">
            <div className="space-y-5 px-4 py-5 text-sm text-gray-700 sm:px-5">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-2xl bg-gray-50 px-3 py-2.5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                    评分
                  </p>
                  <p className="mt-0.5 font-bold text-orange-600">
                    {Number(r.rating).toFixed(1)}
                  </p>
                </div>
                <div className="rounded-2xl bg-gray-50 px-3 py-2.5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                    人均
                  </p>
                  <p className="mt-0.5 font-bold text-red-600">
                    S${Number(r.price).toFixed(2)}
                  </p>
                </div>
                <div className="rounded-2xl bg-gray-50 px-3 py-2.5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                    距离
                  </p>
                  <p className="mt-0.5 font-bold text-gray-900">{r.distance}</p>
                </div>
                <div className="rounded-2xl bg-gray-50 px-3 py-2.5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                    品类
                  </p>
                  <p className="mt-0.5 font-bold text-gray-900">{r.category}</p>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex gap-3 rounded-2xl bg-white px-3 py-3 shadow-sm ring-1 ring-gray-100">
                  <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-meituan-soft text-gray-900">
                    <Clock className="h-4 w-4" aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                      学校
                    </p>
                    <p className="mt-0.5 break-words font-medium text-gray-900">
                      {r.university}
                    </p>
                  </div>
                </div>
                <div className="flex gap-3 rounded-2xl bg-white px-3 py-3 shadow-sm ring-1 ring-gray-100">
                  <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-meituan-soft text-gray-900">
                    <MapPin className="h-4 w-4" aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                      具体位置
                    </p>
                    <p className="mt-0.5 break-words font-medium text-gray-900">
                      {r.sub_location}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-meituan-soft text-gray-900">
                  <Sparkles className="h-4 w-4" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                    招牌菜
                  </p>
                  <ul className="mt-2 space-y-1.5">
                    {(dishes.length ? dishes : ["暂无信息"]).map((d) => (
                      <li
                        key={d}
                        className="flex items-center gap-2 rounded-xl bg-gray-50 px-3 py-2 font-medium text-gray-900"
                      >
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-meituan" />
                        <span className="min-w-0 break-words">{d}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            <div className="border-t border-gray-100 bg-gray-50/80 px-2 pb-5 pt-3 sm:px-3">
              <div
                role="tablist"
                aria-label="店铺详情分类"
                className="mb-3 flex gap-1 rounded-xl bg-white/90 p-1 shadow-sm ring-1 ring-gray-100"
              >
                {TABS.map((t) => {
                  const active = tab === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      onClick={() => setTab(t.id)}
                      className={`min-w-0 flex-1 truncate rounded-lg px-2 py-2 text-center text-xs font-semibold transition-all duration-200 sm:text-sm ${
                        active
                          ? "pill-meituan-active"
                          : "text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      {t.label}
                    </button>
                  );
                })}
              </div>

              <div
                role="tabpanel"
                className="tab-panel-animate min-h-[12rem] px-2 sm:px-3"
                key={tab}
              >
                {tab === "menu" && (
                  <ul className="space-y-2 rounded-2xl bg-white px-3 py-3 shadow-sm ring-1 ring-gray-100">
                    {(dishes.length ? dishes : ["暂无招牌菜信息"]).map((d) => (
                      <li
                        key={d}
                        className="flex items-center gap-2 rounded-xl bg-gray-50 px-3 py-2 text-sm font-medium text-gray-900"
                      >
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-meituan" />
                        <span className="min-w-0 break-words">{d}</span>
                      </li>
                    ))}
                  </ul>
                )}

                {tab === "promo" && (
                  <div className="space-y-5">
                    <div className="min-w-0">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
                        标签（来自数据库 tags）
                      </p>
                      {(r.tags ?? []).length === 0 ? (
                        <p className="text-sm text-gray-500">暂无标签</p>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {(r.tags ?? []).map((t) => (
                            <span
                              key={t}
                              className="inline-block max-w-full break-words rounded-lg border border-meituan-border/50 bg-meituan-soft px-2.5 py-1 text-xs font-medium text-gray-900 transition-colors duration-200"
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="min-w-0">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
                        优惠券
                      </p>
                      {(r.coupons ?? []).length === 0 ? (
                        <p className="text-sm text-gray-500">暂无优惠券</p>
                      ) : (
                        <ul className="space-y-3">
                          {(r.coupons ?? []).map((c, idx) => {
                            const key = `${c.title}-${idx}`;
                            const claimed = claimedCouponKeys.has(
                              `${r.name}::${c.title}`
                            );
                            return (
                              <li
                                key={key}
                                className="coupon-card flex items-stretch overflow-hidden rounded-2xl border-2 border-dashed border-meituan-border bg-gradient-to-r from-meituan-soft via-white to-white shadow-sm"
                              >
                                <div className="min-w-0 flex-1 px-3 py-3">
                                  <p className="truncate text-sm font-black text-red-600">
                                    {c.title}
                                  </p>
                                  <p className="mt-1 text-xs text-gray-600">{c.desc}</p>
                                </div>
                                <div className="flex items-center border-l border-dashed border-meituan-border/70 px-3">
                                  <button
                                    type="button"
                                    onClick={() => claimCoupon(c)}
                                    disabled={claimed}
                                    className={`rounded-lg px-3 py-2 text-xs font-bold transition ${
                                      claimed
                                        ? "bg-gray-200 text-gray-500"
                                        : "btn-meituan shadow-md"
                                    }`}
                                  >
                                    {claimed ? "已领取" : "立即领取"}
                                  </button>
                                </div>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </div>
                  </div>
                )}

                {tab === "reviews" && (
                  <div className="space-y-4">
                    <button
                      type="button"
                      onClick={() => {
                        if (!isLoggedIn) {
                          onRequestLogin?.(INTRO_WRITE_REVIEW);
                          return;
                        }
                        setWriteOpen(true);
                      }}
                      className="w-full rounded-xl border-2 border-dashed border-meituan-border bg-white py-3 text-sm font-semibold text-gray-900 transition-colors duration-200 hover:bg-meituan-soft"
                    >
                      ➕ 我要评价
                    </button>
                    {reviewsLoading ? (
                      <p className="rounded-2xl bg-gray-50 p-4 text-sm text-gray-500">
                        正在加载评价...
                      </p>
                    ) : reviewsError ? (
                      <p className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
                        加载评价失败：{reviewsError}
                      </p>
                    ) : reviews.length === 0 ? (
                      <p className="rounded-2xl bg-gray-50 p-4 text-sm text-gray-500">
                        还没有评价，来当第一个吃螃蟹的人～
                      </p>
                    ) : (
                      <ul className="space-y-3">
                        {reviews.map((rev) => (
                          <li
                            key={rev.id}
                            className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-gray-100"
                          >
                            <div className="flex items-start gap-3">
                              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-meituan-soft text-gray-900">
                                <User className="h-5 w-5" aria-hidden />
                              </span>
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-2">
                                  <span className="truncate text-sm font-bold text-gray-900">
                                    {rev.username}
                                  </span>
                                  <StarRow rating={rev.rating} />
                                </div>
                                <p className="mt-0.5 text-xs text-gray-500">
                                  {new Date(rev.created_at).toLocaleString()}
                                </p>
                                <p className="mt-2 break-words text-sm leading-relaxed text-gray-600">
                                  {rev.content}
                                </p>
                              </div>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {writeOpen && (
        <WriteReviewModal
          restaurantId={r.id}
          restaurantName={r.name}
          isLoggedIn={isLoggedIn}
          userId={userId}
          currentUsername={currentUsername}
          onSubmitted={() => {
            showToast("评价发布成功");
            fetchReviews();
          }}
          onClose={() => setWriteOpen(false)}
        />
      )}

      {toast && (
        <div
          className="fixed bottom-24 left-4 right-4 z-[100] rounded-2xl border border-meituan-border bg-gray-900 px-4 py-3 text-center text-sm font-medium text-white shadow-2xl md:left-auto md:right-8 md:w-full md:max-w-md"
          role="status"
        >
          {toast}
        </div>
      )}
    </>
  );
}
