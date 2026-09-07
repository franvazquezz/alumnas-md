import { Dashboard } from "~/app/_components/dashboard";
import { auth } from "~/auth";
import { HydrateClient } from "~/trpc/server";
import { redirect } from "next/navigation";

export default async function Home() {
  const session = await auth();
  if (!session?.user.id) redirect("/login");

  return (
    <HydrateClient>
      <main className="min-h-screen">
        <Dashboard />
      </main>
    </HydrateClient>
  );
}
