"use client";

import Link from "next/link";
import { type FormEvent, useState } from "react";

export function EmailRequestForm({ mode }: { mode: "reset" | "verification" }) {
  const [sent, setSent] = useState(false);
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    const data = new FormData(event.currentTarget);
    await fetch(
      mode === "reset"
        ? "/api/account/forgot-password"
        : "/api/account/request-verification",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: data.get("email") }),
      },
    );
    setPending(false);
    setSent(true);
  }

  if (sent) {
    return (
      <div className="space-y-4">
        <p className="rounded-xl bg-green-50 p-4 text-sm text-green-800">
          Si existe una cuenta que admite esta acción, recibirás un correo en
          unos minutos.
        </p>
        <Link
          href="/login"
          className="text-primary text-sm font-bold underline"
        >
          Volver al acceso
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <label className="block text-sm font-semibold">
        Correo
        <input
          required
          type="email"
          name="email"
          autoComplete="email"
          className="border-plum/20 mt-1 w-full rounded-xl border px-4 py-3"
        />
      </label>
      <button
        disabled={pending}
        className="bg-primary w-full rounded-xl px-4 py-3 font-bold text-white disabled:opacity-60"
      >
        {pending ? "Enviando…" : "Enviar enlace"}
      </button>
      <Link
        href="/login"
        className="text-primary block text-center text-sm underline"
      >
        Volver al acceso
      </Link>
    </form>
  );
}
