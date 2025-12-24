
import { Injectable } from '@angular/core';
import { MatDateFormats, NativeDateAdapter } from '@angular/material/core';

export const MY_DATE_FORMATS: MatDateFormats = {
  parse: {
    dateInput: 'DD.MM.YYYY',
  },
  display: {
    dateInput: 'DD.MM.YYYY',
    monthYearLabel: 'MMMM YYYY',
    dateA11yLabel: 'DD.MM.YYYY',
    monthYearA11yLabel: 'MMMM YYYY',
  },
};
@Injectable()
export class CustomDateAdapter extends NativeDateAdapter {
  // Задаем формат отображения
  override parse(value: any): Date | null {
    if (typeof value === 'string' && value.indexOf('.') > -1) {
      const str = value.split('.');

      const day = +str[0];
      const month = +str[1] - 1;  // В JavaScript месяцы идут с 0
      const year = +str[2];

      return new Date(year, month, day);
    }
    return super.parse(value);
  }

  // Форматируем дату в строку для отображения
  override format(date: Date, displayFormat: string): string {
    if (!date) return '';
    
    const day = date.getDate();
    const month = date.getMonth() + 1; // Месяцы с 0 по 11
    const year = date.getFullYear();

    return `${this._to2digit(day)}.${this._to2digit(month)}.${year}`;
  }

  private _to2digit(n: number): string {
    return ('00' + n).slice(-2);
  }
}
