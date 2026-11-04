import { useState, type ChangeEvent, type FormEvent, type ReactNode } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { Check, Circle, Eye, EyeOff, LockKeyhole, ShieldCheck, Sparkles } from "lucide-react";
import { useAuth } from "./auth-context";
import { safeReturnTo } from "./require-auth";
import { isStrongPassword, passwordRules } from "./password-validation";

function parseEmail(value: FormDataEntryValue | null): string | null {
  if (typeof value !== "string") return null;
  const email = value.trim();
  return email.length <= 320 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}

function parsePassword(value: FormDataEntryValue | null, strong = true): string | null {
  if (typeof value !== "string" || value.length === 0 || value.length > 72) return null;
  return strong && !isStrongPassword(value) ? null : value;
}

function parseFullName(value: FormDataEntryValue | null): string | null {
  if (typeof value !== "string") return null;
  const name = value.trim();
  return name.length >= 2 && name.length <= 100 ? name : null;
}

function AuthLayout({
  title,
  subtitle,
  children,
  signup = false,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  signup?: boolean;
}) {
  const { configError } = useAuth();
  const brand = (
    <Link
      to="/login"
      className="flex items-center gap-2.5 text-xs font-semibold tracking-[0.18em] text-foreground"
    >
      <span className="flex size-8 items-center justify-center rounded-md bg-primary text-sm text-primary-foreground">
        W
      </span>{" "}
      WORKSPACE
    </Link>
  );

  const formContent = (
    <>
      <h1 className="font-display text-3xl">{title}</h1>
      <p className="mt-2 mb-7 text-sm text-muted-foreground">{subtitle}</p>
      {configError && (
        <p
          className="mb-5 rounded-md border border-warning/30 bg-warning-soft p-3 text-sm"
          role="alert"
        >
          {configError}
        </p>
      )}
      {children}
    </>
  );

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <section
        className={
          signup
            ? "grid w-full max-w-5xl overflow-hidden rounded-2xl border bg-card shadow-pop lg:grid-cols-[0.92fr_1.08fr]"
            : "w-full max-w-md rounded-xl border bg-card p-7 shadow-card sm:p-9"
        }
      >
        {signup && (
          <aside className="relative hidden overflow-hidden bg-sidebar p-10 text-sidebar-foreground lg:flex lg:min-h-[680px] lg:flex-col lg:justify-between">
            <div
              aria-hidden="true"
              className="absolute -top-24 -right-28 size-80 rounded-full border border-sidebar-border/70"
            />
            <div
              aria-hidden="true"
              className="absolute top-24 -right-12 size-56 rounded-full border border-sidebar-border/50"
            />
            <div className="relative">
              <div className="mb-16 flex size-11 items-center justify-center rounded-xl bg-sidebar-primary font-display text-xl font-semibold text-sidebar-primary-foreground">
                W
              </div>
              <p className="eyebrow text-sidebar-primary">A clearer way to work</p>
              <h2 className="mt-4 max-w-sm font-display text-4xl leading-tight">
                Make room for your best work.
              </h2>
              <p className="mt-5 max-w-sm text-sm leading-6 text-sidebar-muted">
                Start with a private workspace for your projects, plans, and next steps.
              </p>
              <ul className="mt-9 space-y-5 text-sm">
                <li className="flex items-center gap-3">
                  <LockKeyhole className="size-4 text-sidebar-primary" /> Your personal workspace
                  stays private
                </li>
                <li className="flex items-center gap-3">
                  <ShieldCheck className="size-4 text-sidebar-primary" /> You choose what to share
                  later
                </li>
                <li className="flex items-center gap-3">
                  <Sparkles className="size-4 text-sidebar-primary" /> One calm place to organize
                  your work
                </li>
              </ul>
            </div>
            <p className="relative text-xs text-sidebar-muted">
              Thoughtful planning starts with a little clarity.
            </p>
          </aside>
        )}
        <div className={signup ? "p-7 sm:p-10 lg:p-12" : ""}>
          <div className="mb-8">{brand}</div>
          {formContent}
        </div>
      </section>
    </main>
  );
}

