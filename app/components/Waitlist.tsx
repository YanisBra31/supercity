"use client";

import { useState } from "react";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

type State = "idle" | "sending" | "done" | "error";

export default function Waitlist({ dark = false }: { dark?: boolean }) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<State>("idle");
  const [msg, setMsg] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const value = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      setState("error");
      setMsg("Adresse invalide : vérifie le format, par exemple nom@exemple.fr.");
      return;
    }
    setState("sending");
    try {
      // Tant que Supabase n'est pas branché, on confirme sans enregistrer.
      if (SUPABASE_URL && SUPABASE_ANON_KEY) {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/waitlist`, {
          method: "POST",
          headers: {
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
            "Content-Type": "application/json",
            Prefer: "return=minimal",
          },
          body: JSON.stringify({ email: value.toLowerCase() }),
        });
        // 409 : déjà inscrit, on le traite comme un succès.
        if (!res.ok && res.status !== 409) throw new Error(String(res.status));
      }
      setState("done");
      setMsg("C'est noté, on te prévient dès le coup d'envoi.");
      setEmail("");
    } catch {
      setState("error");
      setMsg("Oups, ça n'est pas passé. Réessaie dans un instant.");
    }
  }

  return (
    <form className={`waitlist${dark ? " waitlist--dark" : ""}`} onSubmit={onSubmit} noValidate>
      <label className="sr" htmlFor={dark ? "email-bottom" : "email-top"}>
        Ton adresse e-mail
      </label>
      <input
        id={dark ? "email-bottom" : "email-top"}
        type="email"
        placeholder="Ton e-mail pour le coup d'envoi"
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <button type="submit" disabled={state === "sending"}>
        {state === "sending" ? "Envoi…" : "Préviens-moi"}
      </button>
      <p className={`waitlist__msg${state === "error" ? " is-error" : ""}`} role="status" aria-live="polite">
        {msg}
      </p>
    </form>
  );
}
