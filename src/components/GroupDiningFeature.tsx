import { Flame, Loader2, Users, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import type { Restaurant } from "../data/restaurants";
import { formatSupabaseError } from "../lib/supabaseError";
import { supabase } from "../lib/supabaseClient";

type TeamRow = {
  id: string;
  restaurant_id: string;
  restaurant_name: string;
  creator_name: string;
  current_people: number;
  target_people: number;
  meet_time: string;
  status: string;
};

type GroupDiningFeatureProps = {
  restaurants: Restaurant[];
  isLoggedIn: boolean;
  userId: string | null;
  currentUsername: string;
  hideTriggers?: boolean;
  openSignal?: number;
  /** 未登录时诱导登录：传入登录弹窗顶部引导文案 */
  onRequestLogin?: (introBanner: string) => void;
};

const INTRO_JOIN = "登录后即可加入拼桌，和饭搭子一起开吃～";
const INTRO_CREATE = "登录后即可发起拼桌，和饭搭子一起开吃～";

export function GroupDiningFeature({
  restaurants,
  isLoggedIn,
  userId,
  currentUsername,
  hideTriggers = false,
  openSignal = 0,
  onRequestLogin,
}: GroupDiningFeatureProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [view, setView] = useState<"list" | "create">("list");
  const [toast, setToast] = useState<string | null>(null);
  const [teams, setTeams] = useState<TeamRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [joinedTeamIds, setJoinedTeamIds] = useState<Set<string>>(new Set());
  const [leaveConfirmTeam, setLeaveConfirmTeam] = useState<TeamRow | null>(null);
  const [leavingId, setLeavingId] = useState<string | null>(null);

  const [restaurantId, setRestaurantId] = useState("");
  const [targetPeople, setTargetPeople] = useState(4);
  const [meetTime, setMeetTime] = useState("18:30");

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 3200);
  }, []);

  const fetchTeams = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("teams")
        .select("*")
        .order("created_at", { ascending: false })
        .returns<TeamRow[]>();
      if (error) throw error;
      setTeams(data ?? []);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "获取拼桌队伍失败";
      showToast(`加载失败：${msg}`);
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    if (!modalOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setModalOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [modalOpen]);

  useEffect(() => {
    if (!modalOpen) return;
    fetchTeams();
  }, [modalOpen, fetchTeams]);

  const fetchJoinedIds = useCallback(async () => {
    if (!isLoggedIn || !userId) {
      setJoinedTeamIds(new Set());
      return;
    }
    const { data, error } = await supabase.from("team_members").select("team_id").eq("user_id", userId);
    if (error) {
      if (import.meta.env.DEV) console.error("[team_members]", error);
      return;
    }
    setJoinedTeamIds(new Set((data ?? []).map((r) => r.team_id as string)));
  }, [isLoggedIn, userId]);

  useEffect(() => {
    if (!modalOpen) return;
    void fetchJoinedIds();
  }, [modalOpen, fetchJoinedIds]);

  useEffect(() => {
    if (!openSignal) return;
    setView("list");
    setModalOpen(true);
  }, [openSignal]);

  const restaurantOptions = useMemo(
    () => restaurants.map((r) => ({ id: r.id, name: r.name })),
    [restaurants]
  );

  const mapRpcError = (e: unknown) => {
    const msg = formatSupabaseError(e);
    const lower = msg.toLowerCase();
    if (lower.includes("already_joined")) return "你已加入该拼桌。";
    if (lower.includes("not_joined")) return "你未加入该拼桌。";
    if (lower.includes("team_full")) return "该队伍已满员，请选择其他队伍";
    if (lower.includes("team_not_found")) return "该拼桌已不存在";
    if (lower.includes("not_authenticated")) return "请先登录";
    if (lower.includes("function") && lower.includes("does not exist"))
      return "请先在 Supabase 执行 supabase_team_members.sql";
    return msg;
  };

  const joinTeam = async (team: TeamRow) => {
    if (joiningId || leavingId) return;
    if (!isLoggedIn || !userId) {
      onRequestLogin?.(INTRO_JOIN);
      return;
    }
    if (joinedTeamIds.has(team.id)) return;
    if (team.current_people >= team.target_people) {
      showToast("该队伍已满员，请选择其他队伍");
      return;
    }
    try {
      setJoiningId(team.id);
      const { error } = await supabase.rpc("join_team", { p_team_id: team.id });
      if (error) throw error;
      showToast("加入成功！快去和饭搭子打招呼吧！");
      await fetchTeams();
      await fetchJoinedIds();
    } catch (e) {
      showToast(`加入失败：${mapRpcError(e)}`);
      await fetchTeams();
      await fetchJoinedIds();
    } finally {
      setJoiningId(null);
    }
  };

  const leaveTeam = async (team: TeamRow) => {
    if (leavingId || joiningId) return;
    if (!userId) return;
    try {
      setLeavingId(team.id);
      const { error } = await supabase.rpc("leave_team", { p_team_id: team.id });
      if (error) throw error;
      showToast("已退出该拼桌");
      setLeaveConfirmTeam(null);
      await fetchTeams();
      await fetchJoinedIds();
    } catch (e) {
      showToast(`退出失败：${mapRpcError(e)}`);
    } finally {
      setLeavingId(null);
    }
  };

  const createTeam = async () => {
    if (creating) return;
    if (!isLoggedIn || !userId) {
      onRequestLogin?.(INTRO_CREATE);
      return;
    }
    const target = Number(targetPeople);
    if (!restaurantId) {
      showToast("请先选择餐厅");
      return;
    }
    if (!Number.isFinite(target) || target < 2 || target > 8) {
      showToast("目标人数请填写 2-8 人");
      return;
    }
    if (!meetTime) {
      showToast("请填写集合时间");
      return;
    }
    const picked = restaurants.find((r) => r.id === restaurantId);
    if (!picked) {
      showToast("餐厅信息异常，请重新选择");
      return;
    }
    try {
      setCreating(true);
      const { data: inserted, error } = await supabase
        .from("teams")
        .insert([
          {
            restaurant_id: picked.id,
            restaurant_name: picked.name,
            creator_name: currentUsername || "同学",
            current_people: 1,
            target_people: target,
            meet_time: meetTime,
            status: "招募中",
          },
        ])
        .select("id")
        .single();
      if (error) throw error;
      if (!inserted?.id || !userId) throw new Error("创建失败");
      const { error: memErr } = await supabase.from("team_members").insert({
        team_id: inserted.id,
        user_id: userId,
      });
      if (memErr) {
        await supabase.from("teams").delete().eq("id", inserted.id);
        throw memErr;
      }
      showToast("发起成功！你的拼桌已创建");
      setView("list");
      setRestaurantId("");
      setTargetPeople(4);
      setMeetTime("18:30");
      await fetchTeams();
      await fetchJoinedIds();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "发起失败";
      showToast(`发起失败：${msg}`);
    } finally {
      setCreating(false);
    }
  };

  return (
    <>
      {!hideTriggers && (
        <section className="px-4 pt-4 md:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <button
              type="button"
              onClick={() => {
                setView("list");
                setModalOpen(true);
              }}
              className="group relative flex w-full min-w-0 items-center gap-3 overflow-hidden rounded-2xl bg-meituan p-3.5 pr-4 text-left shadow-lg shadow-black/15 ring-2 ring-black/10 transition-transform active:scale-[0.99] sm:gap-4 sm:p-4"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gray-900/10 backdrop-blur-sm sm:h-12 sm:w-12">
                <Users className="h-6 w-6 text-gray-900 sm:h-7 sm:w-7" strokeWidth={2} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-base font-black tracking-tight text-gray-900 drop-shadow-sm sm:text-lg">
                  🔥 拼好桌 - 组队吃大餐
                </p>
                <p className="mt-0.5 text-xs font-semibold text-gray-800/90 sm:text-sm">
                  找饭搭子 · 实时拼桌 · 一键加入
                </p>
              </div>
              <span className="absolute right-2 top-2 shrink-0 rounded-md bg-red-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shadow-md ring-1 ring-white/50 sm:right-3 sm:top-3 sm:text-xs">
                实时更新
              </span>
              <Flame
                className="pointer-events-none absolute -right-4 -bottom-6 h-24 w-24 text-gray-900/10 transition-transform group-hover:scale-110"
                aria-hidden
              />
            </button>
          </div>
        </section>
      )}

      <button
        type="button"
        onClick={() => {
          setView("list");
          setModalOpen(true);
        }}
        className="fixed bottom-20 right-4 z-[42] flex h-14 w-14 items-center justify-center rounded-full bg-meituan text-gray-900 shadow-xl shadow-black/20 ring-4 ring-white transition hover:bg-meituan-hover hover:scale-105 active:scale-95 md:bottom-8"
        aria-label="打开拼好桌"
      >
        <Users className="h-7 w-7" strokeWidth={2} />
      </button>

      {modalOpen &&
        createPortal(
          <div
            className="group-dining-overlay fixed inset-0 z-[92] flex min-h-[100dvh] min-h-[100svh] w-full items-end justify-center bg-black/50 p-0 md:items-center md:p-6"
            role="dialog"
            aria-modal="true"
            aria-labelledby="group-dining-title"
            onClick={() => setModalOpen(false)}
          >
            <div
              className="group-dining-sheet flex max-h-[min(78vh,82dvh)] w-full max-w-full flex-col rounded-t-3xl bg-gradient-to-b from-meituan-soft via-white to-white md:max-h-[min(85vh,880px)] md:max-w-2xl md:rounded-2xl md:shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
            <div className="flex shrink-0 items-start justify-between gap-2 border-b border-meituan-border/30 px-4 py-4 md:px-6">
              <div className="min-w-0">
                <h2 id="group-dining-title" className="text-lg font-black text-gray-900 md:text-xl">
                  找饭搭子，拼好桌
                </h2>
                <p className="mt-1 text-sm font-medium text-orange-600">
                  {view === "list" ? "实时查看队伍并加入" : "创建你的拼桌队伍"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="shrink-0 rounded-full p-2 text-gray-500 hover:bg-gray-100"
                aria-label="关闭"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-4 py-4 md:px-6">
              {view === "list" && (
                <div className="space-y-3">
                  {loading ? (
                    <p className="rounded-2xl bg-white p-4 text-center text-sm text-gray-500 ring-1 ring-gray-100">
                      正在加载拼桌队伍...
                    </p>
                  ) : teams.length === 0 ? (
                    <p className="rounded-2xl bg-white p-4 text-center text-sm text-gray-500 ring-1 ring-gray-100">
                      暂无队伍，快发起第一桌吧～
                    </p>
                  ) : (
                    teams.map((t) => {
                      const full = t.current_people >= t.target_people;
                      const joining = joiningId === t.id;
                      const leaving = leavingId === t.id;
                      const joined = isLoggedIn && joinedTeamIds.has(t.id);
                      return (
                        <article
                          key={t.id}
                          className="flex flex-col gap-3 rounded-2xl border-2 border-meituan-border/40 bg-white p-3 shadow-sm ring-1 ring-gray-100 md:flex-row md:items-center md:justify-between md:gap-4"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="font-bold text-gray-900">{t.restaurant_name}</p>
                            <p className="mt-1 text-xs text-gray-500">
                              发起人 <span className="font-semibold text-red-600">{t.creator_name}</span>
                            </p>
                            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs md:text-sm">
                              <span className="rounded-full bg-meituan px-2.5 py-0.5 font-bold text-gray-900">
                                {t.current_people}/{t.target_people} 人
                              </span>
                              <span className="rounded-full bg-gray-100 px-2.5 py-0.5 font-medium text-gray-700">
                                {t.meet_time} 集合
                              </span>
                              <span className="rounded-full bg-red-100 px-2.5 py-0.5 font-semibold text-red-700">
                                {full ? "已满员" : t.status}
                              </span>
                            </div>
                          </div>
                          {joined ? (
                            <button
                              type="button"
                              disabled={leavingId === t.id}
                              onClick={() => setLeaveConfirmTeam(t)}
                              className="shrink-0 rounded-xl border-2 border-meituan-border bg-meituan-soft px-5 py-2.5 text-sm font-bold text-gray-900 shadow-sm transition hover:bg-meituan/50 disabled:opacity-60"
                            >
                              {leaving ? "处理中..." : "已加入"}
                            </button>
                          ) : (
                            <button
                              type="button"
                              disabled={full || joining}
                              onClick={() => joinTeam(t)}
                              className="btn-meituan shrink-0 rounded-xl px-5 py-2.5 text-sm font-bold shadow-md disabled:opacity-60"
                            >
                              {joining ? "加入中..." : full ? "已满" : "立即加入"}
                            </button>
                          )}
                        </article>
                      );
                    })
                  )}
                </div>
              )}

              {view === "create" && (
                <div className="space-y-4 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-gray-500">
                      选择餐厅
                    </label>
                    <select
                      value={restaurantId}
                      onChange={(e) => setRestaurantId(e.target.value)}
                      className="focus-meituan w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm"
                    >
                      <option value="">请选择餐厅</option>
                      {restaurantOptions.map((opt) => (
                        <option key={opt.id} value={opt.id}>
                          {opt.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-gray-500">
                      目标人数（2-8）
                    </label>
                    <input
                      type="number"
                      min={2}
                      max={8}
                      value={targetPeople}
                      onChange={(e) => setTargetPeople(Number(e.target.value))}
                      className="focus-meituan w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-gray-500">
                      集合时间
                    </label>
                    <input
                      type="time"
                      value={meetTime}
                      onChange={(e) => setMeetTime(e.target.value)}
                      className="focus-meituan w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={createTeam}
                    disabled={creating}
                    className="btn-meituan flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold shadow-md disabled:opacity-60"
                  >
                    {creating && <Loader2 className="h-4 w-4 animate-spin" />}
                    {creating ? "发起中..." : "提交发起"}
                  </button>
                </div>
              )}
            </div>

            <div className="shrink-0 border-t border-meituan-border/30 bg-white/95 px-4 py-4 md:px-6">
              {view === "list" ? (
                <button
                  type="button"
                  onClick={() => {
                    if (!isLoggedIn) {
                      onRequestLogin?.(INTRO_CREATE);
                      return;
                    }
                    setView("create");
                  }}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-meituan-border bg-meituan-soft py-3.5 text-sm font-bold text-gray-900 transition hover:bg-meituan/40"
                >
                  ➕ 发起我的拼桌
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setView("list")}
                  className="w-full rounded-2xl border border-gray-200 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                >
                  返回队伍列表
                </button>
              )}
            </div>
          </div>
        </div>,
          document.body
        )}

      {leaveConfirmTeam &&
        createPortal(
          <div
            className="fixed inset-0 z-[96] flex min-h-[100dvh] min-h-[100svh] w-full items-center justify-center bg-black/55 p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="leave-team-title"
            onClick={() => !leavingId && setLeaveConfirmTeam(null)}
          >
          <div
            className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="leave-team-title" className="text-base font-bold text-gray-900">
              退出拼桌？
            </h3>
            <p className="mt-2 text-sm text-gray-600">
              确定退出「{leaveConfirmTeam.restaurant_name}」的拼桌吗？
            </p>
            <div className="mt-5 flex gap-3">
              <button
                type="button"
                disabled={!!leavingId}
                onClick={() => setLeaveConfirmTeam(null)}
                className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                取消
              </button>
              <button
                type="button"
                disabled={!!leavingId}
                onClick={() => void leaveTeam(leaveConfirmTeam)}
                className="flex-1 rounded-xl bg-red-600 py-2.5 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-60"
              >
                {leavingId ? "退出中..." : "确认退出"}
              </button>
            </div>
          </div>
        </div>,
          document.body
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

