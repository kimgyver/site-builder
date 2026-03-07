const DEFAULT_PUBLISH_TIME_ZONE = "UTC";

export const COMMON_PUBLISH_TIME_ZONES = [
  "UTC",
  "Pacific/Auckland",
  "Pacific/Fiji",
  "Australia/Sydney",
  "Australia/Brisbane",
  "Asia/Seoul",
  "Asia/Tokyo",
  "Asia/Singapore",
  "Asia/Bangkok",
  "Asia/Kolkata",
  "Europe/London",
  "Europe/Berlin",
  "Europe/Paris",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Toronto",
  "America/Sao_Paulo"
] as const;

function parseDateTimeLocalInput(input: string) {
  const match = input.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);
  if (!match) return null;

  const year = Number.parseInt(match[1], 10);
  const month = Number.parseInt(match[2], 10);
  const day = Number.parseInt(match[3], 10);
  const hour = Number.parseInt(match[4], 10);
  const minute = Number.parseInt(match[5], 10);

  if (
    !Number.isFinite(year) ||
    !Number.isFinite(month) ||
    !Number.isFinite(day) ||
    !Number.isFinite(hour) ||
    !Number.isFinite(minute)
  ) {
    return null;
  }

  if (
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31 ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59
  ) {
    return null;
  }

  return { year, month, day, hour, minute };
}

function getOffsetMinutesForTimeZone(
  date: Date,
  timeZone: string
): number | null {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZoneName: "shortOffset"
  });

  const offsetPart = formatter
    .formatToParts(date)
    .find(part => part.type === "timeZoneName")?.value;

  if (!offsetPart) return null;
  if (offsetPart === "GMT" || offsetPart === "UTC") return 0;

  const match = offsetPart.match(/(?:GMT|UTC)([+-])(\d{1,2})(?::?(\d{2}))?/);
  if (!match) return null;

  const sign = match[1] === "-" ? -1 : 1;
  const hours = Number.parseInt(match[2], 10);
  const minutes = Number.parseInt(match[3] ?? "0", 10);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;

  return sign * (hours * 60 + minutes);
}

export function normalizePublishTimeZone(value: unknown): string {
  const raw = String(value ?? "").trim();
  if (!raw) return DEFAULT_PUBLISH_TIME_ZONE;

  try {
    new Intl.DateTimeFormat("en-US", { timeZone: raw }).format(new Date());
    return raw;
  } catch {
    return DEFAULT_PUBLISH_TIME_ZONE;
  }
}

export function formatDateTimeLocalInTimeZone(
  date: Date,
  timeZone: string
): string {
  const normalizedTimeZone = normalizePublishTimeZone(timeZone);
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: normalizedTimeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  });

  const parts = formatter.formatToParts(date);
  const byType = new Map(parts.map(part => [part.type, part.value]));

  const year = byType.get("year") ?? "0000";
  const month = byType.get("month") ?? "01";
  const day = byType.get("day") ?? "01";
  const hour = byType.get("hour") ?? "00";
  const minute = byType.get("minute") ?? "00";

  return `${year}-${month}-${day}T${hour}:${minute}`;
}

export function parseDateTimeLocalInTimeZone(
  input: string,
  timeZone: string
): Date | null {
  const parsed = parseDateTimeLocalInput(input);
  if (!parsed) return null;

  const normalizedTimeZone = normalizePublishTimeZone(timeZone);
  const { year, month, day, hour, minute } = parsed;

  let utcMillis = Date.UTC(year, month - 1, day, hour, minute, 0, 0);

  for (let index = 0; index < 3; index += 1) {
    const offsetMinutes = getOffsetMinutesForTimeZone(
      new Date(utcMillis),
      normalizedTimeZone
    );

    if (offsetMinutes === null) {
      return null;
    }

    const adjusted =
      Date.UTC(year, month - 1, day, hour, minute, 0, 0) -
      offsetMinutes * 60_000;

    if (adjusted === utcMillis) {
      break;
    }

    utcMillis = adjusted;
  }

  const result = new Date(utcMillis);

  if (Number.isNaN(result.getTime())) {
    return null;
  }

  const roundTrip = formatDateTimeLocalInTimeZone(result, normalizedTimeZone);
  if (roundTrip !== input) {
    return null;
  }

  return result;
}

export { DEFAULT_PUBLISH_TIME_ZONE };
