import { StudentPortalShell } from "~/app/_components/student-portal-shell";
import { getStudentPortalData } from "~/server/student-portal";
import { getWeekday } from "~/types/utils";

export default async function MyAccountPage() {
  const { session, student, studio } = await getStudentPortalData();

  return (
    <StudentPortalShell
      studioName={studio?.name}
      title="Mi cuenta"
      description={session.user.email ?? "Tu perfil dentro del taller"}
    >
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
              <dd className="mt-1">
                {getWeekday(student.weekday)?.label ?? "Sin asignar"}
              </dd>
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
    </StudentPortalShell>
  );
}
