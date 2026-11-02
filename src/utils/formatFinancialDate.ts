/**
 * Formata a coluna DATE do PostgreSQL sem converter o dia para outro fuso.
 * postgres.js pode serializar DATE como "2026-11-01" ou
 * "2026-11-01T00:00:00.000Z", dependendo do driver/serialização.
 * O dia civil é o próprio YYYY-MM-DD; não acrescente horários ao campo.
 */
export function formatFinancialDate(value: unknown): string {
  if (typeof value !== "string") return "—";

  const match = /^(\d{4})-(\d{2})-(\d{2})(?=$|[Tt ])/u.exec(value.trim());
  if (!match) return "—";

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const valid = new Date(Date.UTC(year, month - 1, day));
  if (
    !Number.isFinite(valid.getTime()) ||
    valid.getUTCFullYear() !== year ||
    valid.getUTCMonth() + 1 !== month ||
    valid.getUTCDate() !== day
  ) {
    return "—";
  }

  return `${match[3]}/${match[2]}/${match[1]}`;
}
