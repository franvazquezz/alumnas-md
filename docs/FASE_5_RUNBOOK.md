# Fase 5 — Separación de experiencias

**Estado:** en curso desde el 9 de septiembre de 2026. Están terminadas la
primera entrega del portal del estudiante y la separación de la ficha
administrativa de estudiante. Continúan pendientes la consolidación general del
panel administrativo y las pruebas E2E permanentes.

## Primera entrega: portal del estudiante

La navegación del rol `STUDENT` expone tres destinos:

| Ruta          | Contenido                                                    |
| ------------- | ------------------------------------------------------------ |
| `/mi-cuenta`  | perfil propio, día, horario y datos de contacto              |
| `/mis-clases` | historial de clases, asistencia, precio y cargos adicionales |
| `/mis-pagos`  | total, monto pagado, deuda y detalle por concepto            |

Las tres pantallas usan un encabezado compartido. Los datos se consultan en
Server Components mediante `getStudentPortalData`, que exige una sesión
`STUDENT`, toma el `studioId` de esa sesión y busca la ficha por
`userId + studioId`. La interfaz nunca acepta un `studentId` elegido por el
cliente.

Los cargos visibles en pagos incluyen la clase, los campos heredados no nulos
de horno o material y cada fila de `ClassCharge`. Los totales reutilizan las
reglas centrales de dinero y los estados `PENDING` y `PAID`.

## Segunda entrega: ficha administrativa de estudiante

`student-detail.tsx` quedó reducido a un contenedor de consulta y composición.
La interfaz se separó en responsabilidades independientes:

- perfil y edición de datos personales;
- administración de períodos;
- alta y edición de clases mediante campos compartidos;
- resumen de asistencia, importes y cargos adicionales.

El botón compartido ahora vive en su propio módulo y se eliminó el ciclo de
imports entre la ficha y el formulario personal. La misma extracción también
centraliza el estado de clases, corrige el reinicio del borrador después de una
mutación y evita enviar cadenas vacías como importes opcionales.

## Estados de interfaz

- una ficha sin clases muestra un estado vacío explícito en `/mis-clases`;
- una ficha sin conceptos muestra total, pagado y pendiente en cero y un estado
  vacío en `/mis-pagos`;
- una cuenta autenticada que no sea `STUDENT` vuelve a su panel autorizado;
- una cuenta sin sesión vuelve a `/login`.

## Evidencia local

Validación del 9 de septiembre de 2026 en `http://localhost:3000`:

- STUDENT abrió `/mi-cuenta`, `/mis-clases` y `/mis-pagos` y sólo recibió la
  ficha vinculada a su sesión;
- la navegación mostró los tres destinos del portal y Seguridad;
- los estados vacíos de clases y pagos se presentaron sin errores;
- ADMIN intentó abrir `/mis-clases` y fue redirigido a `/`;
- ADMIN abrió la ficha real de Gloriana Beltrame y visualizó su perfil, período,
  clase y seis cargos adicionales confirmados;
- los modos de editar alumna, agregar período, agregar clase y editar clase
  abrieron correctamente sin guardar cambios;
- los formularios compartidos de clases exponen etiquetas accesibles, la vista
  no desborda horizontalmente y el servidor no registró errores nuevos;
- `pnpm check` pasó formato, ESLint, TypeScript y 19 pruebas;
- `pnpm build` pasó con Node.js 20.19.5 y registró las tres rutas dinámicas.

## Trabajo siguiente

1. agregar pruebas de integración y E2E permanentes para el portal y la ficha;
2. completar estados de carga, error y vacío del panel administrativo;
3. continuar consolidando formularios y tarjetas administrativas;
4. revisar la política operativa de pagos antes de habilitar cualquier mutación
   para estudiantes.
