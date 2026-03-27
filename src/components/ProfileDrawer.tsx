import { ChevronRight, UserCircle, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { MOCK_ORDERS } from "../data/userMock";
import type { Coupon, Restaurant } from "../data/restaurants";
import { formatSupabaseError } from "../lib/supabaseError";
import { supabase } from "../lib/supabaseClient";

type ProfileTab = "history" | "orders" | "coupons" | "teams";

type MyTeamRow = {
  id: string;
  restaurant_name: string;
  creator_name: string;
  current_people: number;
  target_people: number;
  meet_time: string;
  status: string;
};
type ClaimedCoupon = Coupon & { restaurantName: string };

type ProfileDrawerProps = {
  open: boolean;
  onClose: () => void;
  onLogout: () => void;
  userId: string | null;
  username: string;
  email: string;
  claimedCoupons: ClaimedCoupon[];
  restaurants: Restaurant[];
  /** 最近浏览的餐厅 id，新→旧 */
  viewedIds: string[];
  onPickRestaurant: (r: Restaurant) => void;
};

export function ProfileDrawer({
  open,
  onClose,
  onLogout,
  userId,
  username,
  email,
  claimedCoupons,
  restaurants,
  viewedIds,
  onPickRestaurant,
}: ProfileDrawerProps) {
  const [tab, setTab] = useState<ProfileTab>("history");
  const [toast, setToast] = useState<string | null>(null);
  const [myTeams, setMyTeams] = useState<MyTeamRow[]>([]);
  const [teamsLoading, setTeamsLoading] = useState(false);
  const [leaveTeamTarget, setLeaveTeamTarget] = useState<MyTeamRow | null>(null);
  const [leavingTeam, setLeavingTeam] = useState(false);

  useEffect(() => {
    if (open) setTab("history");
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2400);
  }, []);

  const fetchMyTeams = useCallback(async () => {
    if (!userId) {
      setMyTeams([]);
      return;
    }
    try {
      setTeamsLoading(true);
      const { data, error } = await supabase
        .from("team_members")
        .select(
          `
          team_id,
          teams (
            id,
            restaurant_name,
            creator_name,
            current_people,
            target_people,
            meet_time,
            status
          )
        `
        )
        .eq("user_id", userId);
      if (error) throw error;
      const rows = (data ?? []) as {
        team_id: string;
        teams: MyTeamRow | MyTeamRow[] | null;
      }[];
      const next: MyTeamRow[] = [];
      for (const r of rows) {
        const t = r.teams;
        const team = Array.isArray(t) ? t[0] : t;
        if (team && typeof team === "object" && "id" in team) {
          next.push(team as MyTeamRow);
        }
      }
      setMyTeams(next);
    } catch (e) {
      const msg = formatSupabaseError(e);
      showToast(
        msg.includes("team_members") || msg.includes("Could not find")
          ? "请先在 Supabase 执行 supabase_team_members.sql"
          : `加载失败：${msg}`
      );
      setMyTeams([]);
    } finally {
      setTeamsLoading(false);
    }
  }, [userId, showToast]);

  useEffect(() => {
    if (!open || tab !== "teams") return;
    void fetchMyTeams();
  }, [open, tab, fetchMyTeams]);

  const confirmLeaveTeam = useCallback(async () => {
    if (!leaveTeamTarget || !userId) return;
    try {
      setLeavingTeam(true);
      const { error } = await supabase.rpc("leave_team", { p_team_id: leaveTeamTarget.id });
      if (error) throw error;
      showToast("已退出该拼桌");
      setLeaveTeamTarget(null);
      await fetchMyTeams();
    } catch (e) {
      showToast(`退出失败：${formatSupabaseError(e)}`);
    } finally {
      setLeavingTeam(false);
    }
  }, [leaveTeamTarget, userId, fetchMyTeams, showToast]);

  const viewed = viewedIds
    .slice(0, 3)
    .map((id) => restaurants.find((r) => r.id === id))
    .filter((r): r is Restaurant => Boolean(r));

  const handleOpenRestaurant = useCallback(
    (r: Restaurant) => {
      onPickRestaurant(r);
      onClose();
    },
    [onPickRestaurant, onClose]
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center md:items-center md:p-4">
      <button
        type="button"
        className="profile-drawer-backdrop absolute inset-0 bg-black/45 transition-opacity duration-200"
        aria-label="关闭个人中心"
        onClick={onClose}
      />
      <aside
        className="profile-drawer-panel relative z-10 flex max-h-[min(92vh,100dvh)] w-full max-w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl md:max-h-[min(88vh,820px)] md:max-w-2xl md:rounded-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-start justify-between border-b border-gray-100 px-4 py-4 md:px-5">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-meituan-soft text-gray-900">
              <UserCircle className="h-10 w-10" strokeWidth={1.5} />
            </span>
            <div className="min-w-0">
              <h2
                id="profile-title"
                className="truncate text-lg font-bold text-gray-900"
              >
                {username || "同学"}
              </h2>
              <p className="mt-0.5 text-sm text-gray-500">
                {email || "未绑定邮箱"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-full p-2 text-gray-500 hover:bg-gray-100"
            aria-label="关闭"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="hide-scrollbar flex shrink-0 gap-1 overflow-x-auto border-b border-gray-100 px-2 py-2 md:px-3">
          <button
            type="button"
            onClick={() => setTab("history")}
            className={`shrink-0 rounded-xl px-2.5 py-2.5 text-xs font-semibold transition-all duration-200 sm:px-3 sm:text-sm ${
              tab === "history"
                ? "pill-meituan-active shadow-black/10"
                : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            浏览记录
          </button>
          <button
            type="button"
            onClick={() => setTab("orders")}
            className={`shrink-0 rounded-xl px-2.5 py-2.5 text-xs font-semibold transition-all duration-200 sm:px-3 sm:text-sm ${
              tab === "orders"
                ? "pill-meituan-active shadow-black/10"
                : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            我的订单
          </button>
          <button
            type="button"
            onClick={() => setTab("coupons")}
            className={`shrink-0 rounded-xl px-2.5 py-2.5 text-xs font-semibold transition-all duration-200 sm:px-3 sm:text-sm ${
              tab === "coupons"
                ? "pill-meituan-active shadow-black/10"
                : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            我的卡包
          </button>
          <button
            type="button"
            onClick={() => setTab("teams")}
            className={`shrink-0 rounded-xl px-2.5 py-2.5 text-xs font-semibold transition-all duration-200 sm:px-3 sm:text-sm ${
              tab === "teams"
                ? "pill-meituan-active shadow-black/10"
                : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            我的拼桌
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-4 py-4 md:px-5">
          {tab === "history" && (
            <div className="space-y-2">
              {viewed.length === 0 ? (
                <p className="py-8 text-center text-sm text-gray-500">
                  暂无浏览记录，去地图里点点店铺吧～
                </p>
              ) : (
                viewed.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => handleOpenRestaurant(r)}
                    className="flex w-full min-w-0 items-center justify-between gap-3 rounded-xl border border-gray-100 bg-gray-50/80 px-3 py-3 text-left transition-colors hover:border-meituan-border hover:bg-meituan-soft/80"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-gray-900">
                        {r.name}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-gray-500">
                        {r.university} · {r.sub_location}
                      </p>
                    </div>
                    <ChevronRight className="h-5 w-5 shrink-0 text-gray-400" />
                  </button>
                ))
              )}
            </div>
          )}

          {tab === "orders" && (
            <ul className="space-y-3">
              {MOCK_ORDERS.map((o) => (
                <li
                  key={o.id}
                  className="rounded-xl border border-gray-100 bg-white p-3 shadow-sm ring-1 ring-gray-50"
                >
                  <p className="font-semibold text-gray-900">
                    {o.restaurantName}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">{o.orderedAt}</p>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <span className="text-sm font-bold text-red-600">
                      ¥{o.amount}
                    </span>
                    <span className="rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700">
                      {o.status}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {tab === "coupons" && (
            <div className="space-y-3">
              {claimedCoupons.length === 0 ? (
                <p className="py-8 text-center text-sm text-gray-500">
                  还没有领取优惠券，快去店铺详情里领券吧～
                </p>
              ) : (
                claimedCoupons.map((c, idx) => (
                  <article
                    key={`${c.restaurantName}-${c.title}-${idx}`}
                    className="overflow-hidden rounded-2xl border-2 border-dashed border-meituan-border bg-gradient-to-r from-meituan-soft via-white to-white p-3 shadow-sm"
                  >
                    <p className="truncate text-xs font-semibold text-gray-500">
                      {c.restaurantName}
                    </p>
                    <p className="mt-1 text-sm font-black text-red-600">{c.title}</p>
                    <p className="mt-1 text-xs text-gray-600">{c.desc}</p>
                    <button
                      type="button"
                      onClick={() => showToast("请向商家出示")}
                      className="mt-3 rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-bold text-white"
                    >
                      去使用
                    </button>
                  </article>
                ))
              )}
            </div>
          )}

          {tab === "teams" && (
            <div className="space-y-3">
              {!userId ? (
                <p className="py-8 text-center text-sm text-gray-500">请先登录后查看拼桌</p>
              ) : teamsLoading ? (
                <p className="py-8 text-center text-sm text-gray-500">加载中...</p>
              ) : myTeams.length === 0 ? (
                <p className="py-8 text-center text-sm text-gray-500">
                  暂无加入的拼桌，去「拼好桌」里逛逛吧～
                </p>
              ) : (
                myTeams.map((t) => (
                  <div
                    key={t.id}
                    className="rounded-xl border border-gray-100 bg-gray-50/80 p-3 shadow-sm ring-1 ring-gray-50"
                  >
                    <p className="font-semibold text-gray-900">{t.restaurant_name}</p>
                    <p className="mt-1 text-xs text-gray-500">
                      发起人 <span className="font-medium text-red-600">{t.creator_name}</span>
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                      <span className="rounded-full bg-meituan px-2 py-0.5 font-bold text-gray-900">
                        {t.current_people}/{t.target_people} 人
                      </span>
                      <span className="rounded-full bg-white px-2 py-0.5 text-gray-700 ring-1 ring-gray-200">
                        {t.meet_time} 集合
                      </span>
                      <span className="rounded-full bg-red-50 px-2 py-0.5 font-medium text-red-700">
                        {t.status}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setLeaveTeamTarget(t)}
                      className="mt-3 w-full rounded-lg border border-red-200 bg-white py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50"
                    >
                      退出拼桌
                    </button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        <div className="shrink-0 border-t border-gray-100 p-4 md:p-5">
          <button
            type="button"
            onClick={() => {
              onLogout();
              onClose();
            }}
            className="w-full rounded-xl border border-gray-200 py-3 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
          >
            退出登录
          </button>
        </div>
      </aside>
      {leaveTeamTarget && (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-black/55 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="profile-leave-team-title"
          onClick={() => !leavingTeam && setLeaveTeamTarget(null)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="profile-leave-team-title" className="text-base font-bold text-gray-900">
              退出拼桌？
            </h3>
            <p className="mt-2 text-sm text-gray-600">
              确定退出「{leaveTeamTarget.restaurant_name}」吗？
            </p>
            <div className="mt-5 flex gap-3">
              <button
                type="button"
                disabled={leavingTeam}
                onClick={() => setLeaveTeamTarget(null)}
                className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                取消
              </button>
              <button
                type="button"
                disabled={leavingTeam}
                onClick={() => void confirmLeaveTeam()}
                className="flex-1 rounded-xl bg-red-600 py-2.5 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-60"
              >
                {leavingTeam ? "退出中..." : "确认退出"}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div
          className="fixed bottom-24 left-4 right-4 z-[100] rounded-2xl border border-meituan-border bg-gray-900 px-4 py-3 text-center text-sm font-medium text-white shadow-2xl md:left-auto md:right-8 md:w-full md:max-w-md"
          role="status"
        >
          {toast}
        </div>
      )}
    </div>
  );
}
