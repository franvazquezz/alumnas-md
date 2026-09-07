import { StudentDetail } from "~/app/_components/student-detail";
import { auth } from "~/auth";
import { HydrateClient } from "~/trpc/server";
import { redirect } from "next/navigation";

export default async function StudentPage() {
  const session = await auth();
  if (!session?.user.id) redirect("/login");

  return (
    <HydrateClient>
      <StudentDetail />
    </HydrateClient>
  );
}
