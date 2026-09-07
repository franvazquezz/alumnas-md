# Fase 2 — Reglas de dominio confiables

**Estado:** implementación y verificación completas el 2 de septiembre de 2026;
despliegue de la migración pendiente.

## Decisiones de dominio

- `birthday` y `classDay` continúan siendo columnas PostgreSQL `DATE`, pero la
  API las convierte de forma centralizada a `AAAA-MM-DD`. La interfaz nunca las
  interpreta como instantes locales.
- La fecha operativa del taller usa `America/Argentina/Cordoba`.
- `classPrice`, `ovenPrice` y `materialPrice` son `Decimal(12,2)`, con mínimo
  cero. El total incluye los tres conceptos.
- Cada concepto tiene un estado explícito `PENDING` o `PAID`. La deuda es el
  total menos la suma de conceptos pagados.
- `Student.weekday` usa el enum `Weekday`; `Month` se identifica mediante
  `year + month`; `Student.isActive` permite conservar fichas inactivas.

## Migración

La migración `20260902000100_domain_rules`:

1. convierte los días de texto conocidos al enum `Weekday`;
2. deriva `year` y `month` de las etiquetas existentes;
3. convierte importes válidos, incluida la coma decimal, a `Decimal(12,2)`;
4. conserva los booleanos de pago como estados explícitos;
5. aborta si detecta importes negativos o textos monetarios no convertibles;
6. añade checks para año, mes e importes no negativos.

Antes de aplicarla a una base persistente:

```sql
SELECT id, "ovenPrice", "materialPrice"
FROM "Class"
WHERE
  (trim("ovenPrice") <> '' AND
   trim(replace("ovenPrice", ',', '.')) !~ '^[0-9]+([.][0-9]{1,2})?$')
  OR
  (trim("materialPrice") <> '' AND
   trim(replace("materialPrice", ',', '.')) !~ '^[0-9]+([.][0-9]{1,2})?$')
  OR "classPrice" < 0;
```

La consulta debe devolver cero filas. Después se debe crear un respaldo y
ejecutar:

```bash
pnpm db:migrate
pnpm exec prisma migrate status
pnpm exec prisma migrate diff \
  --from-config-datasource \
  --to-schema prisma/schema.prisma --exit-code
```

## Evidencia de verificación

- historial completo aplicado a una base PostgreSQL 18 vacía: pasa;
- comparación Prisma posterior: `No difference detected`;
- migración con un registro heredado ficticio: fecha sin desplazamiento, día y
  período estructurados, coma decimal convertida y estados preservados;
- 8 pruebas unitarias de fechas, Córdoba, dinero, deuda y agenda: pasan;
- lint, TypeScript, formato, build y tema CSS: pasan;
- navegador: dashboard y detalle cargan; tRPC lee y actualiza PostgreSQL; la
  fecha opcional se puede borrar; no hay errores de consola.

## Despliegue pendiente

La operación sobre la copia local real fue deliberadamente omitida porque el
destino derivado de `.env.local` no pudo validarse de manera independiente. No
se modificó Neon. Al desplegar, verificar explícitamente host, base y usuario,
crear un respaldo nuevo, aplicar la migración primero en la copia local y
recién después repetir el procedimiento en Neon.
