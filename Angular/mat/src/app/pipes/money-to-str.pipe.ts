import { Pipe, PipeTransform } from '@angular/core';
import { MoneyToStr } from '../service/FootPrint/utils';

@Pipe({
  name: 'moneyToStr',
  standalone: false
})
export class MoneyToStrPipe implements PipeTransform {
  transform(value: any): string {
    // Проверка на null или undefined
    if (value === null || value === undefined) {
      return '-';
    }

    // Преобразование в строку
    const valueStr = value.toString();

    // Проверка на наличие двух точек в строке
    const hasTwoDots = (valueStr.match(/\./g) || []).length > 1;

    // Если строка содержит две точки или состоит только из букв, возвращаем значение как есть
    if (hasTwoDots || /^[a-zA-Z]+$/.test(valueStr)) {
      return valueStr;
    }

    // Преобразование к числу и использование MoneyToStr, если значение корректное
    const numericValue = Number(valueStr);
    if (!isNaN(numericValue)) {
      if (numericValue===0)
        return '-';
      return MoneyToStr(numericValue);
    }

    // Возвращаем оригинальное значение, если это не число
    return valueStr;
  }
}
