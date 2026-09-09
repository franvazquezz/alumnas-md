# Plan de reconstrucción de MD Cerámica

**Estado:** propuesto después del segundo escaneo  
**Objetivo:** convertir el MVP actual en una plataforma segura para la administradora del taller y sus alumnas/os.

## 1. Principios del trabajo

1. Producción no se usa para desarrollo ni pruebas.
2. Todo cambio de esquema se expresa mediante una migración versionada.
3. La autorización se valida en servidor y por recurso, no sólo ocultando pantallas.
4. `User` representa identidad; `Student` representa la ficha académica y administrativa.
5. Una ficha de estudiante puede existir sin una cuenta de acceso.
6. Las cuentas de estudiantes se crean mediante invitación y se vinculan a una ficha existente.
7. Cada fase debe terminar con pruebas y una condición de aceptación clara.

## 2. Modelo de acceso propuesto

### Roles iniciales

| Rol       | Alcance                                                                |
| --------- | ---------------------------------------------------------------------- |
| `OWNER`   | Configuración del taller, usuarios, roles, estudiantes, clases y pagos |
| `ADMIN`   | Operación diaria de estudiantes, clases, asistencia y pagos            |
| `STUDENT` | Consulta únicamente sus propios datos habilitados                      |

No conviene guardar el rol directamente como única propiedad global de `User`. Es preferible una pertenencia al taller para que los permisos tengan contexto.

### Entidades de identidad

```mermaid
erDiagram
    USER ||--o{ ACCOUNT : authenticates_with
    USER ||--o{ SESSION : has
    USER ||--o{ MEMBERSHIP : belongs_through
    STUDIO ||--o{ MEMBERSHIP : has
    USER o|--o| STUDENT : may_link_to
    STUDIO ||--o{ STUDENT : manages
    STUDENT ||--o{ MONTH : has
    MONTH ||--o{ CLASS : contains

    USER {
      string id
      string email
      string name
      datetime emailVerified
    }
    MEMBERSHIP {
      int userId
      int studioId
      enum role
    }
    STUDENT {
      int id
      int studioId
      int userId_optional
    }
```

Entidades concretas previstas:

- `User`;
- `Account` para Google y otros proveedores;
- `Session`;
- token de verificación y recuperación;
- `Studio`;
- `Membership` con rol;
- `Invitation` para vincular alumnas existentes;
- `Student.userId` opcional y único.

## 3. Fase 0 — Cerrar riesgos operativos inmediatos

**Estado:** cerrada el 1 de septiembre de 2026. Neon y la copia local tienen `Student_id_seq` alineada, la alta transaccional fue validada y el proyecto Vercel permanece pausado hasta implementar la autenticación definitiva en la fase 3.

### Trabajo

1. Confirmar qué servicio ocupa `5432` y decidir si se reutiliza o se reemplaza.
2. Mantener `.env.local` apuntando únicamente a una copia local.
3. Preparar una corrección de `Student_id_seq`.
4. Respaldar Neon y aplicar la corrección en una ventana controlada.
5. Confirmar una alta real o una transacción de prueba después del arreglo.
6. Restringir temporalmente el acceso público a la aplicación mientras no exista autenticación.

### Condición de aceptación

- Neon puede crear un estudiante sin colisión de ID.
- Ningún entorno de desarrollo apunta accidentalmente a producción.
- La aplicación pública no admite mutaciones anónimas desde Internet.

## 4. Fase 1 — Base técnica reproducible

**Estado:** cerrada el 1 de septiembre de 2026. El baseline y la limpieza
heredada fueron validados desde cero y aplicados en la copia local y Neon. La
pipeline, el tema Tailwind 4, el formato y la documentación quedaron
versionados. El proyecto Vercel continúa pausado hasta la autenticación.

### Trabajo

1. Crear una migración inicial que refleje las tablas activas.
2. Registrar el estado inicial en `_prisma_migrations` de forma segura.
3. Crear una migración separada para retirar las tablas heredadas vacías.
4. Corregir la integración de Tailwind 4 con el tema MD Cerámica.
5. Corregir los seis archivos fuera de formato.
6. Sustituir los workflows por una pipeline única con pnpm y Node compatible.
7. Añadir un README real con configuración local, migraciones y despliegue.

### Condición de aceptación

- Una base vacía puede reconstruirse sólo desde el repositorio.
- `typecheck`, lint, formato y build pasan en local y CI.
- Los colores personalizados tienen pruebas visuales o de CSS generado.

## 5. Fase 2 — Reglas de dominio confiables

