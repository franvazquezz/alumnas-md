# Fase 0 — Runbook operativo

**Objetivo:** aislar desarrollo, reparar la secuencia de estudiantes y restringir temporalmente el acceso público mientras no exista autenticación.

## 1. Estado de partida

- Neon contiene 27 estudiantes.
- `MAX("Student".id) = 36`.
- Antes de la intervención, `Student_id_seq.last_value = 4` y la próxima alta intentaba usar el ID 5.
- Desde el 1 de septiembre de 2026, Neon está reparado y la próxima alta real usará el ID 38.
- `Month_id_seq` y `Class_id_seq` están alineadas.
- La primera copia local verificada estuvo provisionalmente en `127.0.0.1:55432/mdceramica`.
- `localhost:5432` pertenece a PostgreSQL 17 instalado en `/Library/PostgreSQL/17`.
- Desde el 1 de septiembre de 2026, `localhost:5432/mdceramica` contiene una restauración exacta y verificada del dump fresco de producción.
- La copia local también tiene `Student_id_seq` alineada; su próxima alta usará el ID 37.

La inspección y la autorización para reemplazar la base de `5432` ya fueron completadas. El estado anterior se documenta más abajo como evidencia histórica.

## 2. Archivos operativos

- Preflight y postflight: `ops/sql/phase-0/check-student-sequence.sql`.
- Reparación: `ops/sql/phase-0/repair-student-sequence.sql`.
- Inventario de la base existente en `5432`: `ops/sql/phase-0/inspect-local-mdceramica.sql`.

## 3. Preflight obligatorio

Ejecutar sobre la base que se pretende modificar:

```sql
SELECT
  current_database() AS database,
  current_user AS database_user,
  current_setting('server_version') AS postgres_version,
  inet_server_addr() AS server_address,
  inet_server_port() AS server_port;
```

Luego ejecutar `check-student-sequence.sql`.

Estado esperado antes de reparar Neon:

```text
max_id=36
last_value=4
is_called=true
next_candidate=5
sequence_is_safe=false
```

Si los valores no coinciden, detenerse y volver a generar el diagnóstico. No aplicar el SQL basándose en cifras antiguas.

## 4. Respaldo previo

Generar un dump nuevo inmediatamente antes de la intervención:

```bash
umask 077
pg_dump \
  --dbname "$DATABASE_URL" \
  --format=custom \
  --no-owner \
  --no-privileges \
  --file=/private/tmp/mdceramica-pre-phase-0.dump
```

Validar:

```bash
pg_restore --list /private/tmp/mdceramica-pre-phase-0.dump
shasum -a 256 /private/tmp/mdceramica-pre-phase-0.dump
```

El archivo debe tener permisos `600` y no debe subirse al repositorio. En esta máquina se usa `.local-backups/`, que está ignorada por Git, porque `/private/tmp` puede limpiarse entre sesiones.

## 5. Aplicación de la reparación

El SQL exacto es:

```sql
BEGIN;

LOCK TABLE "Student" IN ACCESS EXCLUSIVE MODE;

SELECT setval(
  pg_get_serial_sequence('"Student"', 'id'),
  GREATEST(COALESCE((SELECT MAX(id) FROM "Student"), 0), 1),
  EXISTS(SELECT 1 FROM "Student")
);

COMMIT;
```

La tabla permanece bloqueada únicamente durante la lectura de `MAX(id)` y la actualización de la secuencia. El script no modifica filas de estudiantes.

## 6. Postflight

Ejecutar nuevamente `check-student-sequence.sql`.

Con los datos actuales, el resultado esperado es:

```text
max_id=36
last_value=36
is_called=true
next_candidate=37
sequence_is_safe=true
```

Después:

1. hacer una alta controlada desde la aplicación;
2. confirmar que obtiene un ID mayor a 36;
3. comprobar que dashboard y detalle cargan;
4. decidir si el registro de validación se conserva o se elimina.

## 7. Rollback

Antes de aplicar el cambio se deben guardar `last_value` e `is_called` obtenidos en el preflight.

La reversión técnica sería:

