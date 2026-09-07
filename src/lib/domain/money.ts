export type PaymentStatusValue = "PENDING" | "PAID";

export type Charge = {
  amount: string;
  status: PaymentStatusValue;
};

export const normalizeMoney = (value: string | number) => {
  const normalized = String(value).trim().replace(",", ".");
  if (!/^(0|[1-9]\d{0,9})(\.\d{1,2})?$/.test(normalized)) return null;
  const [whole = "0", fraction = ""] = normalized.split(".");
  return `${whole}.${fraction.padEnd(2, "0")}`;
};

export const moneyToCents = (value: string | number) => {
  const normalized = normalizeMoney(value);
  if (!normalized) throw new Error(`Importe inválido: ${value}`);
  const [whole = "0", fraction = "00"] = normalized.split(".");
  return Number(whole) * 100 + Number(fraction);
};

export const centsToMoney = (cents: number) =>
  `${Math.trunc(cents / 100)}.${String(Math.abs(cents % 100)).padStart(2, "0")}`;

export const calculateFinancialSummary = (charges: Charge[]) => {
  const totalCents = charges.reduce(
    (sum, charge) => sum + moneyToCents(charge.amount),
    0,
  );
  const paidCents = charges
    .filter((charge) => charge.status === "PAID")
    .reduce((sum, charge) => sum + moneyToCents(charge.amount), 0);

  return {
    total: centsToMoney(totalCents),
    paid: centsToMoney(paidCents),
    debt: centsToMoney(totalCents - paidCents),
  };
};

export const formatMoney = (value: string | number) =>
  new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 2,
  }).format(moneyToCents(value) / 100);