**Estado:** reabierta el 8 de septiembre de 2026. La primera aplicación sobre
la copia local detectó que `ovenPrice` y `materialPrice` contienen listas de
cargos legítimos dentro de una misma clase. La migración se detuvo sin cambios
parciales y debe corregirse antes de volver a aplicarla o avanzar sobre Neon.

### Fechas

1. Representar cumpleaños y fecha de clase como fecha de calendario sin conversión UTC implícita.
2. Centralizar parseo y presentación.
3. Permitir establecer y borrar fechas opcionales.
4. Probar explícitamente `America/Argentina/Cordoba`.

### Dinero

1. Definir si el total incluye clase, horno y materiales.
2. Convertir todos los importes individuales a `Decimal`.
3. Definir precisión, escala, mínimos y estados de pago.
4. Centralizar el cálculo de deuda y total pagado.

### Cargos múltiples por clase

- Una clase de una alumna puede contener cero o más cargos adicionales.
- Cada cargo tiene tipo (`OVEN` o `MATERIAL`), detalle, precio y estado de pago.
- Los cargos de horno conservan cada pieza o conjunto por separado.
- Los cargos de materiales conservan cada consumo por separado: esmalte,
  engobe, molde, pasta, barbotina u otro concepto.
- No se suman cargos durante la migración ni se guarda una lista dentro de un
  campo de texto o un único importe.
- Los textos heredados que no permiten asociar inequívocamente detalle y precio
  deben conservarse y quedar identificados para revisión del OWNER.

### Carga operativa del OWNER

La interfaz debe optimizarse para grupos habituales de cuatro o cinco alumnas:

1. El OWNER elige fecha y horario una sola vez.
2. La aplicación precarga las alumnas habituales de ese horario y sus precios
   de clase.
3. La asistencia comienza seleccionada y el OWNER corrige sólo las ausencias.
4. Horno y materiales se agregan como filas rápidas dentro de cada alumna, con
   tipo, detalle, precio y pago.
5. Un único botón guarda toda la clase mediante una transacción.

La primera implementación puede crear las clases individuales de cada alumna
en lote; no requiere introducir una entidad grupal adicional hasta que exista
un caso de uso que la necesite.

### Agenda

1. Convertir `day` en enum o valor estructurado.
2. Reemplazar `Month.label` como identidad por `year + month` o un período equivalente.
3. Definir orden estable de meses y clases.
4. Añadir estado activo/inactivo para estudiantes.

### Condición de aceptación

- No hay desplazamientos de fechas.
- Todos los totales se calculan desde importes numéricos válidos.
- Cada cargo de horno o material continúa visible y cobrable por separado.
- Períodos y días no dependen de texto libre.

## 6. Fase 3 — Autenticación

**Estado:** implementación completa el 7 de septiembre de 2026. NextAuth,
credenciales, Google, invitaciones, verificación, recuperación, rate limiting y
sesiones revocables fueron incorporados y validados sobre una base descartable.
Quedan pendientes la configuración de secretos/proveedores y el despliegue
controlado. La aplicación pública debe continuar pausada hasta completar la
autorización por rol y taller de la fase 4.

La aplicación controlada de esta fase queda bloqueada hasta corregir y completar
la migración reabierta de la fase 2.

### Requisitos

- correo y contraseña;
- acceso con Google;
- verificación de correo;
- recuperación de contraseña;
- vinculación segura de cuentas OAuth y correo;
- sesiones revocables;
- protección contra fuerza bruta y abuso.

### Trabajo

1. Evaluar una biblioteca compatible con Next.js, Prisma y PostgreSQL actuales.
2. Implementar el nuevo esquema de identidad mediante migración.
3. Crear login, registro por invitación, verificación y recuperación.
4. Usar hashing moderno para contraseñas; nunca guardar contraseñas reversibles.
5. Añadir rate limiting para login y recuperación.
6. Crear cierre de sesión y revocación de sesiones.

### Condición de aceptación

- Google y correo/contraseña funcionan de extremo a extremo.
- Una alumna no puede registrarse libremente contra una ficha ajena.
- Las sesiones inválidas o revocadas no acceden a rutas protegidas.

## 7. Fase 4 — Autorización y rutas

**Estado:** iniciada el 8 de septiembre de 2026. La siguiente entrega agrega
contexto obligatorio de membresía, rol y taller a los procedimientos del
servidor y filtra cada recurso por ese contexto.

### Rutas sugeridas

```text
/(auth)/login
/(auth)/invite/[token]
/(admin)/admin
/(admin)/admin/students/[id]
/(student)/mi-cuenta
/(student)/mis-clases
/(student)/mis-pagos
```

