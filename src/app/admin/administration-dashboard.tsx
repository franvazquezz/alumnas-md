"use client";

import Link from "next/link";
import { notifications } from "@mantine/notifications";
import { useEffect, useState } from "react";
import { LuArrowLeft, LuPlus, LuSave, LuTrash2 } from "react-icons/lu";

import { AccountActions } from "~/app/_components/account-actions";
import { ButtonM } from "~/app/_components/button";
import { StudioSwitcher } from "~/app/_components/studio-switcher";
import { api, type RouterOutputs } from "~/trpc/react";

type Overview = RouterOutputs["administration"]["overview"];
type Shift = Overview["studio"]["shifts"][number];
type Studio = RouterOutputs["administration"]["listStudios"][number];
type User = RouterOutputs["administration"]["listUsers"][number];
type Student = RouterOutputs["administration"]["listStudents"][number];
type Role = "OWNER" | "ADMIN" | "STUDENT";

const inputClass =
  "border-plum/20 text-ink ring-primary/20 w-full rounded-xl border bg-white px-3 py-2 text-sm outline-none focus:ring-2";

const notifyError = (error: { message?: string }) =>
  notifications.show({
    color: "red",
    message: error.message ?? "No se pudo guardar el cambio",
  });

const roleLabel: Record<Role, string> = {
  OWNER: "Propietario",
  ADMIN: "Administrador",
  STUDENT: "Alumno",
};

const actionLabel: Record<string, string> = {
  CREATE: "Creación",
  UPDATE: "Actualización",
  DELETE: "Eliminación",
  ASSIGN: "Asignación",
  UNASSIGN: "Desasignación",
  SWITCH: "Cambio de taller",
};

const entityLabel: Record<string, string> = {
  STUDIO: "Taller",
  USER: "Usuario",
  MEMBERSHIP: "Usuario / taller",
  SHIFT: "Turno",
  STUDENT: "Alumno",
  CLASS: "Clase",
};

const auditDateFormatter = new Intl.DateTimeFormat("es-AR", {
  dateStyle: "short",
  timeStyle: "short",
});

const auditDetail = (metadata: unknown, entityId: string | null) => {
  if (metadata && typeof metadata === "object" && !Array.isArray(metadata)) {
    const values = Object.entries(metadata)
      .map(([key, value]) => `${key}: ${String(value)}`)
      .join(" · ");
    if (values) return values;
  }
  return entityId ? `#${entityId}` : "—";
};

function CurrentStudioSettings({ overview }: { overview: Overview }) {
  const utils = api.useUtils();
  const [form, setForm] = useState({
    name: overview.studio.name,
    slug: overview.studio.slug,
    description: overview.studio.description ?? "",
    address: overview.studio.address ?? "",
    telephone: overview.studio.telephone ?? "",
  });
  useEffect(() => {
    setForm({
      name: overview.studio.name,
      slug: overview.studio.slug,
      description: overview.studio.description ?? "",
      address: overview.studio.address ?? "",
      telephone: overview.studio.telephone ?? "",
    });
  }, [overview.studio]);
  const update = api.administration.updateCurrentStudio.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.administration.overview.invalidate(),
        utils.administration.navigation.invalidate(),
      ]);
      notifications.show({ color: "green", message: "Taller actualizado" });
    },
    onError: notifyError,
  });

  return (
    <form
      className="grid gap-3 md:grid-cols-2"
      onSubmit={(event) => {
        event.preventDefault();
        update.mutate(form);
      }}
    >
      <input
        required
        className={inputClass}
        value={form.name}
        onChange={(event) => setForm({ ...form, name: event.target.value })}
        placeholder="Nombre del taller"
      />
      <input
        required
        className={inputClass}
        value={form.slug}
        onChange={(event) => setForm({ ...form, slug: event.target.value })}
        placeholder="identificador-del-taller"
      />
      <input
        className={inputClass}
        value={form.address}
        onChange={(event) => setForm({ ...form, address: event.target.value })}
        placeholder="Dirección"
      />
      <input
        className={inputClass}
        value={form.telephone}
        onChange={(event) =>
          setForm({ ...form, telephone: event.target.value })
        }
        placeholder="Teléfono"
      />
      <textarea
        className={`${inputClass} md:col-span-2`}
        value={form.description}
        onChange={(event) =>
          setForm({ ...form, description: event.target.value })
        }
        placeholder="Descripción"
        rows={3}
      />
      <div className="flex justify-end md:col-span-2">
        <ButtonM type="submit" loading={update.isPending}>
          <LuSave className="h-4 w-4" /> Guardar configuración
        </ButtonM>
      </div>
    </form>
  );
}

