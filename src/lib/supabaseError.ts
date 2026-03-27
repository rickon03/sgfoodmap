/** 将 Supabase / PostgREST 错误对象转为可读文案（避免 [object Object]） */
export function formatSupabaseError(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (typeof e === "object" && e !== null) {
    const o = e as Record<string, unknown>;
    const msg = o.message;
    const details = o.details;
    const hint = o.hint;
    const parts: string[] = [];
    if (typeof msg === "string" && msg.trim()) parts.push(msg.trim());
    if (typeof details === "string" && details.trim()) parts.push(details.trim());
    if (typeof hint === "string" && hint.trim()) parts.push(hint.trim());
    if (parts.length) return parts.join(" · ");
  }
  if (typeof e === "string") return e;
  try {
    return JSON.stringify(e);
  } catch {
    return "未知错误";
  }
}