### Backend

1. Crear `protectedProcedure`.
2. Crear autorización por rol y taller.
3. Resolver la ficha del estudiante desde la sesión, no desde un ID enviado por el cliente.
4. Validar pertenencia en cada lectura y mutación.
5. Auditar operaciones sensibles: pagos, roles, invitaciones y eliminaciones.

### Regla central

Una ruta protegida mejora la experiencia, pero no reemplaza la autorización del procedimiento. Toda consulta debe responder simultáneamente:

- ¿quién es el usuario?;
- ¿a qué taller pertenece?;
- ¿qué rol posee?;
- ¿puede actuar sobre este recurso concreto?

### Condición de aceptación

- Un usuario anónimo no lee datos privados.
- Un estudiante no puede consultar otro `studentId` modificando URL o payload.
- Un administrador no puede operar fuera de su taller.

## 8. Fase 5 — Separación de experiencias

### Panel administrativo

- estudiantes y estados;
- agenda y asistencia;
- cargos y pagos;
- invitaciones y cuentas vinculadas;
- reportes básicos;
- auditoría.

### Panel del estudiante

- perfil propio;
- próximas clases e historial;
- asistencia;
- detalle de cargos y pagos;
- datos del taller;
- configuración de cuenta.

### Refactor de interfaz

1. Dividir `student-detail.tsx`.
2. Eliminar el ciclo de imports del botón.
3. Reutilizar formularios y tarjetas existentes o retirar código muerto.
4. Corregir etiquetas, semántica, `lang="es"` y enlaces dentro de botones.
5. Añadir estados de carga, error y vacío consistentes.

## 9. Fase 6 — Pruebas, observabilidad y despliegue

### Pirámide de pruebas

- unitarias para fechas, dinero y permisos;
- integración para tRPC + Prisma;
- end-to-end para login, invitación y paneles;
- pruebas negativas de acceso entre estudiantes;
- prueba de migración sobre una copia anonimizada.

### Observabilidad

- logs estructurados con request ID y usuario;
- auditoría de mutaciones sensibles;
- monitoreo de errores;
- métricas de latencia y fallos;
- política de respaldo y recuperación.

### Condición de aceptación

- CI bloquea merge ante fallos.
- El despliegue aplica migraciones de forma controlada.
- Existe rollback documentado.
- Los flujos críticos tienen evidencia end-to-end.

## 10. Matriz inicial de permisos

| Acción                   | Owner |     Admin      |    Student    |
| ------------------------ | :---: | :------------: | :-----------: |
| Ver estudiantes          |  Sí   |       Sí       | Sólo su ficha |
| Crear/editar estudiantes |  Sí   |       Sí       |      No       |
| Eliminar o dar de baja   |  Sí   | Según política |      No       |
| Gestionar clases         |  Sí   |       Sí       |      No       |
| Ver clases               |  Sí   |       Sí       | Sólo propias  |
| Gestionar pagos          |  Sí   |       Sí       |      No       |
| Ver pagos                |  Sí   |       Sí       | Sólo propios  |
| Invitar usuarios         |  Sí   |       Sí       |      No       |
| Cambiar roles            |  Sí   |       No       |      No       |
| Configurar taller        |  Sí   |       No       |      No       |

Esta matriz debe confirmarse antes de implementar autorización.

## 11. Decisiones necesarias antes de la fase de autenticación

1. ¿Habrá un solo taller o se quiere soportar más de uno en el futuro?
2. ¿Las cuentas de estudiantes serán exclusivamente por invitación?
3. ¿Qué información económica podrá ver una alumna?
4. ¿Una alumna podrá editar datos personales o sólo solicitarlos?
5. ¿`ADMIN` puede eliminar registros o sólo marcarlos inactivos?
6. ¿Se necesita un rol docente separado de administración?
7. ¿Qué historial debe conservarse cuando una alumna deja el taller?

## 12. Orden recomendado de ejecución

```text
Secuencia y aislamiento local
        ↓
Migraciones + Tailwind + CI
        ↓
Fechas + dinero + períodos
        ↓
Modelo User/Studio/Membership
        ↓
Login Google y correo/contraseña
        ↓
Autorización tRPC por recurso
        ↓
Panel admin + panel estudiante
        ↓
Pruebas E2E + despliegue controlado
```

El primer cambio de implementación debería ser pequeño y reversible: corregir la secuencia en un procedimiento controlado, establecer la migración base y eliminar cualquier conexión de desarrollo directa a Neon.
