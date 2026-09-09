"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import { api } from "~/trpc/react";

export function AccountActions() {
  const { data } = api.administration.navigation.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });
  const canOpenAdministration = [
    data?.isPlatformAdmin,
    data?.studios.some((studio) => studio.role === "OWNER"),
  ].some(Boolean);

  return (
    <div className="flex flex-wrap justify-end gap-2">
      {canOpenAdministration ? (
        <Link
          href="/admin"
          className="border-primary/20 text-primary rounded-xl border bg-white/70 px-3 py-2 text-sm font-semibold"
        >
          Administración
        </Link>
      ) : null}
      <Link
        href="/account/security"
        className="border-plum/20 rounded-xl border bg-white/70 px-3 py-2 text-sm font-semibold"
      >
        Seguridad
      </Link>
      <button
        type="button"
        onClick={() => void signOut({ redirectTo: "/login" })}
        className="bg-plum rounded-xl px-3 py-2 text-sm font-semibold text-white"
      >
        Salir
      </button>
    </div>
  );
}
