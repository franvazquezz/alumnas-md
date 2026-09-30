# Gestión de talleres

Aplicación multi-taller para gestionar alumnas/os, períodos mensuales, clases,
asistencia y pagos. Cada taller mantiene sus propios usuarios, turnos y datos,
y la administración de plataforma permite crear y configurar nuevos talleres.

> El despliegue público está pausado. Las fases 2 y 4 están cerradas en local y
> Neon continúa sin cambios hasta preparar secretos, respaldo y despliegue
> controlado.

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

Los scripts `auth:bootstrap` y `auth:invite` cargan primero `.env.local` y luego
`.env`; las variables ya definidas por el entorno conservan prioridad.

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

La matriz de permisos, la administración multi-taller y su validación están
documentadas en `docs/FASE_4_RUNBOOK.md`.

El portal del estudiante y el avance de la separación de experiencias se
documentan en `docs/FASE_5_RUNBOOK.md`.

Las pruebas, la correlación de solicitudes, el endpoint de salud y el
procedimiento de despliegue/rollback se documentan en
`docs/FASE_6_RUNBOOK.md`.

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
pnpm test:e2e:install
```

`pnpm check` ejecuta formato, ESLint, TypeScript y las pruebas unitarias de
fechas, dinero y agenda. GitHub Actions repite esas verificaciones, el build y
el control del tema CSS generado y los E2E con Node.js 20 en cada pull request y push a
`main`.

Las pruebas E2E levantan un servidor local aislado y requieren cuentas QA.
Las credenciales se pasan por variables y nunca se versionan:

```bash
E2E_ADMIN_EMAIL="..." \
E2E_ADMIN_PASSWORD="..." \
E2E_ADMIN_STUDENT_ID="..." \
E2E_STUDENT_EMAIL="..." \
E2E_STUDENT_PASSWORD="..." \
E2E_OWNER_EMAIL="..." \
E2E_OWNER_PASSWORD="..." \
pnpm test:e2e
```

Si `E2E_BASE_URL` no está definido, Playwright inicia Next.js en el puerto
`3000`. La suite sólo consulta datos: valida acceso, roles, estados de interfaz
y navegación sin crear, editar ni eliminar registros.

Para crear las fixtures desde cero, prepara una base PostgreSQL **descartable**
local llamada `mdceramica_e2e` (o `mdceramica_e2e_*`). Exporta `DATABASE_URL`,
las seis variables de cuentas anteriores y `E2E_ADMIN_STUDENT_ID=1`; después
ejecuta `pnpm db:migrate` y `pnpm test:e2e:seed`. El seed no carga archivos
`.env`, rechaza conexiones remotas, parámetros de conexión y bases que ya
tengan usuarios o alumnos. Crea un taller, dos turnos, tres cuentas, una ficha,
una clase y dos cargos ficticios. No debe ejecutarse sobre la copia del taller.

CI hace esta preparación automáticamente con PostgreSQL 16, genera contraseñas
efímeras e instala Chromium. Falla si faltan las variables de algún rol en vez
de omitir pruebas. Ante fallos conserva el reporte, las trazas y capturas durante
siete días. La ejecución local puede usar PostgreSQL 18; la ejecución real de
GitHub Actions se verifica después de subir los cambios.

Después del seed, `pnpm test:integration` comprueba autorización tRPC contra
Prisma real. Sólo acepta una base PostgreSQL local descartable llamada
`mdceramica_e2e` o `mdceramica_e2e_*`; nunca debe apuntarse a Vercel ni a una
base compartida. CI también crea una invitación y ejecuta su aceptación completa
en Playwright con correo, contraseña y token generados para esa única ejecución.

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

El despliegue público continúa pausado. Antes de habilitarlo se debe completar
la lista operativa de `docs/FASE_6_RUNBOOK.md`, incluido un respaldo restaurado
con éxito en una base nueva.

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