```sql
SELECT setval(
  pg_get_serial_sequence('"Student"', 'id'),
  4,
  true
);
```

Con el estado actual **no se recomienda ejecutar este rollback**, porque devolvería la secuencia a una condición rota. Se conserva únicamente como reversión exacta del cambio operacional.

Si apareciera cualquier problema de datos, el rollback real debe ser restaurar el dump previo en una base nueva, comparar y sólo entonces decidir un reemplazo.

## 8. Acceso público temporal

Antes de habilitar nuevas altas en producción hay que confirmar dónde está desplegada la aplicación y si su URL es accesible sin control de red.

Hasta implementar autenticación:

- opción preferida: restringir el despliegue mediante protección de plataforma o red;
- alternativa transitoria: una barrera de acceso completa en servidor;
- nunca confiar únicamente en ocultar botones o rutas del frontend.

## 9. Condición de cierre de fase 0

**Estado: cerrada el 1 de septiembre de 2026.**

- [x] desarrollo usa sólo una copia local;
- [x] el destino local de `5432` está identificado y sincronizado desde un dump fresco de producción;
- [x] Neon tiene respaldo reciente;
- [x] `Student_id_seq` está alineada;
- [x] una alta controlada funciona;
- [x] la aplicación pública tiene restricción temporal;
- [x] la evidencia quedó agregada al segundo escaneo.

## 10. Evidencia del ensayo local

El script fue ejecutado sobre una clon descartable llamada `mdceramica_phase0`.

### Preflight

```text
max_id=36
last_value=4
is_called=true
next_candidate=5
sequence_is_safe=false
```

### Primer ejecución

```text
setval=36
next_candidate=37
sequence_is_safe=true
```

### Segunda ejecución

El script volvió a devolver `setval=36`, demostrando que no continúa avanzando la secuencia cuando los datos no cambian.

### Alta controlada

Una inserción dentro de una transacción recibió ID `37`. La transacción se revirtió y se comprobó que no quedó ninguna fila de prueba.

La clon `mdceramica_phase0` fue eliminada al terminar. La copia principal y Neon permanecieron intactos.

## 11. Intervención controlada del 1 de septiembre de 2026

### Neon

El preflight se repitió inmediatamente antes de intervenir y confirmó:

```text
max_id=36
last_value=4
is_called=true
next_candidate=5
sequence_is_safe=false
```

Se creó un respaldo fresco en `.local-backups/mdceramica-pre-phase-0-2026-09-01.dump`. El archivo quedó ignorado por Git, con permisos `600`, tamaño de 15.536 bytes y SHA-256 `57592e5da9770054ef3fe77c2a1171ede7581fed9f9a774a3f10362e01f4114b`. `pg_restore --list` terminó correctamente.

La reparación devolvió `setval=36`. El postflight inmediato confirmó:

```text
max_id=36
last_value=36
is_called=true
next_candidate=37
sequence_is_safe=true
```

Una alta transaccional de validación recibió el ID `37` y luego se ejecutó `ROLLBACK`. Se comprobó que no quedó ninguna fila ficticia. Como las secuencias de PostgreSQL no son transaccionales, el estado final quedó así:

```text
max_id=36
last_value=37
is_called=true
next_candidate=38
sequence_is_safe=true
```

### Copia local principal

La misma reparación se aplicó sobre `127.0.0.1:5432/mdceramica`. El estado final local es `max_id=36`, `last_value=36`, `next_candidate=37` y `sequence_is_safe=true`.

## 12. Pendientes externos

### PostgreSQL de `5432` — inspección previa

El servicio fue identificado como PostgreSQL 17 instalado en `/Library/PostgreSQL/17`. La base `mdceramica` está abierta actualmente desde DBeaver con el usuario `postgres`.

El acceso desde terminal requiere una contraseña que no se extrajo de DBeaver ni se solicitó por chat. El inventario de sólo lectura sí se ejecutó el 31 de agosto de 2026 aprovechando la conexión ya autenticada de DBeaver.

La inspección confirmó que esta base no es una copia vacía ni coincide con el modelo Prisma actual:

