import { redirect } from "next/navigation";

import { AdministrationDashboard } from "~/app/admin/administration-dashboard";
import { auth } from "~/auth";
import { canManageStudio } from "~/lib/auth/permissions";
import { HydrateClient } from "~/trpc/server";

export default async function AdministrationPage() {
  const session = await auth();
  if (!session?.user.id) redirect("/login");
  const canManageCurrent = session.user.role
    ? canManageStudio(session.user.role)
    : false;
  if (!session.user.isPlatformAdmin && !canManageCurrent) {
    redirect("/mi-cuenta");
  }

  return (
    <HydrateClient>
      <AdministrationDashboard
        isPlatformAdmin={session.user.isPlatformAdmin === true}
        isOwner={session.user.role === "OWNER"}
        canManageCurrent={canManageCurrent}
      />
    </HydrateClient>
  );
}
