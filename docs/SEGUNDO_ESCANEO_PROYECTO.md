# Segundo escaneo ejecutable del proyecto

**Proyecto:** MD Cerámica / `tiendamd`  
**Fecha:** 31 de agosto de 2026  
**Commit base:** `97c1c13` (`main`)  
**Tipo de revisión:** build, base de datos, navegador y recorrido CRUD controlado.

## 1. Resultado general

La aplicación compila, pasa TypeScript y ESLint, carga correctamente en el navegador y el CRUD principal funciona cuando la base tiene sus secuencias consistentes. La copia local fue comparada fila por fila con Neon y quedó configurada como origen de la aplicación local.

El escaneo encontró dos defectos nuevos que deben tratarse antes de seguir construyendo funcionalidades:

1. **La secuencia de IDs de `Student` está rota también en producción.** El ID máximo es `36`, pero la secuencia está en `4`; la próxima alta intenta reutilizar un ID existente y falla.
2. **Los colores personalizados de Tailwind no se están compilando.** Clases como `text-plum` y `bg-primary` aparecen en JSX, pero no existen en el CSS generado.

También se confirmó experimentalmente el riesgo ya descrito con las fechas: una fecha de calendario `2000-01-02` se muestra como `1/1/2000` al convertirla mediante `Date` en la zona horaria argentina.

## 2. Historia verificada

La historia principal revisada fue:

> Una administradora abre el dashboard, consulta estudiantes y clases, entra a un detalle y puede crear o editar una persona, un mes y una clase; el cliente llama a tRPC, tRPC valida la entrada, Prisma persiste en PostgreSQL y la UI vuelve a renderizar el resultado.

## 3. Entorno observado

### Producción

- Proveedor: Neon.
- PostgreSQL: `15.19`.
- Base: `mdceramica`.
- Uso durante el escaneo: únicamente lecturas y `pg_dump`.
- Registros activos:
  - `Student`: 27.
  - `Month`: 1.
  - `Class`: 1.

### Entorno local

- Aplicación: `http://localhost:3000`.
- PostgreSQL Homebrew: `18.3`.
- Base restaurada: `mdceramica`.
- Puerto temporal seguro: `55432`.
- Configuración local: `.env.local`, ignorado por Git, sobrescribe la conexión de producción.

El puerto solicitado `5432` ya estaba ocupado por otro PostgreSQL que exige credenciales desconocidas. No se detuvo ni modificó ese servicio. Por eso la copia quedó provisionalmente en `127.0.0.1:55432/mdceramica`.

## 4. Copia y validación de la base

Se generó un dump personalizado con:

- propietario y privilegios excluidos;
- permisos de archivo `600`;
- 42 entradas de catálogo;
- checksum SHA-256 calculado antes de restaurar.

La restauración se hizo primero sobre `mdceramica` local. Se compararon hashes deterministas de todas las filas de las tablas activas:

| Tabla | Producción | Copia local | Resultado |
| --- | --- | --- | --- |
| `Student` | `3432ba94d5e52a43a7cf6e18a4cb9c40` | mismo hash | Coincide |
| `Month` | `6bf683d54d396ecffdecfbb094023e4f` | mismo hash | Coincide |
| `Class` | `d7b8b91902c611eabb10b6ceb0854a73` | mismo hash | Coincide |

Además:

- no hay meses huérfanos;
- no hay clases huérfanas;
- no hay nombres duplicados al comparar `lower(trim(name))`;
- los 27 estudiantes actuales tienen día, horario y cumpleaños;
- los conteos del dashboard coinciden con PostgreSQL.

El dump temporal fue eliminado después de verificar la copia para no mantener una segunda réplica innecesaria con información personal. Puede regenerarse desde Neon si fuera necesario.

## 5. Drift de esquema

La comparación de la copia local con `prisma/schema.prisma` muestra que las tres tablas del modelo actual están sincronizadas. El único drift son tablas heredadas que ya no aparecen en Prisma:

- `students`;
- `classes`;
- `StudentClass`.

Las tres tienen cero filas. Aun así, no deberían eliminarse hasta crear una migración controlada y confirmar un respaldo.

No existe tabla `_prisma_migrations` ni directorio de migraciones versionado en el repositorio.

## 6. Matriz de verificación

