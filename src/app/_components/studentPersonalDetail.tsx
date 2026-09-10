import { useState } from "react";
import type { FormEvent } from "react";
import { LuSave } from "react-icons/lu";
import { ButtonM } from "./button";
import { api } from "~/trpc/react";
import { type Student } from "~/types/utils";
import { showNotification } from "@mantine/notifications";
import { formatCalendarDate } from "~/lib/domain/calendar-date";
import { formatMoney } from "~/lib/domain/money";
import type { StudentFormState, WeekdayOption } from "~/types/students";
import { getWeekday, WEEK_DAYS } from "~/types/utils";

export const StudentPersonalDetail = ({ data }: { data: Student }) => {
  const studentId = data.id;
  const [form, setForm] = useState<StudentFormState>(() => ({
    name: data.name ?? "",
    birthday: data.birthday ?? "",
    telephone: data.telephone ?? "",
    weekday: data.weekday,
    shiftId: data.shiftId,
    isActive: data.isActive,
  }));
  const [showEditDetails, setShowEditDetails] = useState(false);

  const utils = api.useUtils();
  const { data: shifts } = api.students.formOptions.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });
  const updateStudent = api.students.update.useMutation({
    onSuccess: async () => {
      await utils.students.byId.invalidate({ id: studentId });
      await utils.students.list.invalidate();
      showNotification({ color: "green", message: "Alumno actualizado" });
    },
    onError: () =>
      showNotification({
        color: "red",
        message: "No se pudo actualizar el alumno",
      }),
  });

  const studentStats = {
    classes: data.classes.length,
    paidClasses: data.classes.filter((cls) => cls.classPaymentStatus === "PAID")
      .length,
    pendingClasses: data.classes.filter(
      (cls) => cls.classPaymentStatus === "PENDING",
    ).length,
    ...data.financialSummary,
  };

  const handleSaveStudent = (e: FormEvent) => {
    e.preventDefault();
    updateStudent.mutate({
      id: studentId,
      name: form.name ?? undefined,
      birthday: form.birthday || null,
      telephone: form.telephone ?? undefined,
      weekday: form.weekday,
      shiftId: form.shiftId,
      isActive: form.isActive,
    });
  };
  return (
    <div className="ring-plum/10 rounded-3xl bg-white/85 p-6 shadow-lg ring-1">
      <div className="border-plum/10 flex flex-col gap-2 border-b pb-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-plum/70 text-xs tracking-widest uppercase">
            Detalles
          </p>
          <h1 className="text-plum text-3xl font-black">{data.name}</h1>
        </div>
        <ButtonM
          type="button"
          variant="ghost"
          onClick={() => setShowEditDetails((prev) => !prev)}
        >
          {showEditDetails ? "Ocultar edición" : "Editar alumno"}
        </ButtonM>
        <div className="grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
          <span className="bg-primary/10 text-primary rounded-xl px-3 py-2 font-semibold">
            Clases: {studentStats.classes}
          </span>
          <span className="bg-secondary/20 text-plum rounded-xl px-3 py-2 font-semibold">
            Pagadas: {studentStats.paidClasses}
          </span>
          <span className="text-plum/70 ring-plum/15 rounded-xl bg-white px-3 py-2 font-semibold ring-1">
            Pendientes: {studentStats.pendingClasses}
          </span>
          <span className="text-plum/80 ring-plum/10 rounded-xl bg-white px-3 py-2 font-semibold ring-1">
            Total: {formatMoney(studentStats.total)}
          </span>
          <span className="text-primary/80 ring-primary/20 rounded-xl bg-white px-3 py-2 font-semibold ring-1">
            Pagado: {formatMoney(studentStats.paid)}
          </span>
          <span className="text-plum/70 ring-plum/15 rounded-xl bg-white px-3 py-2 font-semibold ring-1">
            Deuda: {formatMoney(studentStats.debt)}
          </span>
        </div>
      </div>

      {showEditDetails ? (
        <form
          className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2"
          onSubmit={handleSaveStudent}
        >
          <input
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Nombre completo"
            className="border-plum/20 text-ink ring-primary/20 rounded-xl border bg-white px-4 py-2 text-sm transition outline-none focus:ring-2"
          />
          <input
            type="date"
            value={form.birthday}
            onChange={(e) => setForm({ ...form, birthday: e.target.value })}
            className="border-plum/20 text-ink ring-primary/20 rounded-xl border bg-white px-4 py-2 text-sm transition outline-none focus:ring-2"
          />
          <input
            value={form.telephone}
            onChange={(e) => setForm({ ...form, telephone: e.target.value })}
            placeholder="Teléfono"
            className="border-plum/20 text-ink ring-primary/20 rounded-xl border bg-white px-4 py-2 text-sm transition outline-none focus:ring-2"
          />
          <select
            value={form.weekday ?? ""}
            onChange={(e) =>
              setForm({
                ...form,
                weekday: (e.target.value || null) as WeekdayOption | null,
              })
            }
            className="border-plum/20 text-ink ring-primary/20 rounded-xl border bg-white px-4 py-2 text-sm transition outline-none focus:ring-2"
          >
            <option value="">Sin día asignado</option>
            {WEEK_DAYS.map((day) => (
              <option key={day.value} value={day.value}>
                {day.label}
              </option>
            ))}
          </select>
          <select
            value={form.shiftId ?? ""}
            onChange={(e) =>
              setForm({
                ...form,
                shiftId: e.target.value ? Number(e.target.value) : null,
              })
            }
            className="border-plum/20 text-ink ring-primary/20 rounded-xl border bg-white px-4 py-2 text-sm transition outline-none focus:ring-2"
          >
            <option value="">Seleccionar horario</option>
            {shifts?.map((shift) => (
              <option
                key={shift.id}
                value={shift.id}
                disabled={!shift.isActive && shift.id !== form.shiftId}
              >
                {shift.startTime}
                {shift.label ? ` · ${shift.label}` : ""}
                {!shift.isActive ? " · inactivo" : ""}
              </option>
            ))}
          </select>
          <label className="text-plum flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
              className="border-plum/30 text-primary focus:ring-primary h-4 w-4 rounded"
            />
            Alumno activo
          </label>
          <div className="flex justify-end md:col-span-2">
            <ButtonM type="submit" loading={updateStudent.isPending}>
              <LuSave className="h-4 w-4" />
              Guardar alumno
            </ButtonM>
          </div>
        </form>
      ) : (
        <div className="mt-4 grid grid-cols-1 gap-2 text-sm md:grid-cols-2">
          <p className="text-plum/80">
            <span className="text-plum font-semibold">Nombre:</span> {data.name}
          </p>
          <p className="text-plum/80">
            <span className="text-plum font-semibold">Cumpleaños:</span>{" "}
            {data.birthday ? formatCalendarDate(data.birthday) : "—"}
          </p>
          <p className="text-plum/80">
            <span className="text-plum font-semibold">Teléfono:</span>{" "}
            {data.telephone ?? "—"}
          </p>
          <p className="text-plum/80">
            <span className="text-plum font-semibold">Día preferido:</span>{" "}
            {getWeekday(data.weekday)?.label ?? "—"}
          </p>
          <p className="text-plum/80">
            <span className="text-plum font-semibold">Estado:</span>{" "}
            {data.isActive ? "Activo" : "Inactivo"}
          </p>
          <p className="text-plum/80">
            <span className="text-plum font-semibold">Horario:</span>{" "}
            {data.timetable ?? "—"}
          </p>
        </div>
      )}
    </div>
  );
};
