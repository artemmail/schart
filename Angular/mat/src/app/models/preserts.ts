import { FootPrintRequestParams } from "./FootPrintPar";


export interface SelectListItemText {
  Value: string;
  Text: string;
}

export interface SelectListItemNumber {
  Value: number;
  Text: string;
}

export interface SelectListItemParams {
  Value: FootPrintRequestParams;
  Text: string;
}

export const SmallPeriodPreset: SelectListItemNumber[] = [
  { Value: 0.0, Text: 'Тиковый' },
  { Value: 3.0, Text: 'Трейды' },
  { Value: 0.0833333358168602, Text: '5 сек' },
  { Value: 0.25, Text: '15 сек' },
  { Value: 0.5, Text: '30 сек' },
  { Value: 1.0, Text: '1 мин' },
  { Value: 5.0, Text: '5 мин' },
  { Value: 10.0, Text: '10 мин' },
  { Value: 15.0, Text: '15 мин' },
  { Value: 30.0, Text: '30 мин' },
  { Value: 60.0, Text: '1 час' },
  { Value: 120.0, Text: '2 часа' },
  { Value: 240.0, Text: '4 часа' },
  { Value: 1440.0, Text: '1 день' },
  { Value: 10080.0, Text: 'неделя' },
  { Value: 30000.0, Text: 'месяц' },
  { Value: 90000.0, Text: 'Квартал' },
  { Value: 180000.0, Text: '6 мес.' },
];


export const TopPreset: SelectListItemNumber[] = [  
  { Value: 20, Text: 'Топ 20' },
  { Value: 50, Text: 'Топ 50' },
  { Value: 100, Text: 'Топ 100' },
  { Value: 200, Text: 'Топ 200' },
  { Value: 2000, Text: 'Все' }  
];


export const SmallPeriodPresetShort: SelectListItemNumber[] = [  
  { Value: 1.0, Text: '1 мин' },
  { Value: 5.0, Text: '5 мин' },
  { Value: 10.0, Text: '10 мин' },
  { Value: 15.0, Text: '15 мин' },
  { Value: 30.0, Text: '30 мин' },
  { Value: 60.0, Text: '1 час' },
  { Value: 120.0, Text: '2 часа' },
  { Value: 240.0, Text: '4 часа' },
  { Value: 1440.0, Text: '1 день' },
  { Value: 1440.0*7, Text: '1 неделя' },
  { Value: 30000, Text: '1 мес' }
];

export const BigPeriodPreset: SelectListItemText[] = [
  { Value: 'custom', Text: 'Свой промежуток' },
  { Value: 'day', Text: 'День' },
  { Value: 'week', Text: 'Неделя' },
  { Value: 'month', Text: 'Месяц' },
  { Value: 'quarter', Text: 'Квартал' },
  { Value: 'halfyear', Text: 'Полгода' },
  { Value: 'year', Text: 'Год' },
  { Value: 'prevyear', Text: 'Прошлый год' },
  { Value: 'startyear', Text: 'Начало года' },
  { Value: 'all', Text: 'Весь период' },
];


export const widthsPreset: SelectListItemNumber[] = [
  { Text: '1 px', Value: 1 },
  { Text: '2 px', Value: 2 },
  { Text: '3 px', Value: 3 },
  { Text: '4 px', Value: 4 },
  { Text: '5px', Value: 5 },
];

export const fontsPreset: SelectListItemNumber[] = [
  { Text: '22 px', Value: 22 },
  { Text: '28 px', Value: 28 },
  { Text: '32 px', Value: 32 },
  { Text: '36 px', Value: 36 },
  { Text: '40 px', Value: 40 },
  { Text: '48 px', Value: 48 },
];

export const profilePeriodsPreset: SelectListItemNumber[] = [
  { Text: 'Turn off', Value: -1 },
  { Text: '1 minute', Value: 1 },
  { Text: '5 minutes', Value: 5 },
  { Text: '15 minutes', Value: 15 },
  { Text: '1 hour', Value: 60 },
  { Text: '2 hours', Value: 120 },
  { Text: '4 hours', Value: 240 },
  { Text: '1 day', Value: 1440 },
  { Text: '1 week', Value: 10080 },
  { Text: '1 month', Value: 30000 },
];

export const candleModesPreset: SelectListItemText[] = [
  { Text: 'Never', Value: 'Never' },
  { Text: 'Auto scale', Value: 'Auto' },
  { Text: 'Always', Value: 'Always' },
];

export const totalModesPreset: SelectListItemText[] = [
  { Text: 'Скрыть', Value: 'Hidden' },
  { Text: 'Поверх', Value: 'Under' },
  { Text: 'Слева', Value: 'Left' },
];