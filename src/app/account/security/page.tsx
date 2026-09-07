import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "~/auth";
import { SessionList } from "./session-list";

export default async function SecurityPage() {
  const session = await auth();
  if (!session?.user.id) redirect("/login");

  return (
    <main className="mx-auto min-h-screen max-w-3xl px-4 py-10">
      <Link href="/" className="text-primary text-sm font-bold underline">
        ← Volver al panel
      </Link>
      <h1 className="text-plum mt-5 text-3xl font-black">
        Seguridad de la cuenta
      </h1>
      <p className="text-plum/70 mt-2 mb-8 text-sm">{session.user.email}</p>
      <SessionList
        googleEnabled={Boolean(
          process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET,
        )}
      />
    </main>
  );
}
