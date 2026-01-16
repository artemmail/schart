import { LineStyle, ParamField } from '../indicator-api';

export const lineStyleOptions = [
  { value: 'solid', label: 'Solid' },
  { value: 'dashed', label: 'Dashed' },
  { value: 'dotted', label: 'Dotted' },
];

export const lineStyleField: ParamField<LineStyle> = {
  type: 'enum',
  title: 'Line Style',
  default: 'solid',
  options: lineStyleOptions,
};

export function dayKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

export function monthKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}`;
}

export function isoWeekKey(d: Date): string {
  const date = new Date(d.getTime());
  date.setHours(0, 0, 0, 0);
  // Thursday determines the week-year
  date.setDate(date.getDate() + 3 - ((date.getDay() + 6) % 7));
  const weekYear = date.getFullYear();
  const week1 = new Date(weekYear, 0, 4);
  const week1Day = (week1.getDay() + 6) % 7;
  week1.setDate(week1.getDate() - week1Day + 3);
  const week =
    1 + Math.round((date.getTime() - week1.getTime()) / (7 * 24 * 60 * 60 * 1000));
  return `${weekYear}-W${String(week).padStart(2, '0')}`;
}