function ShiftRow({ shift }: { shift: Shift }) {
  const utils = api.useUtils();
  const [form, setForm] = useState({
    startTime: shift.startTime,
    label: shift.label ?? "",
    sortOrder: shift.sortOrder,
    isActive: shift.isActive,
  });
  const update = api.administration.updateShift.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.administration.overview.invalidate(),
        utils.students.formOptions.invalidate(),
      ]);
      notifications.show({ color: "green", message: "Turno actualizado" });
    },
    onError: notifyError,
  });
  const remove = api.administration.deleteShift.useMutation({
    onSuccess: async () => {
      await utils.administration.overview.invalidate();
      notifications.show({ color: "green", message: "Turno eliminado" });
    },
    onError: notifyError,
  });

  return (
    <div className="border-plum/15 grid gap-2 rounded-2xl border bg-white/70 p-3 md:grid-cols-[120px_1fr_80px_auto_auto] md:items-center">
      <input
        type="time"
        className={inputClass}
        value={form.startTime}
        onChange={(event) =>
          setForm({ ...form, startTime: event.target.value })
        }
      />
      <input
        className={inputClass}
        value={form.label}
        onChange={(event) => setForm({ ...form, label: event.target.value })}
        placeholder="Etiqueta opcional"
      />
      <input
        type="number"
        min={0}
        className={inputClass}
        value={form.sortOrder}
        onChange={(event) =>
          setForm({ ...form, sortOrder: Number(event.target.value) })
        }
        aria-label="Orden"
      />
      <label className="text-plum flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={form.isActive}
          onChange={(event) =>
            setForm({ ...form, isActive: event.target.checked })
          }
        />
        Activo
      </label>
      <div className="flex gap-2">
        <ButtonM
          type="button"
          loading={update.isPending}
          onClick={() => update.mutate({ id: shift.id, ...form })}
        >
          <LuSave className="h-4 w-4" />
        </ButtonM>
        <ButtonM
          type="button"
          variant="danger"
          loading={remove.isPending}
          onClick={() => remove.mutate({ id: shift.id })}
        >
          <LuTrash2 className="h-4 w-4" />
        </ButtonM>
      </div>
    </div>
  );
}

function ShiftSettings({ shifts }: { shifts: Shift[] }) {
  const utils = api.useUtils();
  const [startTime, setStartTime] = useState("");
  const [label, setLabel] = useState("");
  const create = api.administration.createShift.useMutation({
    onSuccess: async () => {
      setStartTime("");
      setLabel("");
      await Promise.all([
        utils.administration.overview.invalidate(),
        utils.students.formOptions.invalidate(),
      ]);
      notifications.show({ color: "green", message: "Turno creado" });
    },
    onError: notifyError,
  });

  return (
    <div className="space-y-3">
      {shifts.map((shift) => (
        <ShiftRow key={shift.id} shift={shift} />
      ))}
      <form
        className="border-primary/20 grid gap-2 rounded-2xl border border-dashed p-3 md:grid-cols-[140px_1fr_auto]"
        onSubmit={(event) => {
          event.preventDefault();
          create.mutate({ startTime, label, sortOrder: shifts.length });
        }}
      >
        <input
          required
          type="time"
          className={inputClass}
          value={startTime}
          onChange={(event) => setStartTime(event.target.value)}
        />
        <input
          className={inputClass}
          value={label}
          onChange={(event) => setLabel(event.target.value)}
          placeholder="Etiqueta opcional (por ejemplo, Mañana)"
        />
        <ButtonM type="submit" loading={create.isPending}>
          <LuPlus className="h-4 w-4" /> Agregar turno
        </ButtonM>
      </form>
    </div>
  );
}

