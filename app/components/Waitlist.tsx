"use client";

import { useState } from "react";

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
      const res = await fetch("/api/waitlist.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: value }),
      });
      if (!res.ok) throw new Error(String(res.status));
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
