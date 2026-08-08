"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../lib/supabase/client";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;

    setLoading(true);
    setError("");
    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError("Nieprawidłowy e-mail lub hasło.");
      setLoading(false);
      return;
    }

    router.replace("/");
    router.refresh();
  }

  return <main className="login-shell">
    <div className="brand login-brand"><span className="brand-mark">H</span><span>Hotel Marketing Analyzer</span></div>
    <section className="login-card">
      <span className="eyebrow">BEZPIECZNY DOSTĘP</span>
      <h1>Hotel Marketing Analyzer</h1>
      <p>Zaloguj się, aby przejść do analizy.</p>
      <form onSubmit={handleSubmit}>
        <label><span>E-mail</span><input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
        <label><span>Hasło</span><input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required /></label>
        {error && <p className="login-error" role="alert">{error}</p>}
        <button className="primary" type="submit" disabled={loading}>{loading ? "Logowanie…" : "Zaloguj się"}</button>
      </form>
      <small>Demo wykorzystuje syntetyczne dane analityczne.</small>
    </section>
  </main>;
}
