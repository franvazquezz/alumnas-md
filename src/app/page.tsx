import { Dashboard } from "~/app/_components/dashboard";
import { auth } from "~/auth";
import { canManageStudio } from "~/lib/auth/permissions";
import { HydrateClient } from "~/trpc/server";
import { redirect } from "next/navigation";

export default async function Home() {
  const session = await auth();
  if (!session?.user.id) redirect("/login");
  if (!session.user.role || !canManageStudio(session.user.role)) {
    if (session.user.isPlatformAdmin) redirect("/admin");
    redirect("/mi-cuenta");
  }

  return (
    <HydrateClient>
      <main className="min-h-screen">
        <Dashboard />
      </main>
    </HydrateClient>
  );
}
