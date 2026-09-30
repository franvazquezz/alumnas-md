# Fase 6 — Pruebas, observabilidad y despliegue

**Estado:** primera entrega implementada localmente el 11 de septiembre de 2026. CI, salud, correlación de solicitudes, logs estructurados y el aislamiento
negativo entre alumnas tienen cobertura. El despliegue público sigue pausado
hasta elegir el proveedor, configurar secretos, alertas y respaldos automáticos.

## Cobertura automatizada

La verificación obligatoria es:

```bash
pnpm check
pnpm build
pnpm verify:css-theme
pnpm test:e2e
```

GitHub Actions ejecuta estas comprobaciones en cada pull request y cada push a
`main`. PostgreSQL 16 se inicia como servicio descartable, se aplican todas las
migraciones con `prisma migrate deploy`, se crean cuentas efímeras y se corre
Playwright sin depender de datos reales. Un fallo bloquea el job y conserva
trazas, capturas y el reporte durante siete días.

La suite E2E incluye:

- redirecciones de rutas privadas sin sesión;
- navegación y límites de OWNER, ADMIN y STUDENT;
- ficha administrativa, formularios y estados de error/vacío;
- acceso positivo a la ficha vinculada y rechazo `NOT_FOUND` al solicitar la
  ficha de otra alumna directamente por tRPC;
- salud de aplicación y propagación de `x-request-id`.

## Observabilidad

`GET /api/health` comprueba la conexión a PostgreSQL. Devuelve `200` con
`{"status":"ok"}` o `503` con `{"status":"unavailable"}` y siempre incluye
`x-request-id`. No devuelve detalles de infraestructura ni errores internos.

Cada procedimiento tRPC escribe una línea JSON con estos campos:

- `timestamp`, `level`, `service` y `event`;
- `requestId`, `procedure`, `procedureType` y `durationMs`;
- `userId`, `studioId` y `role`, cuando existe sesión;
- `ok` y `errorCode`.

Los rechazos esperados de validación, sesión o permisos conservan `ok:false` y
su código, pero se registran en nivel `info`; sólo los fallos internos usan
`error`, para que una denegación legítima no dispare alertas operativas.

El identificador entrante sólo se conserva si contiene caracteres seguros y no
supera 128 bytes; en caso contrario se genera un UUID. No se registran inputs,
contraseñas, cookies, tokens ni cuerpos de respuestas. Los campos `durationMs`,
`ok` y `errorCode` permiten derivar latencia y tasa de fallos en la plataforma
de logs elegida.

Las mutaciones de estudiantes, clases, talleres, turnos, membresías y cambios
de taller siguen escribiendo `AuditLog` dentro de la misma transacción que el
cambio. La auditoría funcional no reemplaza los logs operativos.

## Preparación de un despliegue

Antes de habilitar producción deben existir, en el proveedor elegido:

1. secretos separados para producción y staging;
2. retención y búsqueda de logs JSON;
3. un monitor HTTP sobre `/api/health` y alerta por respuestas `503`;
4. alertas de tasa de error y latencia p95 de tRPC;
5. respaldos automáticos de PostgreSQL con retención definida;
6. una prueba documentada de restauración en una base nueva.

No se debe desplegar desde una estación de desarrollo ni apuntar pruebas a la
base real.

## Secuencia controlada

1. Congelar mutaciones o anunciar una ventana si la migración lo requiere.
2. Confirmar el host y nombre de la base objetivo sin imprimir credenciales.
3. Crear un respaldo del proveedor y esperar su confirmación.
4. Restaurar el respaldo más reciente en una base temporal y ejecutar una
   consulta de control. Un respaldo no probado no cuenta como recuperable.
5. Ejecutar `pnpm exec prisma migrate status`.
6. Aplicar únicamente migraciones versionadas con `pnpm db:migrate`.
7. Ejecutar `pnpm build` sobre el mismo commit que se va a desplegar.
8. Desplegar y comprobar `/api/health`, login y un flujo de lectura por rol.
9. Revisar logs por `requestId`, errores y aumento de latencia.

En producción están prohibidos `prisma migrate dev` y `prisma db push`.

## Rollback

El código y los datos se revierten por separado:

- si el esquema sigue siendo compatible, volver a desplegar el artefacto del
  commit anterior y verificar `/api/health`;
- si hubo una migración destructiva o datos incompatibles, detener escrituras,
  restaurar el respaldo previo en **una base nueva**, validar conteos y
  relaciones, cambiar `DATABASE_URL` al destino restaurado y recién entonces
  reanudar tráfico;
- no editar `_prisma_migrations`, ejecutar SQL inverso improvisado ni restaurar
  encima de la única copia disponible.

Se debe registrar hora, commit, migraciones, responsable, motivo y resultado de
cada despliegue o rollback.

## Pendientes para cerrar la fase

- subir esta entrega y comprobar la ejecución real de GitHub Actions;
- elegir proveedor de despliegue y monitoreo;
- configurar alertas y retención con datos reales de operación;
- automatizar respaldos y completar un simulacro de recuperación;
- probar migraciones sobre una copia anonimizada representativa.
