import { supabase } from "./supabaseClient";

export type ResolveLoginResult =
  | { ok: true; email: string }
  | { ok: false; kind: "not_found" | "rpc_unavailable" };

/**
 * 登录框输入：含 @ 则视为邮箱；否则按校园昵称在库中解析为邮箱（需已执行 supabase_resolve_login.sql）。
 */
export async function resolveLoginIdentifierToEmail(identifier: string): Promise<ResolveLoginResult> {
  const raw = identifier.trim();
  if (!raw) return { ok: false, kind: "not_found" };

  if (raw.includes("@")) {
    return { ok: true, email: raw.toLowerCase() };
  }

  const { data, error } = await supabase.rpc("resolve_login_email", { identifier: raw });

  if (error) {
    const msg = error.message ?? "";
    if (
      /function .* does not exist|could not find.*function/i.test(msg) ||
      error.code === "42883"
    ) {
      return { ok: false, kind: "rpc_unavailable" };
    }
    return { ok: false, kind: "not_found" };
  }

  if (data == null || typeof data !== "string" || data.trim() === "") {
    return { ok: false, kind: "not_found" };
  }

  return { ok: true, email: data.trim() };
}
