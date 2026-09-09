import { redirect } from "next/navigation";

import { AccountActions } from "~/app/_components/account-actions";
import { StudioSwitcher } from "~/app/_components/studio-switcher";
import { auth } from "~/auth";
import { db } from "~/server/db";

export default async function MyAccountPage() {
  const session = await auth();
  if (!session?.user.id) redirect("/login");

  const [student, activeStudio] = await Promise.all([
    session.user.role === "STUDENT" && session.user.studioId
      ? db.student.findFirst({
          where: {
            userId: session.user.id,
            studioId: session.user.studioId,
          },
          select: {
            name: true,
            telephone: true,
            weekday: true,
            shift: { select: { startTime: true, label: true } },
          },
        })
      : Promise.resolve(null),
    session.user.studioId
      ? db.studio.findUnique({
          where: { id: session.user.studioId },
          select: { name: true },
        })
      : Promise.resolve(null),
  ]);

  return (
    <main className="mx-auto min-h-screen max-w-3xl px-4 py-10">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-primary text-sm font-bold tracking-[0.2em] uppercase">
            {activeStudio?.name ?? "Gestión de talleres"}
          </p>
          <h1 className="text-plum mt-2 text-3xl font-black">Mi cuenta</h1>
          <p className="text-plum/70 mt-2">{session.user.email}</p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-3">
          <StudioSwitcher />
          <AccountActions />
        </div>
      </div>

      <section className="border-plum/15 mt-8 rounded-3xl border bg-white/80 p-6 shadow-sm">
        <h2 className="text-plum text-xl font-black">
          {student?.name ?? session.user.name ?? "Cuenta del taller"}
        </h2>
        {student ? (
          <dl className="text-plum/80 mt-5 grid gap-4 sm:grid-cols-3">
            <div>
              <dt className="text-xs font-bold uppercase">Teléfono</dt>
              <dd className="mt-1">{student.telephone ?? "Sin informar"}</dd>
            </div>
            <div>
              <dt className="text-xs font-bold uppercase">Día</dt>
              <dd className="mt-1">{student.weekday ?? "Sin asignar"}</dd>
            </div>
            <div>
              <dt className="text-xs font-bold uppercase">Horario</dt>
              <dd className="mt-1">
                {student.shift
                  ? `${student.shift.startTime}${student.shift.label ? ` · ${student.shift.label}` : ""}`
                  : "Sin asignar"}
              </dd>
            </div>
          </dl>
        ) : (
          <p className="text-plum/70 mt-3">
            Esta cuenta todavía no está vinculada a una ficha de alumna.
          </p>
        )}
      </section>
    </main>
  );
}
