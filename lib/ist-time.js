/**
 * Converts a UTC ISO 8601 timestamp to IST wall-clock `YYYY-MM-DDTHH:mm:ss`
 * (same shape as Swiggy API timestamps — no timezone suffix).
 * Only converts values that are clearly UTC (`Z` or `+00:00`).
 */
export function utcIsoToIstLocal(iso) {
  if (!iso) return "";
  const s = String(iso).trim();
  if (!s) return "";
  if (!/Z$|[+-]00:00$/.test(s)) return s;

  const ms = Date.parse(s);
  if (Number.isNaN(ms)) return s;

  const istMs = ms + (5 * 60 + 30) * 60 * 1000;
  const d = new Date(istMs);
  const pad = (n) => String(n).padStart(2, "0");

  return (
    `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}T` +
    `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`
  );
}
