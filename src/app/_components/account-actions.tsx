"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";

export function AccountActions() {
  return (
    <div className="flex gap-2">
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
