"use client";

import Link from "next/link";
import { type FormEvent, useState } from "react";

export function RegisterForm({
  token,
  email,
}: {
  token: string;
  email: string;
}) {
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const data = new FormData(event.currentTarget);

    const response = await fetch("/api/account/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token,
        email,
        name: data.get("name"),
        password: data.get("password"),
      }),
    });
    const result = (await response.json()) as {
      error?: string;
      emailSent?: boolean;
    };

    if (!response.ok) {
      setError(result.error ?? "No pudimos crear la cuenta.");
    } else {
      setMessage(
        result.emailSent
          ? "Cuenta creada. Revisa tu correo para verificarla."
          : "Cuenta creada, pero no pudimos enviar el correo. Solicita uno nuevo desde el acceso.",
      );
    }
    setPending(false);
  }

  if (message) {
    return (
      <div className="space-y-4">
        <p className="rounded-xl bg-green-50 p-4 text-sm text-green-800">
          {message}
        </p>
        <Link
          href="/login"
          className="text-primary text-sm font-bold underline"
        >
          Ir al inicio de sesión
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <p className="bg-sand rounded-xl p-3 text-sm">
        Invitación para <strong>{email}</strong>
      </p>
      <label className="block text-sm font-semibold">
        Nombre
        <input
          required
          name="name"
          autoComplete="name"
          minLength={2}
          maxLength={100}
          className="border-plum/20 mt-1 w-full rounded-xl border px-4 py-3"
        />
      </label>
      <label className="block text-sm font-semibold">
        Contraseña
        <input
          required
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={12}
          maxLength={128}
          className="border-plum/20 mt-1 w-full rounded-xl border px-4 py-3"
        />
      </label>
      <p className="text-plum/60 text-xs">Usa al menos 12 caracteres.</p>
      {error && <p className="text-sm text-red-700">{error}</p>}
      <button
        disabled={pending}
        className="bg-primary w-full rounded-xl px-4 py-3 font-bold text-white disabled:opacity-60"
      >
        {pending ? "Creando…" : "Crear cuenta"}
      </button>
    </form>
  );
}
