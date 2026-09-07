"use client";

import { type FormEvent, useState } from "react";

export function ResetPasswordForm({ token }: { token: string }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const data = new FormData(event.currentTarget);
    const passwordEntry = data.get("password");
    const confirmationEntry = data.get("confirmation");
    const password = typeof passwordEntry === "string" ? passwordEntry : "";
    const confirmation =
      typeof confirmationEntry === "string" ? confirmationEntry : "";

    if (password !== confirmation) {
      setError("Las contraseñas no coinciden.");
      setPending(false);
      return;
    }

    const response = await fetch("/api/account/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    });
    const result = (await response.json()) as { error?: string };
    if (!response.ok) {
      setError(result.error ?? "No pudimos actualizar la contraseña.");
      setPending(false);
      return;
    }

    window.location.assign("/login?reset=success");
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <label className="block text-sm font-semibold">
        Nueva contraseña
        <input
          required
          type="password"
          name="password"
          autoComplete="new-password"
          minLength={12}
          maxLength={128}
          className="border-plum/20 mt-1 w-full rounded-xl border px-4 py-3"
        />
      </label>
      <label className="block text-sm font-semibold">
        Repetir contraseña
        <input
          required
          type="password"
          name="confirmation"
          autoComplete="new-password"
          minLength={12}
          maxLength={128}
          className="border-plum/20 mt-1 w-full rounded-xl border px-4 py-3"
        />
      </label>
      <p className="text-plum/60 text-xs">
        Usa al menos 12 caracteres. Al cambiarla se cerrarán todas las sesiones
        abiertas.
      </p>
      {error && <p className="text-sm text-red-700">{error}</p>}
      <button
        disabled={pending}
        className="bg-primary w-full rounded-xl px-4 py-3 font-bold text-white disabled:opacity-60"
      >
        {pending ? "Actualizando…" : "Guardar contraseña"}
      </button>
    </form>
  );
}