- contenía 12 tablas públicas: `AttendanceSlot`, `ChargeItem`, `Class`, `MakeupCredit`, `Month`, `MonthlyEnrollment`, `Payment`, `SessionVisit`, `Student`, `StudentClass`, `classes` y `students`;
- `Student.id` es de tipo UUID, mientras que el proyecto actual espera un entero autoincremental;
- por lo tanto, se generó y validó un respaldo independiente antes de autorizar el reemplazo.

El primer inventario asumía IDs numéricos y falló al intentar `MAX(Student.id)`. El SQL quedó corregido para inspeccionar tipos, secuencias y estadísticas desde los catálogos sin hacer esa suposición. DBeaver también mostró una inconsistencia entre su árbol cacheado y el servidor para `MapucheCredit`; el bloque final fue reemplazado por `pg_stat_user_tables` para no depender de nombres fijos.

### Sincronización local ejecutada el 1 de septiembre de 2026

- Producción se leyó mediante `pg_dump`; no recibió escrituras.
- El dump fresco quedó en `.local-backups/mdceramica-production-2026-09-01.dump`, con permisos `600` y SHA-256 `5745de3c51722be7cdd1e88b5d09b16da4ecd3b6df6b5e0a161d187402c09a4b`.
- Se eliminó exclusivamente el esquema `public` de `localhost:5432/mdceramica` y se restauró el dump con `--no-owner`.
- La restauración final terminó sin errores.
- La comprobación local devolvió las tablas `Class`, `Month`, `Student`, `StudentClass`, `classes` y `students`; 27 estudiantes, 1 mes y 1 clase.
- Al restaurar, `MAX(Student.id)=36` y `Student_id_seq.last_value=4`, por lo que la copia reproducía también la secuencia rota de producción. La reparación se ejecutó después como un paso separado y quedó documentada en la sección 11.

El respaldo previo de la base local había sido creado y validado en `/private/tmp`, pero macOS limpió esa carpeta antes de reanudar la operación. La clon provisional de `55432` tampoco estaba activa al retomar. Por eso ese artefacto temporal anterior ya no está disponible; el dump actual de producción se movió a una ubicación persistente e ignorada por Git para evitar que vuelva a ocurrir.

Se creó el rol local `mdceramica_app`, con acceso restringido a esta base y propiedad sobre la base, el esquema público, sus tablas, secuencias y tipos. La contraseña aleatoria se guardó únicamente en `.env.local`, que está ignorado por Git; no se extrajo ninguna credencial de DBeaver.

La conexión desde terminal se verificó como `mdceramica_app` y devolvió 27 estudiantes, 1 mes y 1 clase. La aplicación se reinició en `http://localhost:3000` usando `localhost:5432/mdceramica`: el dashboard y el detalle de una alumna respondieron `200`, las consultas Prisma se ejecutaron contra la copia local y no aparecieron errores de consola ni overlays de Next.js.

### Despliegue público

El proyecto Vercel fue identificado mediante su integración con GitHub:

- equipo: `franvazquezzs-projects`;
- proyecto: `mdceramica`;
- repositorio vinculado: `franvazquezz/alumnas-md`;
- dominio público: `https://alumnas.mdceramica.ar`;
- alias público: `https://mdceramica.vercel.app`.

El 1 de septiembre de 2026 ambos dominios y los alias de proyecto respondieron inicialmente `200` sin autenticación. También se encontraron despliegues de producción registrados hasta el 17 de enero de 2026 y un preview exitoso del 2 de junio de 2026.

El plan Hobby sólo ofrecía `Standard Protection`, que excluye los dominios personalizados de producción. La protección total y la protección por contraseña requerían un plan pago, por lo que no resolvían el riesgo inmediato sin ampliar costos o construir una autenticación temporal.

Se pausó el proyecto `mdceramica` hasta implementar la autenticación definitiva en la fase 3. La verificación externa posterior confirmó `503` con `x-vercel-error: DEPLOYMENT_PAUSED` en `https://alumnas.mdceramica.ar`, `https://mdceramica.vercel.app` y los alias de proyecto. La aplicación y su API ya no aceptan tráfico público.
