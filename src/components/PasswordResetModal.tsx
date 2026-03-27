import { Loader2, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { mapAuthErrorToZh } from "../lib/authErrors";

type PasswordResetModalProps = {
  open: boolean;
  onClose: () => void;
  /** 密码修改成功并已登录 */
  onPasswordUpdated: (username: string, email: string, userId: string) => void;
};

export function PasswordResetModal({
  open,
  onClose,
  onPasswordUpdated,
}: PasswordResetModalProps) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setPassword("");
    setConfirm("");
    setError(null);
    setLoading(false);
  }, [open]);

  const handleBackdropClose = useCallback(async () => {
    await supabase.auth.signOut();
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") void handleBackdropClose();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, handleBackdropClose]);

  const canSubmit = useMemo(() => {
    return password.trim().length >= 6 && password === confirm;
  }, [password, confirm]);

  const handleSubmit = useCallback(async () => {
    if (!canSubmit) return;
    try {
      setLoading(true);
      setError(null);
      const { data, error: updateError } = await supabase.auth.updateUser({
        password: password.trim(),
      });
      if (updateError) throw updateError;
      const user = data.user;
      const username =
        (user?.user_metadata?.username as string | undefined)?.trim() || "同学";
      const email = user?.email ?? "";
      onPasswordUpdated(username, email, user?.id ?? "");
      onClose();
    } catch (e) {
      setError(mapAuthErrorToZh(e));
    } finally {
      setLoading(false);
    }
  }, [canSubmit, onClose, onPasswordUpdated, password]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[115] flex items-end justify-center bg-black/50 p-0 md:items-center md:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="password-reset-title"
      onClick={handleBackdropClose}
    >
      <div
        className="w-full max-w-full min-w-0 overflow-hidden rounded-t-3xl bg-white shadow-2xl md:max-h-[min(90vh,560px)] md:max-w-md md:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3 sm:px-5">
          <h2 id="password-reset-title" className="text-lg font-bold text-gray-900">
            设置新密码
          </h2>
          <button
            type="button"
            onClick={handleBackdropClose}
            className="rounded-full p-2 text-gray-500 transition-colors hover:bg-gray-100"
            aria-label="关闭"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[min(70vh,480px)] overflow-y-auto px-4 py-4 sm:px-5 sm:py-5">
          <p className="mb-4 text-sm leading-relaxed text-gray-600">
            请为账号设置新密码（至少 6 位）。关闭此窗口将取消重置并退出当前会话。
          </p>

          {error && (
            <p className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
              {error}
            </p>
          )}

          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-500">新密码</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="至少 6 位"
                autoComplete="new-password"
                className="focus-meituan w-full min-w-0 rounded-xl border border-gray-200 px-3 py-2.5 text-base outline-none transition-shadow"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-500">确认新密码</label>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="再次输入新密码"
                autoComplete="new-password"
                className="focus-meituan w-full min-w-0 rounded-xl border border-gray-200 px-3 py-2.5 text-base outline-none transition-shadow"
              />
            </div>
            {confirm.length > 0 && password !== confirm && (
              <p className="text-sm text-amber-700">两次输入的密码不一致。</p>
            )}
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading || !canSubmit}
              className="btn-meituan flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm shadow-md disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  保存中...
                </>
              ) : (
                "保存新密码"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