function StudioCard({ studio }: { studio: Studio }) {
  const utils = api.useUtils();
  const [form, setForm] = useState({
    id: studio.id,
    name: studio.name,
    slug: studio.slug,
    description: studio.description ?? "",
    address: studio.address ?? "",
    telephone: studio.telephone ?? "",
    isActive: studio.isActive,
  });
  const update = api.administration.updateStudio.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.administration.listStudios.invalidate(),
        utils.administration.navigation.invalidate(),
      ]);
      notifications.show({ color: "green", message: "Taller actualizado" });
    },
    onError: notifyError,
  });

  return (
    <form
      className="border-plum/15 grid gap-3 rounded-2xl border bg-white/70 p-4 md:grid-cols-2"
      onSubmit={(event) => {
        event.preventDefault();
        update.mutate(form);
      }}
    >
      <input
        required
        className={inputClass}
        value={form.name}
        onChange={(e) => setForm({ ...form, name: e.target.value })}
      />
      <input
        required
        className={inputClass}
        value={form.slug}
        onChange={(e) => setForm({ ...form, slug: e.target.value })}
      />
      <input
        className={inputClass}
        value={form.address}
        onChange={(e) => setForm({ ...form, address: e.target.value })}
        placeholder="Dirección"
      />
      <input
        className={inputClass}
        value={form.telephone}
        onChange={(e) => setForm({ ...form, telephone: e.target.value })}
        placeholder="Teléfono"
      />
      <textarea
        className={`${inputClass} md:col-span-2`}
        value={form.description}
        onChange={(e) => setForm({ ...form, description: e.target.value })}
        placeholder="Descripción"
      />
      <div className="text-plum/70 text-xs md:col-span-2">
        {studio._count.students} alumnos · {studio._count.memberships} usuarios
        · {studio._count.shifts} turnos
      </div>
      <div className="flex items-center justify-between gap-3 md:col-span-2">
        <label className="text-plum flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.isActive}
            onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
          />
          Taller activo
        </label>
        <ButtonM type="submit" loading={update.isPending}>
          <LuSave className="h-4 w-4" /> Guardar
        </ButtonM>
      </div>
    </form>
  );
}

function StudiosCrud({ studios }: { studios: Studio[] }) {
  const utils = api.useUtils();
  const [form, setForm] = useState({
    name: "",
    slug: "",
    description: "",
    address: "",
    telephone: "",
  });
  const create = api.administration.createStudio.useMutation({
    onSuccess: async () => {
      setForm({
        name: "",
        slug: "",
        description: "",
        address: "",
        telephone: "",
      });
      await Promise.all([
        utils.administration.listStudios.invalidate(),
        utils.administration.navigation.invalidate(),
      ]);
      notifications.show({
        color: "green",
        message: "Taller creado con turnos iniciales",
      });
    },
    onError: notifyError,
  });

  return (
    <div className="space-y-4">
      <form
        className="border-primary/20 grid gap-3 rounded-2xl border border-dashed p-4 md:grid-cols-2"
        onSubmit={(event) => {
          event.preventDefault();
          create.mutate(form);
        }}
      >
        <input
          required
          className={inputClass}
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="Nombre del nuevo taller"
        />
        <input
          className={inputClass}
          value={form.slug}
          onChange={(e) => setForm({ ...form, slug: e.target.value })}
          placeholder="Slug (se genera si queda vacío)"
        />
        <input
          className={inputClass}
          value={form.address}
          onChange={(e) => setForm({ ...form, address: e.target.value })}
          placeholder="Dirección"
        />
        <input
          className={inputClass}
          value={form.telephone}
          onChange={(e) => setForm({ ...form, telephone: e.target.value })}
          placeholder="Teléfono"
        />
        <textarea
          className={`${inputClass} md:col-span-2`}
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          placeholder="Descripción"
        />
        <div className="flex justify-end md:col-span-2">
          <ButtonM type="submit" loading={create.isPending}>
            <LuPlus className="h-4 w-4" /> Crear taller
          </ButtonM>
        </div>
      </form>
      <div className="grid gap-4 lg:grid-cols-2">
        {studios.map((studio) => (
          <StudioCard key={studio.id} studio={studio} />
        ))}
      </div>
    </div>
  );
}

