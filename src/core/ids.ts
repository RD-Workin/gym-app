import type { IsoDate } from './types';

export const nouvelId = (): string => crypto.randomUUID();

/** Date ISO locale avec décalage horaire, ex. 2026-10-31T15:20:00+01:00. */
export function maintenant(date = new Date()): IsoDate {
  const pad = (n: number) => String(Math.abs(Math.trunc(n))).padStart(2, '0');
  const tz = -date.getTimezoneOffset();
  const signe = tz >= 0 ? '+' : '-';
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}` +
    `${signe}${pad(tz / 60)}:${pad(tz % 60)}`
  );
}
