import React, { useMemo } from "react";
import { StatCard } from "./statCard";
import { type Student } from "~/types/utils";

export const HeaderSection = ({
  students,
  search,
  setSearch,
}: {
  students?: Student[];
  search: string;
  setSearch: (value: string) => void;
}) => {
  const stats = useMemo(() => {
    const totalStudents = students?.length ?? 0;
    const totalClasses =
      students?.reduce((sum, student) => sum + student.classes.length, 0) ?? 0;
    return {
      totalStudents,
      totalClasses,
    };
  }, [students]);

  return (
    <section className="from-primary via-plum to-secondary overflow-hidden rounded-3xl bg-linear-to-r p-px shadow-xl">
      <div className="bg-sand/95 flex flex-col gap-6 rounded-[28px] px-8 py-10">
        <p className="text-plum/70 text-sm tracking-[0.12em] uppercase">
          MD Cerámica
        </p>
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-plum text-3xl font-black sm:text-4xl">
              Panel de alumnos y clases
            </h1>
            <p className="text-plum/80 mt-2 text-sm">
              Controla alumnos, pagos y cronograma.
            </p>
          </div>
          <div className="flex gap-3">
            <StatCard
              label="Alumnos activos"
              value={stats.totalStudents.toString()}
            />
            <StatCard
              label="Clases cargadas"
              value={stats.totalClasses.toString()}
            />
          </div>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar alumno..."
            className="border-plum/20 text-ink ring-primary/20 w-full rounded-xl border bg-white/80 px-4 py-2 text-sm transition outline-none focus:ring-2"
          />
        </div>
      </div>
    </section>
  );
};
