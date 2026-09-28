import type { FootPrintParameters } from 'src/app/models/Params';

export interface FootprintClock {
  now(): Date;
  schedule(callback: () => void, delayMs: number): ReturnType<typeof setTimeout>;
  cancel(timer: ReturnType<typeof setTimeout>): void;
}
export const systemFootprintClock: FootprintClock = {
  now: () => new Date(), schedule: (callback, delay) => setTimeout(callback, delay), cancel: timer => clearTimeout(timer),
};

const formatter = new Intl.DateTimeFormat('en-US', {
  timeZone: 'Europe/Moscow', year: 'numeric', month: '2-digit', day: '2-digit',
  weekday: 'short', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
});
function parts(date: Date) {
  const values = Object.fromEntries(formatter.formatToParts(date).map(part => [part.type, part.value]));
  return { day: `${values.year}-${values.month}-${values.day}`, weekday: values.weekday,
    minute: Number(values.hour) * 60 + Number(values.minute), second: Number(values.second) };
}
function parse(value: unknown): Date | null {
  if (value === null || value === undefined || value === '') return null;
  const date = value instanceof Date ? value : new Date(value as string | number);
  return Number.isFinite(date.getTime()) ? date : null;
}
function explicitTime(value: unknown): boolean {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = parse(value);
  if (!date) return false;
  const zoned = parts(date);
  return zoned.minute !== 0 || zoned.second !== 0 || date.getMilliseconds() !== 0;
}

/** Admission policy; all day/time comparisons use the same chart timezone. */
export function rangeAllowsRealtime(params: Readonly<FootPrintParameters>, now: Date): boolean {
  if (params.type === 'arbitrage') return false;
  const end = parse(params.endDate);
  if (!end) return true;
  if (explicitTime(params.startDate) || explicitTime(params.endDate)) {
    const graceMs = Math.max(5, Math.max(1, Number(params.period || 1))) * 60_000;
    return end.getTime() + graceMs >= now.getTime();
  }
  const day = typeof params.endDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(params.endDate)
    ? params.endDate : parts(end).day;
  return day >= parts(now).day;
}
export function isRealtimeWindowOpen(now: Date): boolean {
  const zoned = parts(now);
  return zoned.weekday !== 'Sat' && zoned.weekday !== 'Sun' && zoned.minute >= 6 * 60 + 45 && zoned.minute <= 23 * 60 + 59;
}
export function shouldSubscribeRealtime(params: Readonly<FootPrintParameters>, now: Date): boolean {
  return rangeAllowsRealtime(params, now) && isRealtimeWindowOpen(now);
}

export function nextRealtimeCheckDelay(params: Readonly<FootPrintParameters>, now: Date): number | null {
  return rangeAllowsRealtime(params, now) ? 60_000 - (now.getSeconds() * 1000 + now.getMilliseconds()) : null;
}
