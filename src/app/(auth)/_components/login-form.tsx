"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { type FormEvent, useState } from "react";

export function LoginForm({
  verification,
  reset,
  authError,
  googleEnabled,
}: {
  verification?: string;
  reset?: string;
  authError?: string;
  googleEnabled: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const data = new FormData(event.currentTarget);

    try {
      const result = await signIn("credentials", {
        email: data.get("email"),
        password: data.get("password"),
        redirect: false,
        redirectTo: "/",
      });
      if (!result.ok) {
        setError(
          "No pudimos iniciar sesión. Revisa los datos y confirma tu correo.",
        );
        return;
      }
      window.location.assign(result.url ?? "/");
    } catch {
      setError("No pudimos iniciar sesión. Inténtalo nuevamente.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-5">
      {verification === "success" && (
        <p className="rounded-xl bg-green-50 p-3 text-sm text-green-800">
          Correo verificado. Ya puedes iniciar sesión.
        </p>
      )}
      {verification === "invalid" && (
        <p className="rounded-xl bg-red-50 p-3 text-sm text-red-800">
          El enlace de verificación no es válido o ya venció.
        </p>
      )}
      {reset === "success" && (
        <p className="rounded-xl bg-green-50 p-3 text-sm text-green-800">
          Contraseña actualizada. Inicia sesión nuevamente.
        </p>
      )}
      {authError && (
        <p className="rounded-xl bg-red-50 p-3 text-sm text-red-800">
          No pudimos completar el acceso externo. Si ya usas contraseña, inicia
          sesión y conecta Google desde Seguridad.
        </p>
      )}
      <form onSubmit={submit} className="space-y-4">
        <label className="block text-sm font-semibold">
          Correo
          <input
            required
            type="email"
            name="email"
            autoComplete="email"
            className="border-plum/20 focus:ring-primary/20 mt-1 w-full rounded-xl border bg-white px-4 py-3 outline-none focus:ring-2"
          />
        </label>
        <label className="block text-sm font-semibold">
          Contraseña
          <input
            required
            type="password"
            name="password"
            autoComplete="current-password"
            className="border-plum/20 focus:ring-primary/20 mt-1 w-full rounded-xl border bg-white px-4 py-3 outline-none focus:ring-2"
          />
        </label>
        {error && <p className="text-sm text-red-700">{error}</p>}
        <button
          type="submit"
          disabled={pending}
          className="bg-primary w-full rounded-xl px-4 py-3 font-bold text-white disabled:opacity-60"
        >
          {pending ? "Ingresando…" : "Ingresar"}
        </button>
      </form>
      {googleEnabled && (
        <>
          <div className="flex items-center gap-3 text-xs text-gray-500">
            <span className="h-px flex-1 bg-gray-200" />o
            <span className="h-px flex-1 bg-gray-200" />
          </div>
          <button
            type="button"
            onClick={() => void signIn("google", { redirectTo: "/" })}
            className="border-plum/20 text-plum w-full rounded-xl border bg-white px-4 py-3 font-bold"
          >
            Continuar con Google
          </button>
        </>
      )}
      <div className="flex justify-between text-sm">
        <Link href="/forgot-password" className="text-primary underline">
          Olvidé mi contraseña
        </Link>
        <Link href="/verify-email" className="text-primary underline">
          Reenviar verificación
        </Link>
      </div>
      <p className="text-plum/60 text-xs">
        Las cuentas nuevas se habilitan únicamente mediante una invitación del
        taller.
      </p>
    </div>
  );
}
