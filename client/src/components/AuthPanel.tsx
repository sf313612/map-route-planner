import { useState } from "react";
import type { SyntheticEvent } from "react";

type AuthPanelProps = {
  canLogout: boolean;
  error: string | null;
  onLogin: (input: { email: string; password: string }) => Promise<void>;
  onLogout: () => void;
  onRegister: (input: {
    username: string;
    email: string;
    password: string;
  }) => Promise<void>;
};

export function AuthPanel({
  canLogout,
  error,
  onLogin,
  onLogout,
  onRegister,
}: AuthPanelProps) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      if (mode === "login") {
        await onLogin({ email, password });
      } else {
        await onRegister({ username, email, password });
      }
      setEmail("");
      setPassword("");
      setUsername("");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (canLogout) {
    return (
      <section className="auth-panel auth-panel--logged-in">
        <button className="auth-panel__secondary" type="button" onClick={onLogout}>
          Logout
        </button>
      </section>
    );
  }

  return (
    <section className="auth-panel">
      <form className="auth-panel__form" onSubmit={handleSubmit}>
        <div className="auth-panel__tabs" role="tablist" aria-label="Auth mode">
          <button
            className={mode === "login" ? "auth-panel__tab auth-panel__tab--active" : "auth-panel__tab"}
            type="button"
            onClick={() => setMode("login")}
          >
            Login
          </button>
          <button
            className={mode === "register" ? "auth-panel__tab auth-panel__tab--active" : "auth-panel__tab"}
            type="button"
            onClick={() => setMode("register")}
          >
            Register
          </button>
        </div>

        {mode === "register" ? (
          <label className="auth-panel__field">
            <span>Name</span>
            <input
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="Daria"
            />
          </label>
        ) : null}

        <label className="auth-panel__field">
          <span>Email</span>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
          />
        </label>

        <label className="auth-panel__field">
          <span>Password</span>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="At least 6 characters"
          />
        </label>

        {error ? <p className="auth-panel__error">{error}</p> : null}

        <div className="auth-panel__actions">
          <button className="auth-panel__primary" disabled={isSubmitting} type="submit">
            {isSubmitting ? "Please wait..." : mode === "login" ? "Login" : "Create account"}
          </button>
        </div>
      </form>
    </section>
  );
}
