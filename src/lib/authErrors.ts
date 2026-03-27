import { isAuthError } from "@supabase/supabase-js";
import { formatSupabaseError } from "./supabaseError";

export const CONNECTIVITY_HINT =
  "无法连接到 Supabase。请检查网络或 VPN，并确认项目根目录 .env 中的 VITE_SUPABASE_URL、VITE_SUPABASE_ANON_KEY 与控制台一致。";

export function getErrorMessage(error: unknown): string {
  return formatSupabaseError(error);
}

export function looksLikeConnectivityFailure(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("failed to fetch") ||
    lower.includes("networkerror") ||
    lower.includes("network request failed") ||
    lower.includes("load failed") ||
    lower.includes("fetch failed") ||
    lower.includes("net::err_") ||
    lower.includes("econnrefused") ||
    lower.includes("enotfound") ||
    lower.includes("etimedout") ||
    lower.includes("aborted") ||
    lower.includes("cors") ||
    lower.includes("ssl") ||
    lower.includes("certificate")
  );
}

/** 登录 / 注册 / 重置密码等 Auth 调用的中文提示 */
export function mapAuthErrorToZh(error: unknown): string {
  if (import.meta.env.DEV) {
    console.error("[auth]", error);
  }

  if (looksLikeConnectivityFailure(formatSupabaseError(error))) {
    return CONNECTIVITY_HINT;
  }

  if (isAuthError(error)) {
    const code = String(error.code ?? "");
    if (code === "invalid_credentials" || error.name === "AuthInvalidCredentialsError") {
      return "邮箱或密码错误，请重试。";
    }
    // 注册：邮箱已在系统中（GoTrue 常见 code）
    if (code === "email_exists" || code === "user_already_exists") {
      return "邮箱已注册，请直接登录。";
    }
    if (code === "weak_password") {
      return "密码强度不足，请换更长或更复杂的密码。";
    }
    // GoTrue：发信 / 全局限流（含 over_request_rate_limit）
    if (
      code === "over_email_send_rate_limit" ||
      code === "over_request_rate_limit" ||
      code === "over_sms_send_rate_limit" ||
      code === "too_many_requests"
    ) {
      return "操作过于频繁，请稍后再试。若首次注册仍出现，请确认未连续点击「立即注册」，或稍等几分钟后重试。";
    }
  }

  const message = formatSupabaseError(error);
  const lower = message.toLowerCase();

  if (looksLikeConnectivityFailure(message)) {
    return CONNECTIVITY_HINT;
  }

  if (lower.includes("invalid login credentials")) return "邮箱或密码错误，请重试。";

  // 邮箱已被注册（英文文案随版本可能不同）
  if (
    lower.includes("user already registered") ||
    lower.includes("user already exists") ||
    lower.includes("already been registered") ||
    lower.includes("email address is already") ||
    (lower.includes("already in use") &&
      (lower.includes("email") || lower.includes("address"))) ||
    lower.includes("email already") ||
    (lower.includes("duplicate key") && lower.includes("users_email"))
  ) {
    return "邮箱已注册，请直接登录。";
  }

  if (lower.includes("password should be at least")) return "密码至少 6 位，请重新输入。";
  if (lower.includes("unable to validate email address")) return "邮箱格式不正确，请检查后重试。";
  if (lower.includes("email not confirmed")) return "邮箱尚未验证，请先完成验证。";
  if (lower.includes("same password")) return "新密码不能与当前密码相同，请换一个。";

  if (lower.includes("username_required")) {
    return "请填写校园昵称。";
  }

  // 昵称冲突：profiles 唯一约束或触发器 username_taken
  if (
    lower.includes("username_taken") ||
    (lower.includes("duplicate key") &&
      (lower.includes("profiles") || lower.includes("profiles_username")))
  ) {
    return "昵称已注册，请更换昵称。";
  }

  if (lower.includes("rate limit") || lower.includes("too many requests")) {
    return "操作过于频繁，请稍后再试。若首次注册仍出现，请确认未连续点击「立即注册」，或稍等几分钟后重试。";
  }

  // 其它错误给出可读原文（多为英文），避免只显示「操作失败」
  if (message.length > 0 && message !== "{}" && !message.startsWith("[object ")) {
    return message.length > 80 ? `${message.slice(0, 80)}…` : message;
  }

  return "操作失败，请稍后再试。";
}