| Límite | Estado | Evidencia |
| --- | --- | --- |
| Build de producción | Pasa | Next.js compiló y generó 4 rutas |
| TypeScript | Pasa | `tsc --noEmit` terminó con código 0 |
| ESLint | Pasa | Sin errores ni warnings |
| Prettier | Falla | 6 archivos fuera de formato |
| Dashboard → tRPC | Pasa | `students.list` respondió 200 |
| tRPC → PostgreSQL | Pasa | Consultas Prisma observadas en logs |
| PostgreSQL → UI | Pasa | UI mostró 27 estudiantes y 1 clase |
| Detalle de estudiante | Pasa | El registro con clase mostró resumen y estadísticas |
| Alta de estudiante | Falla inicialmente | Colisión de ID por secuencia rota |
| Alta tras reparar secuencia descartable | Pasa | Estudiante ficticio creado |
| Edición de estudiante | Pasa | Día, teléfono y horario persistidos |
| Alta de mes | Pasa | Período ficticio persistido |
| Alta de clase | Pasa | Precio, asistencia, horno y material persistidos |
| Edición de clase | Pasa | Nombre, precio y pago actualizados |
| Eliminación de clase | Pasa | `students.deleteClass` respondió `{ success: true }` |
| Eliminación de estudiante | Pasa | Eliminó estudiante y mes de prueba en transacción |
| Limpieza del ensayo | Pasa | Conteos regresaron a 27/1/1 |
| Consola del navegador | Pasa en lectura | Sin errores ni overlay en dashboard y detalle |
| Colores Tailwind propios | Falla | `text-plum` computa negro y no existe en CSS |
| Fechas de calendario | Falla conceptual | `2000-01-02` se presenta como `1/1/2000` en Argentina |

## 7. Comandos de calidad

### `pnpm typecheck`

Resultado: **pasa**.

### `pnpm lint`

Resultado: **pasa** sin warnings.

### `pnpm format:check`

Resultado: **falla** en:

- `next.config.js`;
- `postcss.config.js`;
- `src/app/api/trpc/[trpc]/route.ts`;
- `src/server/db.ts`;
- `src/trpc/react.tsx`;
- `src/trpc/server.ts`.

### `pnpm build`

Resultado: **pasa**.

Resumen del bundle:

- `/`: 5.27 kB; 152 kB de carga inicial.
- `/students/[id]`: 5.22 kB; 143 kB de carga inicial.
- `/api/trpc/[trpc]`: ruta dinámica.

## 8. Hallazgos priorizados

### P0 — La producción no puede crear estudiantes de forma confiable

Valores confirmados tanto en Neon como en la copia sin modificar:

| Secuencia | ID máximo | Último valor | Estado |
| --- | ---: | ---: | --- |
| `Student_id_seq` | 36 | 4 | Rota |
| `Month_id_seq` | 2 | 2 | Correcta |
| `Class_id_seq` | 2 | 2 | Correcta |

La primera prueba de alta produjo:

```text
Unique constraint failed on the fields: (`id`)
```

La reparación sólo se aplicó en una base descartable para poder continuar el ensayo. **Neon y la copia principal permanecen sin modificar.**

Antes de cualquier alta real debe ejecutarse una corrección controlada equivalente a sincronizar `Student_id_seq` con `max(Student.id)`, acompañada por respaldo y validación.

### P0 — La API sigue completamente pública

Las pruebas confirman que los endpoints de eliminación aceptan llamadas directas sin sesión. Mientras la aplicación esté expuesta, cualquier cliente puede leer o modificar la información.

### P1 — Tailwind 4 ignora el tema personalizado

El build genera utilidades estándar, pero no genera `.text-plum`, `.bg-primary` ni el resto del tema declarado en `tailwind.config.ts`.

Evidencia en navegador:

- `text-plum` sobre el título computó `rgb(0, 0, 0)`;
- el color esperado era `rgb(88, 43, 57)`.

Esto confirma que `tailwind.config.ts` no está conectado correctamente al flujo de Tailwind 4.

### P1 — Las fechas se desplazan un día

Con `TZ=America/Argentina/Cordoba`:

```json
{
  "source": "2000-01-02",
  "iso": "2000-01-02T00:00:00.000Z",
  "display": "1/1/2000"
}
```

La aplicación utiliza justamente este patrón en cumpleaños y fechas de clase. La sección de próximos cumpleaños también usa getters locales, por lo que puede ordenar y mostrar el día equivocado.

### P1 — No hay historial de migraciones

El esquema coincide con las tablas activas, pero no existe una forma versionada de reconstruirlo ni de retirar las tablas heredadas.

### P1 — Modelo monetario incompleto

La prueba confirmó que `classPrice` persiste como `Decimal`, mientras `ovenPrice` y `materialPrice` persisten como texto. Las estadísticas continúan ignorando estos dos importes.

### P1 — CI/CD no representa el proyecto