function UserCard({
  user,
  studios,
  students,
}: {
  user: User;
  studios: Studio[];
  students: Student[];
}) {
  const utils = api.useUtils();
  const [name, setName] = useState(user.name ?? "");
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(user.isPlatformAdmin);
  const [studioId, setStudioId] = useState<number | null>(
    studios.find((studio) => studio.isActive)?.id ?? null,
  );
  const [role, setRole] = useState<Role>("ADMIN");
  const [studentId, setStudentId] = useState<number | null>(null);
  const refresh = async () => {
    await Promise.all([
      utils.administration.listUsers.invalidate(),
      utils.administration.overview.invalidate(),
      utils.administration.navigation.invalidate(),
    ]);
  };
  const update = api.administration.updateUser.useMutation({
    onSuccess: refresh,
    onError: notifyError,
  });
  const assign = api.administration.setMembership.useMutation({
    onSuccess: refresh,
    onError: notifyError,
  });
  const remove = api.administration.removeMembership.useMutation({
    onSuccess: refresh,
    onError: notifyError,
  });
  const available = students.filter(
    (student) =>
      student.studioId === studioId &&
      (!student.userId || student.userId === user.id),
  );

  return (
    <div className="border-plum/15 space-y-4 rounded-2xl border bg-white/70 p-4">
      <div>
        <p className="text-plum font-semibold">{user.email}</p>
        <p className="text-plum/60 text-xs">
          {user.emailVerified
            ? "Correo verificado"
            : "Correo pendiente de verificar"}
        </p>
      </div>
      <div className="grid gap-2 md:grid-cols-[1fr_auto_auto] md:items-center">
        <input
          className={inputClass}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nombre"
        />
        <label className="text-plum flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={isPlatformAdmin}
            onChange={(e) => setIsPlatformAdmin(e.target.checked)}
          />{" "}
          Admin. plataforma
        </label>
        <ButtonM
          type="button"
          loading={update.isPending}
          onClick={() =>
            update.mutate({ userId: user.id, name, isPlatformAdmin })
          }
        >
          <LuSave className="h-4 w-4" />
        </ButtonM>
      </div>
      <div className="space-y-2">
        {user.memberships.map((membership) => (
          <div
            key={membership.id}
            className="bg-sand/70 flex items-center justify-between gap-3 rounded-xl px-3 py-2 text-sm"
          >
            <span className="text-plum">
              {membership.studio.name} · {roleLabel[membership.role]}
            </span>
            <ButtonM
              type="button"
              variant="danger"
              loading={remove.isPending}
              onClick={() =>
                remove.mutate({
                  userId: user.id,
                  studioId: membership.studioId,
                })
              }
            >
              <LuTrash2 className="h-4 w-4" />
            </ButtonM>
          </div>
        ))}
      </div>
      <div className="grid gap-2 md:grid-cols-[1fr_1fr_1fr_auto]">
        <select
          className={inputClass}
          value={studioId ?? ""}
          onChange={(e) => {
            setStudioId(e.target.value ? Number(e.target.value) : null);
            setStudentId(null);
          }}
        >
          <option value="">Taller</option>
          {studios
            .filter((studio) => studio.isActive)
            .map((studio) => (
              <option key={studio.id} value={studio.id}>
                {studio.name}
              </option>
            ))}
        </select>
        <select
          className={inputClass}
          value={role}
          onChange={(e) => {
            setRole(e.target.value as Role);
            setStudentId(null);
          }}
        >
          {(Object.keys(roleLabel) as Role[]).map((value) => (
            <option key={value} value={value}>
              {roleLabel[value]}
            </option>
          ))}
        </select>
        {role === "STUDENT" ? (
          <select
            required
            className={inputClass}
            value={studentId ?? ""}
            onChange={(e) =>
              setStudentId(e.target.value ? Number(e.target.value) : null)
            }
          >
            <option value="">Ficha del alumno</option>
            {available.map((student) => (
              <option key={student.id} value={student.id}>
                {student.name}
              </option>
            ))}
          </select>
        ) : (
          <span />
        )}
        <ButtonM
          type="button"
          loading={assign.isPending}
          disabled={!studioId || (role === "STUDENT" && !studentId)}
          onClick={() =>
            studioId &&
            assign.mutate({ userId: user.id, studioId, role, studentId })
          }
        >
          <LuPlus className="h-4 w-4" /> Asignar
        </ButtonM>
      </div>
    </div>
  );
}