function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const { signIn, signUp, user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  if (user)
    return (
      <Navigate to={safeReturnTo((location.state as { from?: unknown } | null)?.from)} replace />
    );

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    const data = new FormData(event.currentTarget);
    const email = parseEmail(data.get("email"));
    const password = parsePassword(data.get("password"), mode === "signup");
    const fullName = parseFullName(data.get("fullName"));
    if (!email) {
      setError("Enter a valid email address.");
      return;
    }
    if (!password) {
      setError(
        mode === "signup" ? "Meet each password requirement below." : "Enter your password.",
      );
      return;
    }
    if (mode === "signup" && !fullName) {
      setError("Enter your full name (2 to 100 characters).");
      return;
    }
    if (mode === "signup" && data.get("confirmPassword") !== data.get("password")) {
      setError("Passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      if (mode === "login") {
        await signIn(email, password);
        navigate(safeReturnTo((location.state as { from?: unknown } | null)?.from), {
          replace: true,
        });
      } else {
        const result = await signUp(fullName!, email, password);
        if (result.needsEmailVerification)
          setNotice("Check your email for a verification link to finish creating your account.");
        else navigate("/", { replace: true });
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "We could not complete that request.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthLayout
      title={mode === "login" ? "Welcome back" : "Create your account"}
      subtitle={
        mode === "login"
          ? "Sign in to continue to your workspace."
          : "Your private workspace will be created when your account is ready."
      }
      signup={mode === "signup"}
    >
      <form className="space-y-4" onSubmit={submit}>
        {mode === "signup" && (
          <Field
            label="Full name"
            name="fullName"
            autoComplete="name"
            placeholder="e.g. Alex Morgan"
          />
        )}
        <Field
          label="Email address"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
        />
        <Field
          label="Password"
          name="password"
          type="password"
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          placeholder={mode === "signup" ? "Create a strong password" : undefined}
          minLength={mode === "signup" ? 8 : undefined}
          showPasswordToggle={mode === "signup"}
          onChange={
            mode === "signup" ? (event) => setPasswordInput(event.currentTarget.value) : undefined
          }
        />
        {mode === "signup" && <PasswordRequirements password={passwordInput} />}
        {mode === "signup" && (
          <Field
            label="Confirm password"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            placeholder="Enter your password again"
            minLength={8}
            showPasswordToggle
          />
        )}
        {error && (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
        {notice && (
          <p className="rounded-md bg-primary-soft p-3 text-sm" role="status">
            {notice}
          </p>
        )}
        <button
          disabled={busy}
          className="h-10 w-full rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-60"
        >
          {busy ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}
        </button>
      </form>
      {mode === "login" ? (
        <p className="mt-5 text-sm text-muted-foreground">
          <Link className="text-primary underline-offset-4 hover:underline" to="/forgot-password">
            Forgot password?
          </Link>
        </p>
      ) : null}
      <p className="mt-6 border-t pt-5 text-sm text-muted-foreground">
        {mode === "login" ? "New here?" : "Already have an account?"}{" "}
        <Link
          className="font-medium text-primary underline-offset-4 hover:underline"
          to={mode === "login" ? "/signup" : "/login"}
        >
          {mode === "login" ? "Create an account" : "Sign in"}
        </Link>
      </p>
    </AuthLayout>
  );
}

function Field({
  label,
  name,
  type = "text",
  autoComplete,
  placeholder,
  minLength,
  showPasswordToggle = false,
  onChange,
}: {
  label: string;
  name: string;
  type?: string;
  autoComplete?: string;
  placeholder?: string | undefined;
  minLength?: number | undefined;
  showPasswordToggle?: boolean;
  onChange?: ((event: ChangeEvent<HTMLInputElement>) => void) | undefined;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <label className="block space-y-1.5 text-sm font-medium">
      <span>{label}</span>
      <span className="relative block">
        <input
          required
          name={name}
          type={showPasswordToggle && visible ? "text" : type}
          autoComplete={autoComplete}
          placeholder={placeholder}
          minLength={minLength}
          maxLength={type === "password" ? 72 : undefined}
          onChange={onChange}
          className={`h-11 w-full rounded-lg border bg-background px-3 text-sm font-normal outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/30 placeholder:text-muted-foreground/70 ${showPasswordToggle ? "pr-10" : ""}`}
        />
        {showPasswordToggle && (
          <button
            type="button"
            aria-label={visible ? "Hide password" : "Show password"}
            onClick={(event) => {
              event.preventDefault();
              setVisible((current) => !current);
            }}
            className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
          >
            {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        )}
      </span>
    </label>
  );
}

function PasswordRequirements({ password }: { password: string }) {
  return (
    <div className="-mt-1 rounded-lg border bg-muted/40 p-3.5">
      <p className="mb-2 text-xs font-medium text-muted-foreground">
        Use 8–72 characters and meet every rule:
      </p>
      <ul className="grid gap-2 text-xs sm:grid-cols-2" aria-live="polite">
        {passwordRules.map((rule) => {
          const met = rule.test(password);
          return (
            <li
              key={rule.id}
              className={
                met
                  ? "flex items-center gap-2 text-primary"
                  : "flex items-center gap-2 text-muted-foreground"
              }
            >
              {met ? (
                <Check className="size-3.5" aria-hidden="true" />
              ) : (
                <Circle className="size-3.5" aria-hidden="true" />
              )}
              {rule.label}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function AuthPage({ mode = "login" }: { mode?: "login" | "signup" }) {
  return <AuthForm mode={mode} />;
}

export function ForgotPasswordPage() {
  const { requestPasswordReset } = useAuth();
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const email = parseEmail(new FormData(event.currentTarget).get("email"));
    if (!email) {
      setError("Enter a valid email address.");
      return;
    }
    setBusy(true);
    try {
      await requestPasswordReset(email);
      setSent(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "We could not complete that request.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <AuthLayout
      title="Reset your password"
      subtitle="We’ll send a reset link if the account is eligible."
    >
      {sent ? (
        <p className="rounded-md bg-primary-soft p-3 text-sm" role="status">
          If an account matches that email, a password reset link is on its way.
        </p>
      ) : (
        <form className="space-y-4" onSubmit={submit}>
          <Field label="Email" name="email" type="email" autoComplete="email" />
          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
          <button
            disabled={busy}
            className="h-10 w-full rounded-md bg-primary text-sm font-medium text-primary-foreground"
          >
            {busy ? "Sending…" : "Send reset link"}
          </button>
        </form>
      )}
      <p className="mt-6 text-sm">
        <Link className="text-primary underline-offset-4 hover:underline" to="/login">
          Back to sign in
        </Link>
      </p>
    </AuthLayout>
  );
}

export function ResetPasswordPage() {
  const { user, loading, updatePassword } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const data = new FormData(event.currentTarget);
    const password = parsePassword(data.get("password"));
    if (!password) {
      setError(
        "Meet each password requirement: 8–72 characters, uppercase, lowercase, number, and symbol.",
      );
      return;
    }
    if (password !== data.get("confirmPassword")) {
      setError("Passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      await updatePassword(password);
      setDone(true);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "This reset link is invalid or expired. Request a new one.",
      );
    } finally {
      setBusy(false);
    }
  }
  if (loading)
    return (
      <AuthLayout title="Reset your password" subtitle="Checking your reset link…">
        <p className="text-sm text-muted-foreground" role="status">
          Checking your session…
        </p>
      </AuthLayout>
    );
  return (
    <AuthLayout
      title="Choose a new password"
      subtitle="Reset links expire. Request a new one if this link no longer works."
    >
      {done ? (
        <>
          <p className="mb-4 rounded-md bg-primary-soft p-3 text-sm" role="status">
            Your password has been updated.
          </p>
          <button
            className="h-10 w-full rounded-md bg-primary text-sm text-primary-foreground"
            onClick={() => navigate("/login", { replace: true })}
          >
            Continue to sign in
          </button>
        </>
      ) : user ? (
        <form className="space-y-4" onSubmit={submit}>
          <Field
            label="New password"
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            onChange={(event) => setPasswordInput(event.currentTarget.value)}
            showPasswordToggle
          />
          <PasswordRequirements password={passwordInput} />
          <Field
            label="Confirm new password"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            showPasswordToggle
          />
          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
          <button
            disabled={busy}
            className="h-10 w-full rounded-md bg-primary text-sm font-medium text-primary-foreground"
          >
            {busy ? "Updating…" : "Update password"}
          </button>
        </form>
      ) : (
        <>
          <p className="mb-4 text-sm text-destructive" role="alert">
            This reset link is invalid or expired. Request a new one.
          </p>
          <Link
            className="text-sm text-primary underline-offset-4 hover:underline"
            to="/forgot-password"
          >
            Request a new link
          </Link>
        </>
      )}
    </AuthLayout>
  );
}
