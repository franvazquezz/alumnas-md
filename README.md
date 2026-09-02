# MD Cerámica

Aplicación administrativa del taller MD Cerámica. Permite gestionar alumnas/os,
meses, clases, asistencia y pagos.

> El despliegue público está pausado hasta que la fase de autenticación proteja
> los datos y las mutaciones. La aplicación no debe exponerse a Internet en su
> estado actual.

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
```

Para una base vacía, aplicar el historial completo y generar Prisma Client:

```bash
pnpm db:migrate
pnpm db:generate
pnpm dev
```

La aplicación queda disponible en `http://localhost:3000`.

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

`pnpm check` ejecuta formato, ESLint y TypeScript. GitHub Actions repite esas
verificaciones, el build y el control del tema CSS generado con Node.js 20 en
cada pull request y push a `main`.

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
