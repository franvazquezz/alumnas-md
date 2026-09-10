"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { LuArrowLeft, LuLoader2 } from "react-icons/lu";

import { StudentClassesSection } from "~/app/_components/student-detail/student-classes-section";
import { StudentPersonalDetail } from "~/app/_components/studentPersonalDetail";
import { api } from "~/trpc/react";

export function StudentDetail() {
  const { id } = useParams<{ id: string }>();
  const studentId = Number(id);
  const isValidId = Number.isFinite(studentId);
  const { data, isLoading } = api.students.byId.useQuery(
    { id: studentId },
    { enabled: isValidId },
  );

  if (isLoading) {
    return (
      <div className="text-plum mx-auto flex max-w-4xl items-center justify-center py-10">
        <LuLoader2 className="h-5 w-5 animate-spin" />
        <span className="ml-2 text-sm">Cargando alumno...</span>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="border-plum/20 text-plum mx-auto max-w-3xl rounded-2xl border bg-white/80 p-6 text-center">
        <p className="text-lg font-semibold">Alumno no encontrado</p>
        <Link href="/" className="text-primary mt-4 inline-block underline">
          Volver al dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-8">
      <div className="flex items-center justify-between">
        <Link
          href="/"
          className="text-plum hover:text-primary inline-flex items-center gap-2 text-sm font-semibold transition"
        >
          <LuArrowLeft className="h-4 w-4" />
          Volver al dashboard
        </Link>
        <p className="text-plum/70 text-xs tracking-[0.12em] uppercase">
          Alumno
        </p>
      </div>

      <StudentPersonalDetail key={`profile-${data.id}`} data={data} />
      <StudentClassesSection key={`classes-${data.id}`} data={data} />
    </div>
  );
}
