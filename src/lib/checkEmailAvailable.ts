import { supabase } from "./supabaseClient";

export type EmailCheckResult =
  | { ok: true; available: boolean }
  | { ok: false; kind: "rpc_unavailable" };

/**
 * 注册前：邮箱是否尚未注册（依赖 is_email_available_for_signup RPC）。
 * 一个邮箱在 Supabase Auth 中只能对应一个用户，故「可用」= 尚未占用。
 */
export async function checkEmailAvailable(email: string): Promise<EmailCheckResult> {
  const raw = email.trim();
  // 格式不对交给 signUp / 前端提示，不当作「邮箱已被注册」
  if (!raw || !raw.includes("@")) {
    return { ok: true, available: true };
  }

  const { data, error } = await supabase.rpc("is_email_available_for_signup", {
    candidate: raw,
  });

  if (error) {
    // 含函数不存在或其它错误：不预判断邮箱，交给 signUp
    return { ok: false, kind: "rpc_unavailable" };
  }

  return { ok: true, available: data === true };
}
