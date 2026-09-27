export function formatBDT(value: number | string) {
  const amount = typeof value === "string" ? Number(value) : value;
  return `৳ ${new Intl.NumberFormat("en-BD", { maximumFractionDigits: 0 }).format(amount)}`;
}

export function toPaisa(value: number) {
  return Math.round(value * 100);
}
export function fromPaisa(value: number) {
  return value / 100;
}
