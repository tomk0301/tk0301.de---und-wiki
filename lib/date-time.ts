export const dateTimeFormats = {
  "de-DE": "Deutsch · 07.10.2026, 18:52:00",
  "en-GB": "Britisch · 07/10/2026, 18:52:00",
  "en-US": "Amerikanisch · 10/07/2026, 6:52:00 PM",
} as const;

export type DateTimeSettings = { timeZone: string; dateTimeFormat: keyof typeof dateTimeFormats };

export function validTimeZone(value: unknown): value is string {
  if (typeof value !== "string" || !value.trim()) return false;
  try { new Intl.DateTimeFormat("de-DE", { timeZone: value }); return true; }
  catch { return false; }
}

export function validDateTimeFormat(value: unknown): value is DateTimeSettings["dateTimeFormat"] {
  return typeof value === "string" && Object.hasOwn(dateTimeFormats, value);
}

export function formatDateTime(value: string | Date | undefined, settings: DateTimeSettings, dateOnly = false) {
  if (!value) return "—";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "—";
  return new Intl.DateTimeFormat(settings.dateTimeFormat, {
    timeZone: settings.timeZone, year: "numeric", month: "2-digit", day: "2-digit",
    ...(dateOnly ? {} : { hour: "2-digit", minute: "2-digit", second: "2-digit", timeZoneName: "short" as const }),
  }).format(date);
}

export function backupArchiveCreatedAt(filename: string | undefined) {
  const match = /^wiki-(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z-/.exec(filename || "");
  return match ? `${match[1]}-${match[2]}-${match[3]}T${match[4]}:${match[5]}:${match[6]}Z` : undefined;
}
