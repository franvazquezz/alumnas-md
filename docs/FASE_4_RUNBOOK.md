# Fase 4 — Autorización, talleres y rutas

**Estado:** fase cerrada localmente el 9 de septiembre de 2026. Pasaron los
controles de OWNER, ADMIN, STUDENT, cuenta sin membresía, aislamiento entre
talleres y revocación de sesión. Neon y el acceso público continúan sin cambios
hasta el despliegue controlado.

## Objetivo

Toda lectura y mutación privada debe responder en servidor quién es el usuario,
cuál es su taller activo, qué rol posee y si el recurso pertenece a ese taller.
Las redirecciones de interfaz mejoran la experiencia, pero no sustituyen estos
controles.

## Contextos de autorización

- `protectedProcedure`: exige una sesión válida y no revocada.
- `studioProcedure`: exige membresía y taller activo, y construye el contexto
  `userId + role + studioId`.
- `adminProcedure`: permite operación diaria a `OWNER` y `ADMIN`.
- `ownerProcedure`: reserva configuración del taller a `OWNER`.
- `platformProcedure`: reserva administración global a
  `User.isPlatformAdmin`.

Los procedimientos de estudiantes, períodos y clases filtran por
`studioId`. Una cuenta `STUDENT` obtiene su ficha por el `userId` de la sesión;
no puede elegir una ficha ajena enviando otro ID.

## Administración multi-taller

La migración `20260908000100_multi_studio_administration` agrega:

- taller activo por usuario;
- administrador de plataforma;
- datos configurables y estado activo del taller;
- turnos configurables en `StudioShift`;
- vínculo de ficha de estudiante único dentro de cada taller;
- auditoría en `AuditLog`.

La interfaz `/admin` permite:

- consultar el resumen y la auditoría del taller activo;
- editar datos del taller y sus turnos como OWNER;
- crear y configurar talleres como administrador de plataforma;
- administrar usuarios, roles, membresías y vínculos con fichas.

El selector de taller sólo presenta membresías activas del usuario. El cambio
se persiste en `User.activeStudioId` y se audita.

## Rutas actuales

| Ruta                | Acceso                                                       |
| ------------------- | ------------------------------------------------------------ |
| `/`                 | OWNER y ADMIN del taller activo                              |
| `/students/[id]`    | OWNER y ADMIN; el procedimiento valida pertenencia           |
| `/admin`            | OWNER o ADMIN del taller activo; administrador de plataforma |
| `/mi-cuenta`        | STUDENT del taller activo                                    |
| `/mis-clases`       | STUDENT; sólo clases de su ficha vinculada                   |
| `/mis-pagos`        | STUDENT; sólo conceptos de su ficha vinculada                |
| `/account/security` | cualquier usuario autenticado                                |

Las rutas de clases y pagos se incorporaron como primera entrega de la fase 5.

## Auditoría

Se registran creación, actualización y eliminación de estudiantes, clases,
talleres y turnos; asignación o remoción de membresías; y cambio de taller
activo. Cada evento conserva taller, actor, tipo de entidad, identificador y
metadatos mínimos.

## Protección de invariantes

- no se puede dejar un taller sin OWNER;
- no se puede quitar el último administrador de plataforma;
- un turno con estudiantes asignados debe desactivarse antes de eliminarse;
- una ficha no puede vincularse a dos usuarios dentro del mismo taller;
- una membresía STUDENT requiere una ficha del mismo taller;
- un usuario sólo puede activar un taller donde tenga membresía vigente.

## Estado de la copia local

- la migración está aplicada;
- Prisma no detecta diferencias entre base y esquema;
- formato, lint, TypeScript, 19 pruebas y build pasan con Node.js 20.19.5;
- las cinco migraciones reconstruyen un esquema PostgreSQL temporal sin drift;
- el OWNER inicial local está creado, verificado y es administrador de
  plataforma;
- existen cuentas QA verificadas para ADMIN y STUDENT;
- el servidor de validación usa `http://localhost:3000`.

## Evidencia de navegador del 9 de septiembre

- sin sesión, `/`, `/admin` y `/students/37` redirigen a `/login`;
- OWNER inicia y cierra sesión, abre la administración global y cambia entre
  `MD Cerámica` y un taller QA aislado;
- ADMIN ve y opera las 28 fichas de `MD Cerámica`, accede a `/admin` sin recibir
  configuración de OWNER o plataforma y no puede leer la ficha 38 del otro
  taller;
- STUDENT inicia sesión en `/mi-cuenta`, ve únicamente su ficha vinculada y al
  abrir `/admin`, `/students/37` o `/students/38` vuelve a `/mi-cuenta`;
- al retirar temporalmente la membresía de una cuenta ADMIN QA, la siguiente
  petición a `/admin` elimina su sesión persistida y redirige a `/login`;
- un nuevo intento de ingreso de esa cuenta sin membresías es rechazado con
  `CredentialsSignin`; después de la prueba se restauró su membresía ADMIN y se
  eliminaron las sesiones residuales QA;
- los cambios de taller, creación de talleres, altas de fichas y asignaciones
  aparecen en la auditoría;
- la página carga contenido, sin overlay de Next.js ni errores de navegador.

La prueba reveló y corrigió tres defectos:

1. el alta de estudiantes enviaba cumpleaños vacío como una fecha inválida;
2. el enlace a Administración se ocultaba para el rol ADMIN aunque la ruta sí
   lo admitía;
3. los scripts de bootstrap e invitaciones no cargaban `.env.local` de forma
   autónoma.

## Controles de aceptación

- [x] crear el OWNER inicial y comprobar inicio/cierre de sesión;
- [x] comprobar que OWNER configura su taller y puede cambiar entre talleres;
- [x] comprobar que ADMIN opera sólo dentro de su taller;
- [x] comprobar que STUDENT llega a `/mi-cuenta` y no a paneles administrativos;
- [x] intentar leer una ficha ajena alterando URL o payload;
- [x] intentar operar con un usuario sin membresía;
- [x] comprobar revocación de sesión después de retirar una membresía;
- [x] comprobar auditoría de operaciones sensibles;
- [x] repetir calidad y build con Node.js 20;
- [x] documentar la evidencia disponible;
- [x] cerrar la fase.
