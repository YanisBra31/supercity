"use client";

import Link from "next/link";
import { useState } from "react";

type State = "idle" | "sending" | "done" | "error";

export default function Waitlist({ dark = false }: { dark?: boolean }) {
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
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
    if (!consent) {
      setState("error");
      setMsg("Coche la case pour qu'on puisse te prévenir par e-mail.");
      return;
    }
    setState("sending");
    try {
      const res = await fetch("/api/waitlist.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: value, consent: true }),
      });
      if (!res.ok) throw new Error(String(res.status));
      setState("done");
      setMsg("C'est noté, on te prévient dès le coup d'envoi.");
      setEmail("");
      setConsent(false);
    } catch {
      setState("error");
      setMsg("Oups, ça n'est pas passé. Réessaie dans un instant.");
    }
  }

  const id = dark ? "bottom" : "top";

  return (
    <form className={`waitlist${dark ? " waitlist--dark" : ""}`} onSubmit={onSubmit} noValidate>
      <label className="sr" htmlFor={`email-${id}`}>
        Ton adresse e-mail
      </label>
      <input
        id={`email-${id}`}
        type="email"
        placeholder="Ton e-mail pour le coup d'envoi"
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <button type="submit" disabled={state === "sending"}>
        {state === "sending" ? "Envoi…" : "Préviens-moi"}
      </button>
      <label className="waitlist__consent" htmlFor={`consent-${id}`}>
        <input
          id={`consent-${id}`}
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
        />
        <span>
          J&apos;accepte que Supercity utilise mon e-mail pour me prévenir du lancement de l&apos;appli. Désinscription
          possible à tout moment. <Link href="/confidentialite/">En savoir plus</Link>
        </span>
      </label>
      <p className={`waitlist__msg${state === "error" ? " is-error" : ""}`} role="status" aria-live="polite">
        {msg}
      </p>
    </form>
  );
}
