import { StudentDetail } from "~/app/_components/student-detail";
import { auth } from "~/auth";
import { canManageStudio } from "~/lib/auth/permissions";
import { HydrateClient } from "~/trpc/server";
import { redirect } from "next/navigation";

export default async function StudentPage() {
  const session = await auth();
  if (!session?.user.id) redirect("/login");
  if (!session.user.role || !canManageStudio(session.user.role)) {
    redirect("/mi-cuenta");
  }

  return (
    <HydrateClient>
      <StudentDetail />
    </HydrateClient>
  );
}
