# Fase 1 — Base técnica reproducible

**Estado:** cerrada el 1 de septiembre de 2026.

## Resultado

- Se creó `20260901000100_baseline` con `Student`, `Month`, `Class` y
  `Timetable`.
- Se creó `20260901000200_remove_legacy_tables` para retirar `StudentClass`,
  `classes` y `students` sin usar `CASCADE`.
- El historial completo reconstruyó un esquema temporal vacío sin drift.
- El baseline se registró mediante `prisma migrate resolve` tanto en la copia
  local como en Neon; luego se aplicó la migración de limpieza.
- Las dos bases conservan 27 estudiantes, 1 mes y 1 clase.
- La copia local conserva `Student_id_seq` en 36 y Neon en 37, valores seguros
  de acuerdo con las pruebas de la fase 0.
- Prisma informa dos migraciones aplicadas y `No difference detected` en Neon.
- El esquema temporal de verificación fue eliminado al terminar.

## Respaldo de producción

Antes de modificar Neon se generó:

```text
.local-backups/mdceramica-pre-phase-1-2026-09-01.dump
```

- formato: dump personalizado de PostgreSQL;
- propietario y privilegios excluidos;
- permisos: `600`;
- SHA-256:
  `4d3ef5fb7f56327a4439f406760d6314555519504eaf4c4d8ed027384ccd922f`.

El respaldo está ignorado por Git y contiene información personal; no debe
subirse al repositorio ni compartirse sin protección.

## Base técnica

- Tailwind 4 define el tema mediante `@theme` en `globals.css`.
- `verify:css-theme` comprueba tokens y utilidades en el CSS del build.
- Los dos workflows obsoletos fueron reemplazados por una sola pipeline con
  pnpm 10, Node.js 20, formato, lint, typecheck, build y verificación CSS.
- Los seis archivos detectados fuera de formato fueron corregidos.
- Prisma prioriza variables existentes, después `.env.local` y finalmente
  `.env`; así los comandos locales no caen accidentalmente en producción.
- El README documenta instalación, migraciones, controles y despliegue.

## Verificaciones finales

```text
pnpm check             PASS
pnpm build             PASS
pnpm verify:css-theme  PASS
prisma migrate status  PASS (local y Neon)
prisma migrate diff    sin drift (base vacía reconstruida y Neon)
```

## Estado operativo

El proyecto Vercel sigue pausado. No debe reactivarse hasta implementar la
autenticación y autorización previstas en la fase 3.
