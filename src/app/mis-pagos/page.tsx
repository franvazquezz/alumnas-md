import { StudentPortalShell } from "~/app/_components/student-portal-shell";
import { calculateFinancialSummary, formatMoney } from "~/lib/domain/money";
import { getStudentPortalData } from "~/server/student-portal";
import { formatMonth } from "~/types/utils";

export default async function MyPaymentsPage() {
  const { student, studio } = await getStudentPortalData();
  const concepts =
    student?.months.flatMap((month) =>
      month.classes.flatMap((classItem) => {
        const detail = `${classItem.className} · ${formatMonth(month.year, month.month)}`;
        const legacyCharges = [
          ...(Number(classItem.ovenPrice) > 0
            ? [
                {
                  id: `oven-${classItem.id}`,
                  label: classItem.ovenName ?? "Cargo de horno",
                  detail,
                  amount: classItem.ovenPrice.toFixed(2),
                  status: classItem.ovenPaymentStatus,
                },
              ]
            : []),
          ...(Number(classItem.materialPrice) > 0
            ? [
                {
                  id: `material-${classItem.id}`,
                  label: classItem.materialName ?? "Cargo de material",
                  detail,
                  amount: classItem.materialPrice.toFixed(2),
                  status: classItem.materialPaymentStatus,
                },
              ]
            : []),
        ];

        return [
          {
            id: `class-${classItem.id}`,
            label: classItem.className,
            detail: formatMonth(month.year, month.month),
            amount: classItem.classPrice.toFixed(2),
            status: classItem.classPaymentStatus,
          },
          ...legacyCharges,
          ...classItem.charges.map((charge) => ({
            id: `charge-${charge.id}`,
            label:
              charge.description ??
              (charge.type === "OVEN" ? "Cargo de horno" : "Cargo de material"),
            detail,
            amount: charge.price.toFixed(2),
            status: charge.paymentStatus,
          })),
        ];
      }),
    ) ?? [];
  const summary = calculateFinancialSummary(concepts);

  return (
    <StudentPortalShell
      studioName={studio?.name}
      title="Mis pagos"
      description="Revisá lo abonado, el saldo pendiente y el detalle de cada concepto."
    >
      <section className="grid gap-4 sm:grid-cols-3">
        {[
          ["Total", summary.total],
          ["Pagado", summary.paid],
          ["Pendiente", summary.debt],
        ].map(([label, value]) => (
          <div
            key={label}
            className="border-plum/15 rounded-3xl border bg-white/80 p-5 shadow-sm"
          >
            <p className="text-plum/60 text-xs font-bold tracking-[0.15em] uppercase">
              {label}
            </p>
            <p className="text-plum mt-2 text-2xl font-black">
              {formatMoney(value ?? "0.00")}
            </p>
          </div>
        ))}
      </section>

      <section className="border-plum/15 mt-6 rounded-3xl border bg-white/80 p-6 shadow-sm">
        <h2 className="text-plum text-xl font-black">Detalle</h2>
        {concepts.length === 0 ? (
          <p className="text-plum/70 mt-3">
            Todavía no hay conceptos cargados en tu cuenta.
          </p>
        ) : (
          <ul className="divide-plum/10 mt-4 divide-y">
            {concepts.map((concept) => (
              <li
                key={concept.id}
                className="flex flex-col justify-between gap-2 py-4 sm:flex-row sm:items-center"
              >
                <div>
                  <p className="text-plum font-bold">{concept.label}</p>
                  <p className="text-plum/60 mt-1 text-sm">{concept.detail}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-bold ${
                      concept.status === "PAID"
                        ? "bg-primary/10 text-primary"
                        : "bg-secondary/20 text-plum"
                    }`}
                  >
                    {concept.status === "PAID" ? "Pagado" : "Pendiente"}
                  </span>
                  <strong className="text-ink">
                    {formatMoney(concept.amount)}
                  </strong>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </StudentPortalShell>
  );
}
