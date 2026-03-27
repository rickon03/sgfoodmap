import { supabase } from "./supabaseClient";

export type PrecheckSignupResult =
  | { ok: true; emailAvailable: boolean; usernameAvailable: boolean }
  | { ok: false; kind: "rpc_unavailable" };

/**
 * 注册前合并查重（依赖 precheck_signup_registration RPC）。
 * 失败时由调用方回退为分别调用 checkEmailAvailable / checkUsernameAvailable。
 */
export async function precheckSignupRegistration(
  email: string,
  nickname: string
): Promise<PrecheckSignupResult> {
  const { data, error } = await supabase.rpc("precheck_signup_registration", {
    p_email: email.trim(),
    p_username: nickname.trim(),
  });

  if (error) {
    return { ok: false, kind: "rpc_unavailable" };
  }

  const row = data as { email_available?: boolean; username_available?: boolean } | null;
  if (!row || typeof row !== "object") {
    return { ok: false, kind: "rpc_unavailable" };
  }

  return {
    ok: true,
    emailAvailable: row.email_available === true,
    usernameAvailable: row.username_available === true,
  };
}
