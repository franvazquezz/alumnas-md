# Gestión de talleres

Aplicación multi-taller para gestionar alumnas/os, períodos mensuales, clases,
asistencia y pagos. Cada taller mantiene sus propios usuarios, turnos y datos,
y la administración de plataforma permite crear y configurar nuevos talleres.

> El despliegue público está pausado hasta completar la autorización por rol y
> taller de la fase 4. La fase 3 ya exige una sesión válida, pero todavía no
> limita cada operación al rol y al taller correspondiente.

## Tecnologías

- Next.js 15 y React 19;
- TypeScript;
- tRPC y TanStack Query;
- Prisma 7 con PostgreSQL;
- Mantine 8;
- Tailwind CSS 4;
- pnpm 10.

## Requisitos

- Node.js 20 LTS;
- pnpm 10.17.1 mediante Corepack;
- PostgreSQL 15 o posterior.

```bash
corepack enable
corepack prepare pnpm@10.17.1 --activate
pnpm install --frozen-lockfile
```

## Configuración local

Copiar el archivo de ejemplo y completar una URL de PostgreSQL local. Nunca se
debe usar la base de producción para desarrollo o pruebas.

```bash
cp .env.example .env.local
```

```dotenv
DATABASE_URL="postgresql://USUARIO:CONTRASEÑA@127.0.0.1:5432/mdceramica"
AUTH_SECRET="una-cadena-aleatoria-de-al-menos-32-bytes"
AUTH_URL="http://localhost:3000"
```

Para una base vacía, aplicar el historial completo y generar Prisma Client:

```bash
pnpm db:migrate
pnpm db:generate
pnpm dev
```

La aplicación queda disponible en `http://localhost:3000`.

## Autenticación

La fase 3 usa NextAuth/Auth.js con correo y contraseña, Google OAuth, correo
verificado, recuperación de contraseña y sesiones revocables. El registro no
es público: toda cuenta nueva necesita una invitación vigente.

Generar el secreto y configurar las credenciales de Google y el envío de correo
según `.env.example`. El callback OAuth es
`/api/auth/callback/google`. Los correos transaccionales usan Resend; durante el
desarrollo, si Resend no está configurado, el enlace de un solo uso aparece
sólo en la consola local.

Después de aplicar la migración, crear una única cuenta propietaria inicial:

```bash
OWNER_EMAIL="administracion@example.com" \
OWNER_PASSWORD="una-clave-de-al-menos-12-caracteres" \
pnpm auth:bootstrap
```

Hasta que exista la interfaz administrativa de invitaciones, se puede crear una
desde la terminal. Las cuentas `STUDENT` deben vincularse a una ficha existente:

```bash
INVITE_EMAIL="alumna@example.com" \
INVITE_ROLE="STUDENT" \
INVITE_STUDENT_ID="123" \
STUDIO_SLUG="md-ceramica" \
pnpm auth:invite
```

El primer `OWNER` creado por `auth:bootstrap` queda como administrador de
plataforma. Desde `/admin` puede gestionar talleres y asignar usuarios. Cada
propietario configura los turnos de su taller y consulta su auditoría; los
administradores operativos sólo ven los datos del taller activo.

El procedimiento completo de configuración y control está en
`docs/FASE_3_RUNBOOK.md`.

## Migraciones

El directorio `prisma/migrations` es la fuente de verdad del esquema. Cada
cambio de `prisma/schema.prisma` debe incluir una migración versionada.

```bash
# Crear y aplicar una migración durante el desarrollo
pnpm db:migrate:dev

# Aplicar migraciones ya versionadas
pnpm db:migrate

# Regenerar Prisma Client sin modificar la base
pnpm db:generate

# Inspeccionar la base local
pnpm db:studio
```

`pnpm db:push` se reserva para bases descartables. No debe utilizarse en bases
compartidas ni en producción porque omite el historial de migraciones.

### Bases anteriores al historial

Las bases que ya contenían las tablas activas antes de la migración inicial no
deben ejecutar el SQL del baseline. Después de comprobar que coinciden con
`prisma/schema.prisma`, se registra el baseline y se aplican sólo las
migraciones posteriores:

```bash
pnpm exec prisma migrate diff \
  --from-config-datasource \
  --to-schema prisma/schema.prisma
pnpm exec prisma migrate resolve \
  --applied 20260901000100_baseline
pnpm db:migrate
```

La segunda migración elimina `StudentClass`, `classes` y `students`. Antes de
aplicarla en una base heredada se debe confirmar que las tres tablas estén
vacías y conservar un respaldo reciente.

## Calidad

```bash
pnpm check
pnpm build
pnpm verify:css-theme
```

`pnpm check` ejecuta formato, ESLint, TypeScript y las pruebas unitarias de
fechas, dinero y agenda. GitHub Actions repite esas verificaciones, el build y
el control del tema CSS generado con Node.js 20 en cada pull request y push a
`main`.

## Reglas de dominio

- Los cumpleaños y días de clase se intercambian como `AAAA-MM-DD`; no deben
  convertirse a instantes locales en la interfaz.
- Los importes usan `Decimal(12,2)`, aceptan como mínimo cero y el total incluye
  clase, horno y materiales.
- Cada importe tiene estado `PENDING` o `PAID`.
- Los meses se identifican por `year + month` y los días semanales por el enum
  `Weekday`.
- Las fichas de estudiantes pueden estar activas o inactivas.

El procedimiento de aplicación y control de la fase 2 está en
`docs/FASE_2_RUNBOOK.md`.

## Despliegue

1. Configurar `DATABASE_URL` como secreto del entorno, apuntando a la base
   correspondiente.
2. Crear un respaldo antes de aplicar migraciones.
3. Ejecutar `pnpm db:migrate` como paso previo al despliegue.
4. Ejecutar `pnpm build` y desplegar el resultado de Next.js.
5. Verificar que la aplicación use la base esperada y revisar el estado de las
   migraciones con `pnpm exec prisma migrate status`.

No se deben ejecutar `prisma migrate dev` ni `prisma db push` durante un
despliegue.

## Estructura principal

```text
prisma/
  migrations/       Historial SQL versionado
  schema.prisma     Modelo de datos actual
src/
  app/              Rutas y componentes de Next.js
  server/           Prisma y procedimientos tRPC
  styles/           Tema Tailwind y estilos globales
docs/               Escaneos, decisiones y planes de reconstrucción
```