Los workflows siguen usando Node 16, npm y un directorio `backend` inexistente. El build local demuestra que el código compila, pero la automatización actual no es confiable.

### P2 — La consulta del dashboard carga el historial completo

Los logs muestran tres consultas para cada listado:

1. todos los estudiantes;
2. todos sus meses mediante una lista de 27 IDs;
3. todas las clases de esos meses.

Es correcto para el volumen actual, pero crecerá con todo el historial y no tiene paginación.

### P2 — Latencia y middleware de desarrollo

La mayoría de los procedimientos demoraron aproximadamente entre 130 y 560 ms con el retraso artificial de desarrollo activado. `addMonth` registró una muestra anómala de unos 5,1 segundos. Hace falta repetirla sin el middleware artificial antes de concluir que existe un problema de base.

### P2 — Accesibilidad

En el dashboard cargado se observaron 27 enlaces anidados dentro de botones (`button a`). El documento sigue usando `lang="en"` y el buscador no tiene etiqueta asociada.

### P2 — Observabilidad

Prisma imprime consultas completas en desarrollo y tRPC sólo informa ruta y duración. No hay request ID, usuario, resultado estructurado ni auditoría de mutaciones sensibles.

## 9. Recorrido CRUD descartable

Para no alterar la copia principal se creó `mdceramica_scan` desde `mdceramica`.

El registro ficticio atravesó este flujo:

1. intento de alta y detección de secuencia rota;
2. corrección de secuencia sólo en la base descartable;
3. alta de estudiante;
4. edición de teléfono, día y horario;
5. alta de mes;
6. alta de clase con asistencia, precio, horno y material;
7. edición de nombre, precio y estado de pago;
8. eliminación de clase por tRPC;
9. eliminación de estudiante por tRPC;
10. comprobación de ausencia de datos ficticios.

La base `mdceramica_scan` fue eliminada al terminar. Era una réplica descartable y puede recrearse desde `mdceramica`.

## 10. Estado de la máquina tras la sincronización del 1 de septiembre de 2026

- Neon: intacto.
- PostgreSQL 17 en `5432`: identificado y restaurado con un dump fresco de producción, con autorización explícita.
- PostgreSQL provisional en `55432`: ya no estaba activo al retomar la operación.
- Base local `localhost:5432/mdceramica`: copia verificada de producción con 6 tablas, 27 estudiantes, 1 mes y 1 clase.
- `.env.local`: apunta a `127.0.0.1:5432/mdceramica` mediante el rol local `mdceramica_app`; la contraseña permanece únicamente en ese archivo ignorado por Git.
- Next.js: activo en `http://localhost:3000` contra `5432`; dashboard y detalle verificados sin errores de navegador ni consultas fallidas.
- Dump persistente: `.local-backups/mdceramica-production-2026-09-01.dump`, ignorado por Git y con permisos `600`.
- Base descartable de pruebas: eliminada.

## 11. Conclusión

El núcleo funcional es recuperable y el stack compila correctamente. Sin embargo, antes de comenzar autenticación conviene estabilizar cuatro fundamentos: secuencia de estudiantes, migraciones, fechas y Tailwind. La autenticación y los roles deben construirse inmediatamente después sobre esa base estable, manteniendo separadas la identidad (`User`) y la ficha del taller (`Student`).

## 12. Actualización de fase 0 — 1 de septiembre de 2026

- Se confirmó nuevamente en Neon el preflight `max_id=36`, `last_value=4`, `next_candidate=5` y `sequence_is_safe=false`.
- Se creó y validó el respaldo previo `.local-backups/mdceramica-pre-phase-0-2026-09-01.dump`, con permisos `600` y SHA-256 `57592e5da9770054ef3fe77c2a1171ede7581fed9f9a774a3f10362e01f4114b`.
- Se alineó `Student_id_seq` en Neon con `setval=36`.
- Una alta transaccional recibió el ID `37`, se revirtió y no dejó ninguna fila ficticia.
- Neon quedó con `max_id=36`, `last_value=37`, `next_candidate=38` y `sequence_is_safe=true`.
- La copia local principal también quedó reparada, con próxima candidata `37`.
- Se identificó el proyecto Vercel `mdceramica` y el dominio público `https://alumnas.mdceramica.ar`, que inicialmente respondía `200` sin autenticación.
- Se pausó el proyecto hasta implementar la autenticación definitiva en la fase 3. El dominio personalizado y todos los alias verificados pasaron a responder `503 DEPLOYMENT_PAUSED`.

La secuencia dejó de ser un P0 activo y el despliegue público quedó bloqueado. La fase 0 se cerró el 1 de septiembre de 2026.
