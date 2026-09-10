# Fase 2 — Reglas de dominio confiables

**Estado:** corrección aplicada y verificada sobre la copia local. Los cuatro
cargos ambiguos fueron confirmados por el OWNER el 9 de septiembre de 2026.
El despliegue sobre Neon continúa pendiente.

## Decisiones de dominio

- `birthday` y `classDay` continúan siendo columnas PostgreSQL `DATE`, pero la
  API las convierte de forma centralizada a `AAAA-MM-DD`. La interfaz nunca las
  interpreta como instantes locales.
- La fecha operativa del taller usa `America/Argentina/Cordoba`.
- `classPrice` usa `Decimal(12,2)`, con mínimo cero.
- Los cargos adicionales de horno y materiales se guardan por separado en
  `ClassCharge`, con tipo, descripción, importe, estado de pago y marca de
  revisión.
- Cada concepto tiene un estado explícito `PENDING` o `PAID`. La deuda incluye
  la clase y todos sus cargos adicionales.
- `Student.weekday` usa el enum `Weekday`; `Month` se identifica mediante
  `year + month`; `Student.isActive` permite conservar fichas inactivas.

## Incidente detectado durante la primera aplicación

La primera ejecución sobre `127.0.0.1:5432/mdceramica` encontró listas de
importes legítimos dentro de `ovenPrice` y `materialPrice`. La versión inicial
esperaba un único decimal y abortó la transacción sin aplicar cambios
parciales.

La migración se corrigió antes de aplicarla en Neon. La tabla
`_prisma_migrations` de la copia local conserva el intento fallido como
evidencia y registra después una ejecución exitosa con el checksum corregido.

## Migración corregida

La migración `20260902000100_domain_rules`:

1. convierte los días de texto conocidos al enum `Weekday`;
2. deriva `year` y `month` de las etiquetas existentes;
3. convierte `classPrice` a `Decimal(12,2)` y conserva sus estados de pago;
4. crea una fila `ClassCharge` por cada importe adicional heredado;
5. conserva el texto original completo en `legacyDetail`;
6. marca `needsReview` cuando la cantidad de descripciones e importes no
   coincide o un token no es convertible;
7. añade checks para año, mes e importes no negativos.

Los campos escalares heredados de horno y materiales quedan en cero cuando su
contenido fue trasladado a cargos separados. Esto evita contabilizar el mismo
importe dos veces.

## Resultado en la copia local

La migración corregida y las migraciones de autenticación y administración se
aplicaron el 8 de septiembre de 2026 a las 21:15. Prisma informa cinco
migraciones conocidas, base actualizada y `No difference detected` entre la
base y `prisma/schema.prisma`.

Conteos posteriores:

| Recurso                       | Cantidad |
| ----------------------------- | -------: |
| Estudiantes                   |       27 |
| Clases                        |        1 |
| Cargos adicionales            |        6 |
| Cargos que requieren revisión |        0 |

## Revisión de cargos heredados

Los dos cargos de horno pudieron vincularse sin ambigüedad:

| Descripción                   |  Importe | Estado    |
| ----------------------------- | -------: | --------- |
| Cuenco bisc                   | 1.500,00 | Pendiente |
| florero y piezas chicas bisch | 3.800,00 | Pendiente |

La única clase que requirió revisión contenía estos textos originales:

```text
Descripciones: Pasta 1900 kg, engobe amar, pasta1200kg ox mg
Importes:      4180, 1500, 500, 2760
```

La migración preservó los cuatro importes y los marcó para revisión porque hay
tres segmentos descriptivos. El OWNER confirmó esta asociación en la copia
local:

| Descripción final |  Importe | Revisión   |
| ----------------- | -------: | ---------- |
| Pasta 1.900/kg    | 4.180,00 | Confirmada |
| Engobe amarillo   | 1.500,00 | Confirmada |
| Óxido Mg          |   500,00 | Confirmada |
| Pasta 1.200/kg    | 2.760,00 | Confirmada |

La corrección se ejecutó en una transacción, dejó los cuatro registros con
`needsReview = false`, conservó `legacyDetail` y agregó una entrada de
auditoría. No quedan cargos pendientes de revisión en la copia local.

La migración idempotente
`20260909000100_confirm_legacy_material_charges` reproduce la asociación en
otros entornos. Sólo modifica datos si encuentra exactamente los cuatro cargos
originales; un estado parcial aborta la migración para evitar asociaciones
silenciosas.

## Verificaciones

- formato, ESLint y TypeScript: pasan;
- 19 pruebas unitarias: pasan;
- build de Next.js: pasa;
- estado de seis migraciones locales: actualizado;
- comparación de esquema local: sin diferencias;
- historial previo reconstruido el 9 de septiembre en un esquema PostgreSQL
  temporal: las primeras cinco migraciones pasan y no dejan drift;
- `pnpm check` y `pnpm build` repetidos con Node.js 20.19.5: pasan.

El esquema temporal se eliminó al terminar la verificación.

## Despliegue pendiente

Neon no fue modificado. Antes de aplicarle esta fase:

1. reconstruir el historial completo en una base descartable;
2. verificar host, base y usuario de producción;
3. crear un respaldo fresco;
4. ejecutar `pnpm db:migrate`, `prisma migrate status` y `prisma migrate diff`;
5. aplicar en producción la misma asociación confirmada y verificar que no
   queden cargos con `needsReview = true`.
