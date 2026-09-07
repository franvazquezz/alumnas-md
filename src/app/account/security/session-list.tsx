"use client";

import { signIn, signOut } from "next-auth/react";
import { useEffect, useState } from "react";

type SessionItem = {
  id: string;
  createdAt: string;
  expires: string;
  current: boolean;
};

export function SessionList({ googleEnabled }: { googleEnabled: boolean }) {
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetch("/api/account/sessions")
      .then(async (response) => {
        if (!response.ok) throw new Error();
        return (await response.json()) as { sessions: SessionItem[] };
      })
      .then((result) => setSessions(result.sessions))
      .catch(() => setError("No pudimos cargar las sesiones."))
      .finally(() => setLoading(false));
  }, []);

  async function revoke(item: SessionItem) {
    const response = await fetch("/api/account/sessions", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: item.id }),
    });
    if (!response.ok) {
      setError("No pudimos cerrar esa sesión.");
      return;
    }
    if (item.current) {
      await signOut({ redirectTo: "/login" });
      return;
    }
    setSessions((current) =>
      current.filter((session) => session.id !== item.id),
    );
  }

  return (
    <div className="space-y-7">
      <section className="border-plum/15 rounded-2xl border bg-white/80 p-6">
        <h2 className="text-plum text-xl font-black">Sesiones abiertas</h2>
        {loading && <p className="mt-4 text-sm">Cargando…</p>}
        {error && <p className="mt-4 text-sm text-red-700">{error}</p>}
        <div className="mt-4 space-y-3">
          {sessions.map((item) => (
            <div
              key={item.id}
              className="border-plum/10 flex items-center justify-between gap-4 rounded-xl border p-4"
            >
              <div>
                <p className="font-semibold">
                  {item.current ? "Esta sesión" : "Otra sesión"}
                </p>
                <p className="text-plum/60 text-xs">
                  Iniciada: {new Date(item.createdAt).toLocaleString("es-AR")}
                </p>
                <p className="text-plum/60 text-xs">
                  Vence: {new Date(item.expires).toLocaleString("es-AR")}
                </p>
              </div>
              <button
                type="button"
                onClick={() => void revoke(item)}
                className="text-primary text-sm font-bold underline"
              >
                Cerrar
              </button>
            </div>
          ))}
        </div>
      </section>
      {googleEnabled && (
        <section className="border-plum/15 rounded-2xl border bg-white/80 p-6">
          <h2 className="text-plum text-xl font-black">Cuenta de Google</h2>
          <p className="text-plum/70 mt-2 text-sm">
            Conecta Google desde una sesión ya iniciada para evitar asociaciones
            por correo no confirmadas.
          </p>
          <button
            type="button"
            onClick={() =>
              void signIn("google", { redirectTo: "/account/security" })
            }
            className="border-plum/20 mt-4 rounded-xl border bg-white px-4 py-2 text-sm font-bold"
          >
            Conectar Google
          </button>
        </section>
      )}
    </div>
  );
}
