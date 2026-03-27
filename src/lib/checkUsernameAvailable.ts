import { supabase } from "./supabaseClient";

export type UsernameCheckResult =
  | { ok: true; available: boolean }
  | { ok: false; kind: "rpc_unavailable" };

/**
 * 注册前检查校园昵称是否仍可用（依赖 is_username_available RPC）。
 */
export async function checkUsernameAvailable(nickname: string): Promise<UsernameCheckResult> {
  const raw = nickname.trim();
  if (!raw) return { ok: true, available: false };

  const { data, error } = await supabase.rpc("is_username_available", { candidate: raw });

  if (error) {
    const msg = error.message ?? "";
    if (/function .* does not exist|could not find.*function/i.test(msg) || error.code === "42883") {
      return { ok: false, kind: "rpc_unavailable" };
    }
    return { ok: true, available: false };
  }

  return { ok: true, available: data === true };
}
