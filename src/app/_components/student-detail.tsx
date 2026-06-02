"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { notifications } from "@mantine/notifications";
import { useEffect, useState } from "react";
import { LuArrowLeft, LuLoader2, LuPlus, LuSave } from "react-icons/lu";

import { api } from "~/trpc/react";
import { type ClassFormState, type StudentFormState } from "~/types/students";
import { StudentPersonalDetail } from "./studentPersonalDetail";

export const Button = ({
  children,
  variant = "primary",
  loading = false,
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost";
  loading?: boolean;
}) => {
  const base =
    "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-all disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed";
  const variants: Record<"primary" | "ghost", string> = {
    primary:
      "bg-primary text-sand shadow-[0_10px_30px_rgba(163,13,13,0.3)] hover:-translate-y-0.5 hover:shadow-[0_12px_34px_rgba(163,13,13,0.35)]",
    ghost: "border border-plum/20 text-plum hover:bg-plum/5",
  };
  return (
    <button
      className={`${base} ${variants[variant]} ${className}`}
      disabled={loading}
      {...props}
    >
      {loading ? <LuLoader2 className="h-4 w-4 animate-spin" /> : null}
      {children}
    </button>
  );
};

export function StudentDetail() {
  const { id } = useParams();
  const studentId = typeof id === "string" ? id : "";
  const isValidId = studentId.length > 0;
  const utils = api.useUtils();
  const { data, isLoading } = api.students.byId.useQuery(
    { id: studentId },
    { enabled: isValidId },
  );

  const [form, setForm] = useState<StudentFormState>({
    name: "",
    birthday: "",
    telephone: "",
    day: "",
    timetable: undefined,
  });

  const [classDrafts, setClassDrafts] = useState<
    Record<string, ClassFormState>
  >({});
  const [newClass, setNewClass] = useState<ClassFormState>({
    className: "",
    classPrice: "",
    classDay: "",
    classPaid: false,
    monthId: null,
    assistance: false,
    ovenName: "",
    ovenPrice: "",
    ovenPaid: false,
    materialName: "",
    materialPrice: "",
    materialPaid: false,
  });
  const [newMonth, setNewMonth] = useState("");
  const [showAddMonth, setShowAddMonth] = useState(false);
  const [showAddClass, setShowAddClass] = useState(false);
  const [showEditClasses, setShowEditClasses] = useState(false);

  const notify = (type: "success" | "error", message: string) =>
    notifications.show({
      message,
      color: type === "success" ? "green" : "red",
    });

  useEffect(() => {
    if (!data) return;
    setForm({
      name: data.name ?? "",
      birthday: data.birthday
        ? new Date(data.birthday).toISOString().slice(0, 10)
        : "",
      telephone: data.telephone ?? "",
      day: data.day ?? "",
      timetable:
        data.timetable === "10:00"
          ? "10:00"
          : data.timetable === "16:00"
            ? "16:00"
            : data.timetable === "18:30"
              ? "18:30"
              : undefined,
    });
    const drafts: Record<string, ClassFormState> = {};
    data.classes.forEach((cls) => {
      drafts[cls.id] = {
        className: cls.className ?? "",
        classPrice: cls.classPrice ? String(cls.classPrice) : "",
        classDay: cls.classDay
          ? new Date(cls.classDay).toISOString().slice(0, 10)
          : "",
        classPaid: Boolean(cls.classPaid),
        monthId: cls.monthId ?? null,
        assistance: Boolean(cls.assistance),
        ovenName: cls.ovenName ?? "",
        ovenPrice: cls.ovenPrice ?? "",
        ovenPaid: Boolean(cls.ovenPaid),
        materialName: cls.materialName ?? "",
        materialPrice: cls.materialPrice ?? "",
        materialPaid: Boolean(cls.materialPaid),
      };
    });
    setClassDrafts(drafts);
    const defaultMonthId = data.months[0]?.id ?? null;
    setNewClass((prev) => ({
      ...prev,
      monthId: prev.monthId ?? defaultMonthId,
    }));
    setShowAddMonth(data.months.length === 0);
    setShowAddClass(data.classes.length === 0);
  }, [data?.id, data]);

  const updateClass = api.students.updateClass.useMutation({
    onSuccess: async () => {
      await utils.students.byId.invalidate({ id: studentId });
      await utils.students.list.invalidate();
      notify("success", "Clase actualizada");
    },
    onError: () => notify("error", "No se pudo actualizar la clase"),
  });

  const addMonth = api.students.addMonth.useMutation({
    onSuccess: async () => {
      await utils.students.byId.invalidate({ id: studentId });
      await utils.students.list.invalidate();
      setNewMonth("");
      notify("success", "Mes creado");
    },
    onError: () => notify("error", "No se pudo crear el mes"),
  });

  const addClass = api.students.addClass.useMutation({
    onSuccess: async (_data, variables) => {
      await utils.students.byId.invalidate({ id: studentId });
      await utils.students.list.invalidate();
      setNewClass({
        className: "",
        classPrice: "",
        classDay: "",
        classPaid: false,
        monthId: variables.monthId,
        assistance: false,
        ovenName: "",
        ovenPrice: "",
        ovenPaid: false,
        materialName: "",
        materialPrice: "",
        materialPaid: false,
      });
      // reset any draft created for new class id
      setClassDrafts((prev) => ({
        ...prev,
        [variables.studentId]: {
          className: "",
          classPrice: "",
          classDay: "",
          classPaid: false,
          monthId: variables.monthId,
          assistance: false,
          ovenName: "",
          ovenPrice: "",
          ovenPaid: false,
          materialName: "",
          materialPrice: "",
          materialPaid: false,
        },
      }));
      notify("success", "Clase creada");
    },
    onError: () => notify("error", "No se pudo crear la clase"),
  });

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

  const handleSaveClass = (classId: string) => {
    const draft = classDrafts[classId];
    if (!draft) return;
    updateClass.mutate({
      classId,
      className: draft.className,
      classPrice: Number(draft.classPrice ?? 0),
      classDay: draft.classDay
        ? new Date(draft.classDay).toISOString()
        : undefined,
      classPaid: draft.classPaid,
      assistance: draft.assistance,
      ovenName: draft.ovenName ?? undefined,
      ovenPrice: draft.ovenPrice ?? undefined,
      ovenPaid: draft.ovenPaid,
      materialName: draft.materialName ?? undefined,
      materialPrice: draft.materialPrice ?? undefined,
      materialPaid: draft.materialPaid,
    });
  };

  const handleAddClass = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidId) return;
    if (!newClass.className || !newClass.classPrice || !newClass.monthId)
      return;
    addClass.mutate({
      studentId: studentId,
      className: newClass.className,
      classPrice: Number(newClass.classPrice),
      classDay: newClass.classDay
        ? new Date(newClass.classDay).toISOString()
        : undefined,
      classPaid: newClass.classPaid,
      monthId: newClass.monthId,
      assistance: newClass.assistance,
      ovenName: newClass.ovenName ?? undefined,
      ovenPrice: newClass.ovenPrice ?? undefined,
      ovenPaid: newClass.ovenPaid,
      materialName: newClass.materialName ?? undefined,
      materialPrice: newClass.materialPrice ?? undefined,
      materialPaid: newClass.materialPaid,
    });
  };

  const handleAddMonth = (e: React.FormEvent) => {
    e.preventDefault();
    const label = newMonth.trim();
    if (!label || !isValidId) return;
    addMonth.mutate({ studentId, label });
  };

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
      <StudentPersonalDetail data={data} form={form} setForm={setForm} />
      <section className="ring-plum/10 space-y-6 rounded-3xl bg-white/85 p-6 shadow-lg ring-1">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-plum/70 text-xs tracking-widest uppercase">
              Clases
            </p>
            <h2 className="text-plum text-2xl font-semibold">
              Clases del alumno
            </h2>
          </div>
          {updateClass.isPending ? (
            <span className="text-plum/70 text-xs">Guardando cambios...</span>
          ) : null}
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          <div className="flex flex-col gap-6">
            <div className="border-plum/15 flex flex-col gap-4 rounded-3xl border bg-white/80 p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-plum/70 text-xs tracking-widest uppercase">
                    Formularios
                  </p>
                  <p className="text-plum text-sm font-semibold">
                    Crea un mes para agrupar las clases
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setShowAddMonth((prev) => !prev)}
                >
                  {showAddMonth ? "Ocultar formulario" : "Agregar mes"}
                </Button>
              </div>
              {showAddMonth ? (
                <form
                  className="flex flex-col gap-3 md:flex-row md:items-center"
                  onSubmit={handleAddMonth}
                >
                  <input
                    value={newMonth}
                    onChange={(e) => setNewMonth(e.target.value)}
                    placeholder="Ej: Mayo 2024"
                    className="border-plum/20 text-ink ring-primary/20 rounded-lg border bg-white px-3 py-2 text-sm transition outline-none focus:ring-2"
                  />
                  <Button
                    type="submit"
                    variant="ghost"
                    loading={addMonth.isPending}
                    className="md:w-auto"
                  >
                    <LuPlus className="h-4 w-4" />
                    Crear mes
                  </Button>
                </form>
              ) : null}
              {data.months.length === 0 ? (
                <p className="text-plum/60 text-sm">
                  Aún no hay meses creados para este alumno.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {data.months.map((month) => (
                    <span
                      key={month.id}
                      className="border-plum/20 text-plum rounded-full border bg-white/80 px-3 py-1 text-xs font-semibold"
                    >
                      {month.label}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="border-secondary/30 bg-secondary/10 rounded-3xl border p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-plum text-sm font-semibold">
                  Agregar nueva clase
                </p>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setShowAddClass((prev) => !prev)}
                >
                  {showAddClass ? "Ocultar formulario" : "Agregar clase"}
                </Button>
              </div>
              {showAddClass ? (
                <form
                  className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-5"
                  onSubmit={handleAddClass}
                >
                  <select
                    value={newClass.monthId ?? ""}
                    onChange={(e) => {
                      const value = e.target.value === "" ? null : e.target.value;
                      setNewClass((prev) => ({
                        ...prev,
                        monthId: value,
                      }));
                    }}
                    className="border-plum/20 text-ink ring-primary/20 rounded-lg border bg-white px-3 py-2 text-sm transition outline-none focus:ring-2"
                    disabled={data.months.length === 0}
                  >
                    <option value="">
                      {data.months.length === 0
                        ? "Crea un mes para asignar"
                        : "Selecciona un mes"}
                    </option>
                    {data.months.map((month) => (
                      <option key={month.id} value={month.id}>
                        {month.label}
                      </option>
                    ))}
                  </select>
                  <input
                    value={newClass.className}
                    onChange={(e) =>
                      setNewClass({ ...newClass, className: e.target.value })
                    }
                    placeholder="Nombre"
                    className="border-plum/20 text-ink ring-primary/20 rounded-lg border bg-white px-3 py-2 text-sm transition outline-none focus:ring-2"
                  />
                  <input
                    type="number"
                    value={newClass.classPrice}
                    onChange={(e) =>
                      setNewClass({ ...newClass, classPrice: e.target.value })
                    }
                    placeholder="Precio"
                    className="border-plum/20 text-ink ring-primary/20 rounded-lg border bg-white px-3 py-2 text-sm transition outline-none focus:ring-2"
                  />
                  <input
                    type="date"
                    value={newClass.classDay}
                    onChange={(e) =>
                      setNewClass({ ...newClass, classDay: e.target.value })
                    }
                    className="border-plum/20 text-ink ring-primary/20 rounded-lg border bg-white px-3 py-2 text-sm transition outline-none focus:ring-2"
                  />
                  <label className="text-plum flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={newClass.classPaid}
                      onChange={(e) =>
                        setNewClass({
                          ...newClass,
                          classPaid: e.target.checked,
                        })
                      }
                      className="border-plum/30 text-primary focus:ring-primary h-4 w-4 rounded"
                    />
                    Pagado
                  </label>
                  <label className="text-plum flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={newClass.assistance}
                      onChange={(e) =>
                        setNewClass({
                          ...newClass,
                          assistance: e.target.checked,
                        })
                      }
                      className="border-plum/30 text-primary focus:ring-primary h-4 w-4 rounded"
                    />
                    Asistió
                  </label>
                  <input
                    value={newClass.ovenName}
                    onChange={(e) =>
                      setNewClass({ ...newClass, ovenName: e.target.value })
                    }
                    placeholder="Horno (nombre)"
                    className="border-plum/20 text-ink ring-primary/20 rounded-lg border bg-white px-3 py-2 text-sm transition outline-none focus:ring-2"
                  />
                  <input
                    value={newClass.ovenPrice}
                    onChange={(e) =>
                      setNewClass({ ...newClass, ovenPrice: e.target.value })
                    }
                    placeholder="Horno (precio)"
                    className="border-plum/20 text-ink ring-primary/20 rounded-lg border bg-white px-3 py-2 text-sm transition outline-none focus:ring-2"
                  />
                  <label className="text-plum flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={newClass.ovenPaid}
                      onChange={(e) =>
                        setNewClass({ ...newClass, ovenPaid: e.target.checked })
                      }
                      className="border-plum/30 text-primary focus:ring-primary h-4 w-4 rounded"
                    />
                    Horno pagado
                  </label>
                  <input
                    value={newClass.materialName}
                    onChange={(e) =>
                      setNewClass({ ...newClass, materialName: e.target.value })
                    }
                    placeholder="Material (nombre)"
                    className="border-plum/20 text-ink ring-primary/20 rounded-lg border bg-white px-3 py-2 text-sm transition outline-none focus:ring-2"
                  />
                  <input
                    value={newClass.materialPrice}
                    onChange={(e) =>
                      setNewClass({
                        ...newClass,
                        materialPrice: e.target.value,
                      })
                    }
                    placeholder="Material (precio)"
                    className="border-plum/20 text-ink ring-primary/20 rounded-lg border bg-white px-3 py-2 text-sm transition outline-none focus:ring-2"
                  />
                  <label className="text-plum flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={newClass.materialPaid}
                      onChange={(e) =>
                        setNewClass({
                          ...newClass,
                          materialPaid: e.target.checked,
                        })
                      }
                      className="border-plum/30 text-primary focus:ring-primary h-4 w-4 rounded"
                    />
                    Material pagado
                  </label>
                  <div className="flex items-center justify-end md:col-span-5">
                    <Button
                      type="submit"
                      variant="ghost"
                      loading={addClass.isPending}
                      disabled={!newClass.monthId}
                    >
                      <LuPlus className="h-4 w-4" />
                      Guardar clase
                    </Button>
                  </div>
                </form>
              ) : null}
            </div>

            <div className="border-plum/15 rounded-3xl border bg-white/80 p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-plum text-sm font-semibold">Editar clases</p>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setShowEditClasses((prev) => !prev)}
                >
                  {showEditClasses ? "Ocultar edición" : "Editar clases"}
                </Button>
              </div>
              {showEditClasses ? (
                data.classes.length === 0 ? (
                  <p className="text-plum/60 mt-4 text-sm">
                    Este alumno aún no tiene clases cargadas.
                  </p>
                ) : (
                  <div className="mt-4 grid gap-4">
                    {data.classes.map((cls) => {
                      const draft = classDrafts[cls.id] ?? {
                        className: "",
                        classPrice: "",
                        classDay: "",
                        classPaid: false,
                        monthId: cls.monthId ?? null,
                        assistance: cls.assistance ?? false,
                        ovenName: cls.ovenName ?? "",
                        ovenPrice: cls.ovenPrice ?? "",
                        ovenPaid: cls.ovenPaid ?? false,
                        materialName: cls.materialName ?? "",
                        materialPrice: cls.materialPrice ?? "",
                        materialPaid: cls.materialPaid ?? false,
                      };
                      return (
                        <div
                          key={cls.id}
                          className="border-plum/15 bg-secondary/10 rounded-2xl border p-4 shadow-sm"
                        >
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <h3 className="text-plum text-lg font-semibold">
                              {cls.className}
                            </h3>
                            <span className="text-plum/60 text-xs">
                              Creado el{" "}
                              {new Date(cls.createdAt).toLocaleDateString(
                                "es-AR",
                              )}
                            </span>
                          </div>
                          <p className="text-plum/70 text-xs">
                            Mes:{" "}
                            <span className="text-plum font-semibold">
                              {cls.monthLabel}
                            </span>
                          </p>
                          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-4">
                            <input
                              value={draft.className}
                              onChange={(e) =>
                                setClassDrafts((prev) => ({
                                  ...prev,
                                  [cls.id]: {
                                    ...(prev[cls.id] ?? draft),
                                    className: e.target.value,
                                  },
                                }))
                              }
                              placeholder="Nombre"
                              className="border-plum/20 text-ink ring-primary/20 rounded-lg border bg-white px-3 py-2 text-sm transition outline-none focus:ring-2"
                            />
                            <input
                              type="number"
                              value={draft.classPrice}
                              onChange={(e) =>
                                setClassDrafts((prev) => ({
                                  ...prev,
                                  [cls.id]: {
                                    ...(prev[cls.id] ?? draft),
                                    classPrice: e.target.value,
                                  },
                                }))
                              }
                              placeholder="Precio"
                              className="border-plum/20 text-ink ring-primary/20 rounded-lg border bg-white px-3 py-2 text-sm transition outline-none focus:ring-2"
                            />
                            <input
                              type="date"
                              value={draft.classDay}
                              onChange={(e) =>
                                setClassDrafts((prev) => ({
                                  ...prev,
                                  [cls.id]: {
                                    ...(prev[cls.id] ?? draft),
                                    classDay: e.target.value,
                                  },
                                }))
                              }
                              className="border-plum/20 text-ink ring-primary/20 rounded-lg border bg-white px-3 py-2 text-sm transition outline-none focus:ring-2"
                            />
                            <label className="text-plum flex items-center gap-2 text-sm">
                              <input
                                type="checkbox"
                                checked={draft.classPaid}
                                onChange={(e) =>
                                  setClassDrafts((prev) => ({
                                    ...prev,
                                    [cls.id]: {
                                      ...(prev[cls.id] ?? draft),
                                      classPaid: e.target.checked,
                                    },
                                  }))
                                }
                                className="border-plum/30 text-primary focus:ring-primary h-4 w-4 rounded"
                              />
                              Pagado
                            </label>
                            <label className="text-plum flex items-center gap-2 text-sm">
                              <input
                                type="checkbox"
                                checked={draft.assistance}
                                onChange={(e) =>
                                  setClassDrafts((prev) => ({
                                    ...prev,
                                    [cls.id]: {
                                      ...(prev[cls.id] ?? draft),
                                      assistance: e.target.checked,
                                    },
                                  }))
                                }
                                className="border-plum/30 text-primary focus:ring-primary h-4 w-4 rounded"
                              />
                              Asistió
                            </label>
                            <input
                              value={draft.ovenName}
                              onChange={(e) =>
                                setClassDrafts((prev) => ({
                                  ...prev,
                                  [cls.id]: {
                                    ...(prev[cls.id] ?? draft),
                                    ovenName: e.target.value,
                                  },
                                }))
                              }
                              placeholder="Horno (nombre)"
                              className="border-plum/20 text-ink ring-primary/20 rounded-lg border bg-white px-3 py-2 text-sm transition outline-none focus:ring-2"
                            />
                            <input
                              value={draft.ovenPrice}
                              onChange={(e) =>
                                setClassDrafts((prev) => ({
                                  ...prev,
                                  [cls.id]: {
                                    ...(prev[cls.id] ?? draft),
                                    ovenPrice: e.target.value,
                                  },
                                }))
                              }
                              placeholder="Horno (precio)"
                              className="border-plum/20 text-ink ring-primary/20 rounded-lg border bg-white px-3 py-2 text-sm transition outline-none focus:ring-2"
                            />
                            <label className="text-plum flex items-center gap-2 text-sm">
                              <input
                                type="checkbox"
                                checked={draft.ovenPaid}
                                onChange={(e) =>
                                  setClassDrafts((prev) => ({
                                    ...prev,
                                    [cls.id]: {
                                      ...(prev[cls.id] ?? draft),
                                      ovenPaid: e.target.checked,
                                    },
                                  }))
                                }
                                className="border-plum/30 text-primary focus:ring-primary h-4 w-4 rounded"
                              />
                              Horno pagado
                            </label>
                            <input
                              value={draft.materialName}
                              onChange={(e) =>
                                setClassDrafts((prev) => ({
                                  ...prev,
                                  [cls.id]: {
                                    ...(prev[cls.id] ?? draft),
                                    materialName: e.target.value,
                                  },
                                }))
                              }
                              placeholder="Material (nombre)"
                              className="border-plum/20 text-ink ring-primary/20 rounded-lg border bg-white px-3 py-2 text-sm transition outline-none focus:ring-2"
                            />
                            <input
                              value={draft.materialPrice}
                              onChange={(e) =>
                                setClassDrafts((prev) => ({
                                  ...prev,
                                  [cls.id]: {
                                    ...(prev[cls.id] ?? draft),
                                    materialPrice: e.target.value,
                                  },
                                }))
                              }
                              placeholder="Material (precio)"
                              className="border-plum/20 text-ink ring-primary/20 rounded-lg border bg-white px-3 py-2 text-sm transition outline-none focus:ring-2"
                            />
                            <label className="text-plum flex items-center gap-2 text-sm">
                              <input
                                type="checkbox"
                                checked={draft.materialPaid}
                                onChange={(e) =>
                                  setClassDrafts((prev) => ({
                                    ...prev,
                                    [cls.id]: {
                                      ...(prev[cls.id] ?? draft),
                                      materialPaid: e.target.checked,
                                    },
                                  }))
                                }
                                className="border-plum/30 text-primary focus:ring-primary h-4 w-4 rounded"
                              />
                              Material pagado
                            </label>
                          </div>
                          <div className="mt-3 flex justify-end">
                            <Button
                              type="button"
                              variant="ghost"
                              loading={updateClass.isPending}
                              onClick={() => handleSaveClass(cls.id)}
                            >
                              <LuSave className="h-4 w-4" />
                              Guardar clase
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )
              ) : null}
            </div>
          </div>

          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <p className="text-plum/70 text-md tracking-widest uppercase">
                Detalle de clases
              </p>
              <p className="text-plum text-sm font-semibold">
                Resumen de cada clase cargada
              </p>
            </div>

            {data.classes.length === 0 ? (
              <p className="border-plum/20 text-plum/70 rounded-2xl border border-dashed bg-white/70 p-6 text-sm">
                Este alumno aún no tiene clases cargadas.
              </p>
            ) : (
              <div className="grid gap-4">
                {data.classes.map((cls) => (
                  <div
                    key={cls.id}
                    className="border-plum/15 rounded-3xl border bg-white/90 p-5 shadow-sm"
                  >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <h3 className="text-plum text-lg font-semibold">
                          {cls.className}
                        </h3>
                        <p className="text-plum/70 text-xs">
                          Mes:{" "}
                          <span className="text-plum font-semibold">
                            {cls.monthLabel}
                          </span>
                        </p>
                      </div>
                      <span className="text-plum/60 text-xs">
                        {cls.classDay
                          ? new Date(cls.classDay).toLocaleDateString("es-AR")
                          : "Sin fecha"}
                      </span>
                    </div>
                    <div className="mt-3 grid grid-cols-1 gap-2 text-sm md:grid-cols-2">
                      <p className="text-plum/80">
                        <span className="text-plum font-semibold">Precio:</span>{" "}
                        ${Number(cls.classPrice ?? 0).toLocaleString("es-AR")}
                      </p>
                      <p className="text-plum/80">
                        <span className="text-plum font-semibold">Pagado:</span>{" "}
                        {cls.classPaid ? "Sí" : "No"}
                      </p>
                      <p className="text-plum/80">
                        <span className="text-plum font-semibold">
                          Asistencia:
                        </span>{" "}
                        {cls.assistance ? "Sí" : "No"}
                      </p>
                      <p className="text-plum/80">
                        <span className="text-plum font-semibold">Horno:</span>{" "}
                        {cls.ovenName ?? "—"}
                      </p>
                      <p className="text-plum/80">
                        <span className="text-plum font-semibold">
                          Precio horno:
                        </span>{" "}
                        {cls.ovenPrice ? `$${cls.ovenPrice}` : "—"}
                      </p>
                      <p className="text-plum/80">
                        <span className="text-plum font-semibold">
                          Horno pagado:
                        </span>{" "}
                        {cls.ovenPaid ? "Sí" : "No"}
                      </p>
                      <p className="text-plum/80">
                        <span className="text-plum font-semibold">
                          Material:
                        </span>{" "}
                        {cls.materialName || "—"}
                      </p>
                      <p className="text-plum/80">
                        <span className="text-plum font-semibold">
                          Precio material:
                        </span>{" "}
                        {cls.materialPrice ? `$${cls.materialPrice}` : "—"}
                      </p>
                      <p className="text-plum/80">
                        <span className="text-plum font-semibold">
                          Material pagado:
                        </span>{" "}
                        {cls.materialPaid ? "Sí" : "No"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
