import { Loader2, MessageCircle, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { mapAuthErrorToZh } from "../lib/authErrors";
import { checkEmailAvailable } from "../lib/checkEmailAvailable";
import { checkUsernameAvailable } from "../lib/checkUsernameAvailable";
import { precheckSignupRegistration } from "../lib/precheckSignupRegistration";
import { resolveLoginIdentifierToEmail } from "../lib/resolveLoginEmail";
import { supabase } from "../lib/supabaseClient";

type LoginModalProps = {
  open: boolean;
  onClose: () => void;
  onLoggedIn: (username: string, email: string, userId: string) => void;
  /** 展示在「密码登录 / 注册」标签上方，用于场景化引导（如拼好桌） */
  introBanner?: string | null;
};

type AuthMode = "login" | "signup" | "forgot";

export function LoginModal({
  open,
  onClose,
  onLoggedIn,
  introBanner = null,
}: LoginModalProps) {
  const [mode, setMode] = useState<AuthMode>("login");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  /** 密码登录：可填校园邮箱或注册时的校园昵称 */
  const [loginIdentifier, setLoginIdentifier] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  const [signEmail, setSignEmail] = useState("");
  const [nickname, setNickname] = useState("");
  const [signPassword, setSignPassword] = useState("");

  const [forgotIdentifier, setForgotIdentifier] = useState("");

  /** 邮箱已注册：独立弹窗（必须提示，再切到登录） */
  const [emailRegisteredAlertOpen, setEmailRegisteredAlertOpen] = useState(false);
  const [emailRegisteredForLogin, setEmailRegisteredForLogin] = useState("");

  const goToLoginAfterEmailRegistered = useCallback(() => {
    const em = emailRegisteredForLogin;
    setEmailRegisteredAlertOpen(false);
    setMode("login");
    setLoginIdentifier(em);
    setLoginPassword("");
    setError(null);
  }, [emailRegisteredForLogin]);

  useEffect(() => {
    if (!open) {
      setEmailRegisteredAlertOpen(false);
      setEmailRegisteredForLogin("");
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (emailRegisteredAlertOpen) {
        goToLoginAfterEmailRegistered();
        return;
      }
      onClose();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose, emailRegisteredAlertOpen, goToLoginAfterEmailRegistered]);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setLoading(false);
  }, [open, mode]);

  /** 防止连点触发两次 signUp，触发 Supabase 频率限制 */
  const signupInFlightRef = useRef(false);

  const prevOpenRef = useRef(false);
  useEffect(() => {
    if (open && !prevOpenRef.current) {
      setMode("login");
    }
    prevOpenRef.current = open;
  }, [open]);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2600);
  }, []);

  const canSubmit = useMemo(() => {
    if (mode === "login") {
      return loginIdentifier.trim() !== "" && loginPassword.trim() !== "";
    }
    if (mode === "forgot") {
      return forgotIdentifier.trim() !== "";
    }
    return (
      signEmail.trim() !== "" && nickname.trim() !== "" && signPassword.trim().length >= 6
    );
  }, [mode, loginIdentifier, loginPassword, forgotIdentifier, signEmail, nickname, signPassword]);

  const handleLogin = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const resolved = await resolveLoginIdentifierToEmail(loginIdentifier);
      if (!resolved.ok) {
        if (resolved.kind === "rpc_unavailable") {
          setError(
            "使用校园昵称登录需要先在 Supabase 执行项目里的 supabase_resolve_login.sql。你也可以直接用邮箱登录。"
          );
        } else {
          setError("未找到该校园昵称对应的账号，请检查拼写或改用邮箱登录。");
        }
        return;
      }
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: resolved.email,
        password: loginPassword,
      });
      if (signInError) throw signInError;
      const username =
        (data.user?.user_metadata?.username as string | undefined)?.trim() || "同学";
      const email = data.user?.email ?? resolved.email;
      onLoggedIn(username, email, data.user?.id ?? "");
      onClose();
    } catch (e) {
      const msg = mapAuthErrorToZh(e);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [loginIdentifier, loginPassword, onClose, onLoggedIn]);

  const handleSignUp = useCallback(async () => {
    if (signupInFlightRef.current) return;
    signupInFlightRef.current = true;
    try {
      setLoading(true);
      setError(null);
      const email = signEmail.trim();
      const nick = nickname.trim();

      if (!email.includes("@")) {
        setError("邮箱格式不正确，请检查后重试。");
        return;
      }

      const merged = await precheckSignupRegistration(email, nick);
      if (merged.ok) {
        if (!merged.emailAvailable) {
          setError(null);
          setEmailRegisteredForLogin(email);
          setEmailRegisteredAlertOpen(true);
          return;
        }
        if (!merged.usernameAvailable) {
          setError("昵称已注册，请更换昵称。");
          return;
        }
      } else {
        const emailCheck = await checkEmailAvailable(email);
        if (emailCheck.ok && !emailCheck.available) {
          setError(null);
          setEmailRegisteredForLogin(email);
          setEmailRegisteredAlertOpen(true);
          return;
        }
        if (!emailCheck.ok && emailCheck.kind === "rpc_unavailable") {
          // 未执行 supabase_is_email_available.sql 时，交给 signUp 报错区分
        }

        const nameCheck = await checkUsernameAvailable(nick);
        if (nameCheck.ok && !nameCheck.available) {
          setError("昵称已注册，请更换昵称。");
          return;
        }
        if (!nameCheck.ok && nameCheck.kind === "rpc_unavailable") {
          setError(
            "无法校验昵称是否占用：请先在 Supabase 执行 supabase_profiles_username_unique.sql，或稍后再试。"
          );
          return;
        }
      }

      const { data: signData, error: signUpError } = await supabase.auth.signUp({
        email,
        password: signPassword,
        options: {
          data: {
            username: nick,
          },
        },
      });
      if (signUpError) throw signUpError;
      setMode("login");
      setLoginIdentifier(email);
      setLoginPassword("");
      const needEmail =
        Boolean(signData.user) && !signData.session;
      showToast(
        needEmail
          ? "注册成功！请前往邮箱查收验证邮件，点击链接完成验证后再登录。"
          : "注册成功！请登录以开启南洋美食之旅。"
      );
    } catch (e) {
      const msg = mapAuthErrorToZh(e);
      if (msg.includes("邮箱已注册")) {
        setError(null);
        setEmailRegisteredForLogin(signEmail.trim());
        setEmailRegisteredAlertOpen(true);
      } else {
        setError(msg);
      }
    } finally {
      signupInFlightRef.current = false;
      setLoading(false);
    }
  }, [nickname, showToast, signEmail, signPassword]);

  const handleForgotPassword = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const resolved = await resolveLoginIdentifierToEmail(forgotIdentifier);
      if (!resolved.ok) {
        if (resolved.kind === "rpc_unavailable") {
          setError(
            "使用昵称找回密码需要先在 Supabase 执行 supabase_resolve_login.sql，或改用注册邮箱。"
          );
        } else {
          setError("未找到该校园昵称对应的账号，请改用注册邮箱或检查拼写。");
        }
        return;
      }
      const redirectTo = `${window.location.origin}${window.location.pathname}`;
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(resolved.email, {
        redirectTo,
      });
      if (resetError) throw resetError;
      showToast("若该邮箱已注册，你将收到重置邮件，请查收收件箱与垃圾箱。");
      setMode("login");
      setForgotIdentifier("");
    } catch (e) {
      setError(mapAuthErrorToZh(e));
    } finally {
      setLoading(false);
    }
  }, [forgotIdentifier, showToast]);

  if (!open) return null;

  const tabBtn = (id: AuthMode, label: string) => (
    <button
      key={id}
      type="button"
      role="tab"
      aria-selected={mode === id}
      onClick={() => setMode(id)}
      className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition-all duration-200 ${
        mode === id
          ? "pill-meituan-active ring-1 ring-black/10"
          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
      }`}
    >
      {label}
    </button>
  );

  return (
    <>
      <div
        className="login-modal-backdrop fixed inset-0 z-[110] flex items-end justify-center bg-black/50 p-0 md:items-center md:p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="login-modal-title"
        onClick={onClose}
      >
        <div
          className="login-modal-panel w-full max-w-full min-w-0 overflow-hidden rounded-t-3xl bg-white shadow-2xl md:max-h-[min(90vh,800px)] md:max-w-2xl md:rounded-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3 sm:px-5">
            <h2 id="login-modal-title" className="text-lg font-bold text-gray-900">
              {mode === "forgot" ? "找回密码" : "登录 / 注册"}
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-2 text-gray-500 transition-colors hover:bg-gray-100"
              aria-label="关闭"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {introBanner ? (
            <p className="border-b border-meituan-border/40 bg-gradient-to-r from-meituan-soft to-amber-50/90 px-4 py-3 text-center text-sm font-semibold leading-snug text-orange-900 sm:px-5">
              {introBanner}
            </p>
          ) : null}

          {mode !== "forgot" ? (
            <div
              className="hide-scrollbar scroll-x-touch flex gap-2 overflow-x-auto border-b border-gray-100 px-3 py-3 sm:px-4"
              role="tablist"
            >
              {tabBtn("login", "密码登录")}
              {tabBtn("signup", "注册新账号")}
            </div>
          ) : null}

          <div className="max-h-[min(65vh,520px)] overflow-y-auto px-4 py-4 sm:px-5 sm:py-5">
            {error && (
              <p className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
                {error}
              </p>
            )}

            {mode === "login" && (
              <div className="space-y-4" role="tabpanel">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-gray-500">
                    邮箱或校园昵称
                  </label>
                  <input
                    type="text"
                    autoComplete="username"
                    value={loginIdentifier}
                    onChange={(e) => setLoginIdentifier(e.target.value)}
                    placeholder="校园邮箱或注册时的昵称"
                    className="focus-meituan w-full min-w-0 rounded-xl border border-gray-200 px-3 py-2.5 text-base outline-none transition-shadow"
                  />
                </div>
                <div>
                  <div className="mb-1.5 flex items-center justify-between gap-2">
                    <label className="block text-xs font-medium text-gray-500">密码</label>
                    <button
                      type="button"
                      onClick={() => {
                        setForgotIdentifier(loginIdentifier.trim());
                        setMode("forgot");
                      }}
                      className="text-xs font-semibold text-orange-600 underline-offset-2 hover:underline"
                    >
                      忘记密码？
                    </button>
                  </div>
                  <input
                    type="password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="请输入密码"
                    className="focus-meituan w-full min-w-0 rounded-xl border border-gray-200 px-3 py-2.5 text-base outline-none transition-shadow"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleLogin}
                  disabled={loading || !canSubmit}
                  className="btn-meituan flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm shadow-md disabled:opacity-60"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      加载中...
                    </>
                  ) : (
                    "登录"
                  )}
                </button>
              </div>
            )}

            {mode === "signup" && (
              <div className="space-y-4" role="tabpanel">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-gray-500">
                    校园邮箱
                  </label>
                  <input
                    type="email"
                    value={signEmail}
                    onChange={(e) => setSignEmail(e.target.value)}
                    placeholder="请输入校园邮箱"
                    className="focus-meituan w-full min-w-0 rounded-xl border border-gray-200 px-3 py-2.5 text-base outline-none transition-shadow"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-gray-500">
                    校园昵称
                  </label>
                  <input
                    type="text"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    placeholder="起个好听的干饭名"
                    className="focus-meituan w-full min-w-0 rounded-xl border border-gray-200 px-3 py-2.5 text-base outline-none transition-shadow"
                  />
                  <p className="mt-1.5 text-[11px] leading-snug text-gray-500">
                    每个邮箱仅能注册一个账号与一个校园昵称；昵称全站唯一，不可与他人重复。
                  </p>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-gray-500">密码</label>
                  <input
                    type="password"
                    value={signPassword}
                    onChange={(e) => setSignPassword(e.target.value)}
                    placeholder="至少 6 位"
                    className="focus-meituan w-full min-w-0 rounded-xl border border-gray-200 px-3 py-2.5 text-base outline-none transition-shadow"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleSignUp}
                  disabled={loading || !canSubmit}
                  className="btn-meituan flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm shadow-md disabled:opacity-60"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      加载中...
                    </>
                  ) : (
                    "立即注册"
                  )}
                </button>
              </div>
            )}

            {mode === "forgot" && (
              <div className="space-y-4" role="region" aria-label="找回密码">
                <p className="text-sm leading-relaxed text-gray-600">
                  输入注册时的邮箱或校园昵称，我们将向绑定邮箱发送重置链接。打开邮件中的链接后，在本页设置新密码。
                </p>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-gray-500">
                    邮箱或校园昵称
                  </label>
                  <input
                    type="text"
                    autoComplete="username"
                    value={forgotIdentifier}
                    onChange={(e) => setForgotIdentifier(e.target.value)}
                    placeholder="校园邮箱或注册时的昵称"
                    className="focus-meituan w-full min-w-0 rounded-xl border border-gray-200 px-3 py-2.5 text-base outline-none transition-shadow"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  disabled={loading || !canSubmit}
                  className="btn-meituan flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm shadow-md disabled:opacity-60"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      发送中...
                    </>
                  ) : (
                    "发送重置邮件"
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setMode("login")}
                  className="w-full rounded-xl py-2.5 text-sm font-semibold text-gray-600 transition hover:bg-gray-50"
                >
                  返回登录
                </button>
              </div>
            )}

            {mode !== "forgot" ? (
              <div className="mt-5 border-t border-gray-100 pt-4">
                <button
                  type="button"
                  onClick={() => showToast("内测环境，请使用账号密码")}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#07C160] py-3.5 text-sm font-bold text-white shadow-md transition active:scale-[0.99] hover:brightness-95"
                >
                  <MessageCircle className="h-5 w-5" aria-hidden />
                  使用 微信快捷登录
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {emailRegisteredAlertOpen &&
        createPortal(
          <div
            className="fixed inset-0 z-[130] flex min-h-[100dvh] items-center justify-center bg-black/55 p-4"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="email-registered-title"
            aria-describedby="email-registered-desc"
            onClick={goToLoginAfterEmailRegistered}
          >
            <div
              className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl ring-1 ring-black/10"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 id="email-registered-title" className="text-lg font-bold text-gray-900">
                提示
              </h3>
              <p
                id="email-registered-desc"
                className="mt-3 text-sm leading-relaxed text-gray-700"
              >
                该邮箱已注册，请使用「密码登录」直接登录。
              </p>
              {emailRegisteredForLogin ? (
                <p className="mt-2 break-all rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-600">
                  {emailRegisteredForLogin}
                </p>
              ) : null}
              <button
                type="button"
                onClick={goToLoginAfterEmailRegistered}
                className="btn-meituan mt-6 w-full rounded-xl py-3 text-sm font-bold shadow-md"
              >
                去登录
              </button>
            </div>
          </div>,
          document.body
        )}

      {toast && (
        <div
          className="fixed bottom-24 left-4 right-4 z-[120] rounded-2xl border border-meituan-border bg-gray-900 px-4 py-3 text-center text-sm font-medium text-white shadow-2xl md:left-auto md:right-8 md:w-full md:max-w-md"
          role="status"
        >
          {toast}
        </div>
      )}
    </>
  );
}