export function AdministrationDashboard({
  isPlatformAdmin,
  isOwner,
  canManageCurrent,
}: {
  isPlatformAdmin: boolean;
  isOwner: boolean;
  canManageCurrent: boolean;
}) {
  const { data: overview, isLoading } = api.administration.overview.useQuery(
    undefined,
    { enabled: canManageCurrent },
  );
  const { data: studios } = api.administration.listStudios.useQuery(undefined, {
    enabled: isPlatformAdmin,
  });
  const { data: users } = api.administration.listUsers.useQuery(undefined, {
    enabled: isPlatformAdmin,
  });
  const { data: students } = api.administration.listStudents.useQuery(
    undefined,
    { enabled: isPlatformAdmin },
  );

  return (
    <main className="mx-auto flex min-h-screen max-w-7xl flex-col gap-7 px-4 py-8">
      <header className="from-primary via-plum to-secondary rounded-3xl bg-linear-to-r p-px shadow-xl">
        <div className="bg-sand/95 rounded-[23px] p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <Link
                href="/"
                className="text-plum/70 hover:text-primary inline-flex items-center gap-2 text-sm font-semibold"
              >
                <LuArrowLeft className="h-4 w-4" /> Volver al panel
              </Link>
              <h1 className="text-plum mt-3 text-3xl font-black">
                Administración
              </h1>
              <p className="text-plum/70 mt-1 text-sm">
                Talleres, turnos, usuarios y trazabilidad en un solo lugar.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <StudioSwitcher />
              <AccountActions />
            </div>
          </div>
        </div>
      </header>

      {canManageCurrent && isLoading ? (
        <p className="text-plum/70">Cargando taller...</p>
      ) : null}
      {overview ? (
        <>
          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {Object.entries({
              Alumnos: overview.summary.students,
              Clases: overview.summary.classes,
              "Turnos activos": overview.summary.shifts,
              Usuarios: overview.summary.users,
            }).map(([label, value]) => (
              <div
                key={label}
                className="ring-plum/10 rounded-2xl bg-white/80 p-4 shadow-sm ring-1"
              >
                <p className="text-plum/60 text-xs font-bold uppercase">
                  {label}
                </p>
                <p className="text-plum mt-1 text-3xl font-black">{value}</p>
              </div>
            ))}
          </section>
          {isOwner ? (
            <section className="ring-plum/10 rounded-3xl bg-white/80 p-6 shadow-lg ring-1">
              <p className="text-plum/60 text-xs font-bold tracking-widest uppercase">
                Taller activo
              </p>
              <h2 className="text-plum mb-5 text-2xl font-bold">
                Configuración de {overview.studio.name}
              </h2>
              <CurrentStudioSettings overview={overview} />
            </section>
          ) : null}
          {isOwner ? (
            <section className="ring-plum/10 rounded-3xl bg-white/80 p-6 shadow-lg ring-1">
              <p className="text-plum/60 text-xs font-bold tracking-widest uppercase">
                Agenda
              </p>
              <h2 className="text-plum mb-5 text-2xl font-bold">
                Turnos configurables
              </h2>
              <ShiftSettings shifts={overview.studio.shifts} />
            </section>
          ) : null}
          <section className="ring-plum/10 rounded-3xl bg-white/80 p-6 shadow-lg ring-1">
            <p className="text-plum/60 text-xs font-bold tracking-widest uppercase">
              Auditoría
            </p>
            <h2 className="text-plum mb-5 text-2xl font-bold">
              Actividad reciente del taller
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] text-left text-sm">
                <thead className="text-plum/60 border-plum/10 border-b text-xs uppercase">
                  <tr>
                    <th className="p-3">Fecha</th>
                    <th className="p-3">Usuario</th>
                    <th className="p-3">Acción</th>
                    <th className="p-3">Recurso</th>
                    <th className="p-3">Detalle</th>
                  </tr>
                </thead>
                <tbody>
                  {overview.logs.map((log) => (
                    <tr key={log.id} className="border-plum/10 border-b">
                      <td className="text-plum/70 p-3">
                        {auditDateFormatter.format(new Date(log.createdAt))}
                      </td>
                      <td className="text-plum p-3">
                        {log.actor?.name ?? log.actor?.email ?? "Sistema"}
                      </td>
                      <td className="p-3">
                        {actionLabel[log.action] ?? log.action}
                      </td>
                      <td className="p-3">
                        {entityLabel[log.entityType] ?? log.entityType}
                      </td>
                      <td className="text-plum/60 p-3">
                        {auditDetail(log.metadata, log.entityId)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {overview.logs.length === 0 ? (
                <p className="text-plum/60 py-8 text-center text-sm">
                  Todavía no hay movimientos auditados.
                </p>
              ) : null}
            </div>
          </section>
        </>
      ) : null}

      {isPlatformAdmin && studios && users && students ? (
        <>
          <section className="ring-primary/10 rounded-3xl bg-white/85 p-6 shadow-lg ring-1">
            <p className="text-primary/70 text-xs font-bold tracking-widest uppercase">
              Plataforma
            </p>
            <h2 className="text-plum mb-5 text-2xl font-bold">
              Todos los talleres
            </h2>
            <StudiosCrud studios={studios} />
          </section>
          <section className="ring-primary/10 rounded-3xl bg-white/85 p-6 shadow-lg ring-1">
            <p className="text-primary/70 text-xs font-bold tracking-widest uppercase">
              Accesos
            </p>
            <h2 className="text-plum mb-5 text-2xl font-bold">
              Usuarios y asignaciones
            </h2>
            <div className="space-y-4">
              {users.map((user) => (
                <UserCard
                  key={user.id}
                  user={user}
                  studios={studios}
                  students={students}
                />
              ))}
            </div>
          </section>
        </>
      ) : null}
    </main>
  );
}
