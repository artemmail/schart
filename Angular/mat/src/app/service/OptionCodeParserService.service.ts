import { Injectable } from '@angular/core';
import { number } from 'echarts';
import { contractGroups, ContractResult, OptionCodeModel } from '../models/option-data.model';



@Injectable({
  providedIn: 'root'
})
export class OptionCodeService {
  
  constructor() {}

  /**
   * Генерация краткого кода опционов на основе модели OptionCodeModel
   */
  generateShortCode(optionData: OptionCodeModel): string {
    // Рассчитываем executionDate и isWeek
    this.calculateExecutionDate(optionData);

    const { assetSymbol, strikePrice, optionType, year, month, week, isWeek } = optionData;

    const strikeCode = this.formatStrikePrice(strikePrice);
    const typeCode = optionType === 'CALL' ? 'C' : 'P';
    const yearCode = this.formatYear(year);
    const monthCode = this.formatMonth(month, optionType);
    const weekCode = isWeek && week ? this.formatWeek(week) : 'W'; // 'W' для месячных опционов

    return `${assetSymbol}${strikeCode}${typeCode}${yearCode}${monthCode}${weekCode}`;
  }

  /**
   * Генерация длинного кода опционов на основе модели OptionCodeModel
   */
  generateLongCode(optionData: OptionCodeModel): string {
    // Рассчитываем executionDate и isWeek
    this.calculateExecutionDate(optionData);

    const { assetSymbol, calcCode, executionDate, strikePrice, optionType, year, week, isWeek } = optionData;

    const fullAssetSymbol = this.formatAssetSymbol(assetSymbol);
    const calcCodeFormatted = this.formatCalcCode(calcCode);
    const execDateFormatted = executionDate ? this.formatExecutionDate(executionDate) : '00000000';
    const strikeCode = this.formatStrikePrice(strikePrice);
    const typeCode = optionType === 'CALL' ? 'C' : 'P';
    const yearCode = this.formatYear(year);
    const weekCode = isWeek && week ? this.formatWeek(week) : 'W'; // 'W' для месячных опционов

    return `${fullAssetSymbol}${calcCodeFormatted}${execDateFormatted}${strikeCode}${typeCode}${yearCode}${weekCode}`;
  }





  /**
   * Рассчет executionDate и isWeek на основе week
   */
  private calculateExecutionDate(optionData: OptionCodeModel): void {
    if (optionData.week !== undefined && optionData.week !== null) {
      optionData.isWeek = true;
      optionData.executionDate = this.getThursdayOfWeek(optionData.year, optionData.month, optionData.week);
    } else {
      optionData.isWeek = false;
      optionData.executionDate = this.get25thOfMonth(optionData.year, optionData.month);
    }
  }

  /**
   * Рассчет executionDate при парсинге кода
   */
  private calculateExecutionDateFromParsed(year: number, month: string, week?: number): Date {
    if (week !== undefined) {
      return this.getThursdayOfWeek(year, month, week);
    } else {
      return this.get25thOfMonth(year, month);
    }
  }

/**
 * Получение даты четверга по номеру рабочей недели в месяце
 */
private getThursdayOfWeek(year: number, month: string, week: number): Date {
  const monthIndex = this.getMonthIndex(month);
  if (monthIndex === -1) {
    throw new Error(`Неверный месяц: ${month}`);
  }

  const firstDay = new Date(year, monthIndex, 1);
  const firstMonday = this.getFirstWeekdayOfMonth(year, monthIndex, 1); // 1 соответствует понедельнику

  // Находим первый четверг после первого понедельника
  let firstThursday = new Date(firstMonday);
  const dayOfWeek = firstMonday.getDay();
  // Если первый понедельник не первый день недели, добавляем дни до четверга
  if (dayOfWeek <= 4) {
    firstThursday.setDate(firstMonday.getDate() + (4 - dayOfWeek));
  } else {
    firstThursday.setDate(firstMonday.getDate() + (7 - dayOfWeek + 4));
  }

  // Добавляем (week - 1) рабочих недель (по понедельникам)
  const desiredThursday = new Date(firstThursday);
  desiredThursday.setDate(firstThursday.getDate() + (week - 1) * 7);

  return desiredThursday;
}



  /**
   * Получение 25-го числа месяца
   */
  private get25thOfMonth(year: number, month: string): Date {
    const monthIndex = this.getMonthIndex(month);
    if (monthIndex === -1) {
      throw new Error(`Неверный месяц: ${month}`);
    }
    return new Date(year, monthIndex, 25);
  }

  /**
   * Получение индекса месяца (0-11) по названию
   */
  private getMonthIndex(month: string): number {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return months.indexOf(month);
  }

  /**
   * Получение первой даты определенного дня недели в месяце
   * @param weekday Четверг = 4
   */
  private getFirstWeekdayOfMonth(year: number, monthIndex: number, weekday: number): Date {
    const date = new Date(year, monthIndex, 1);
    const firstWeekday = date.getDay(); // Воскресенье = 0, Четверг = 4
    let delta = weekday - firstWeekday;
    if (delta < 0) {
      delta += 7;
    }
    return new Date(year, monthIndex, 1 + delta);
  }

  /**
   * Получение последней даты определенного дня недели в месяце
   * @param weekday Четверг = 4
   */
  private getLastWeekdayOfMonth(year: number, monthIndex: number, weekday: number): Date {
    const lastDate = new Date(year, monthIndex + 1, 0); // Последний день месяца
    const lastWeekday = lastDate.getDay();
    let delta = lastWeekday - weekday;
    if (delta < 0) {
      delta += 7;
    }
    return new Date(year, monthIndex, lastDate.getDate() - delta);
  }

  // Методы форматирования данных
  private formatStrikePrice(strikePrice: number): string {
    return strikePrice.toFixed(2).replace('.', '');
  }

  private formatYear(year: number): string {
    const baseYear = 2024;
    return (year - baseYear + 4).toString();  // Соответствие годам в кодировке
  }

  private formatMonth(month: string, optionType: 'CALL' | 'PUT'): string {
    const monthMap = {
      'January': { CALL: 'A', PUT: 'M' },
      'February': { CALL: 'B', PUT: 'N' },
      'March': { CALL: 'C', PUT: 'O' },
      'April': { CALL: 'D', PUT: 'P' },
      'May': { CALL: 'E', PUT: 'Q' },
      'June': { CALL: 'F', PUT: 'R' },
      'July': { CALL: 'G', PUT: 'S' },
      'August': { CALL: 'H', PUT: 'T' },
      'September': { CALL: 'I', PUT: 'U' },
      'October': { CALL: 'J', PUT: 'V' },
      'November': { CALL: 'K', PUT: 'W' },
      'December': { CALL: 'L', PUT: 'X' }
    };
    return monthMap[month][optionType];
  }

  private formatWeek(week: number): string {
    return week.toString();
  }

  private formatAssetSymbol(symbol: string): string {
    return symbol.padEnd(4, '_');
  }

  private formatCalcCode(calcCode: 'P' | 'M' | undefined): string {
    return calcCode || 'P';  // Возвращаем премиальный расчет по умолчанию
  }

  private formatExecutionDate(executionDate: Date): string {
    const day = executionDate.getDate().toString().padStart(2, '0');
    const month = (executionDate.getMonth() + 1).toString().padStart(2, '0');
    const year = executionDate.getFullYear().toString();
    return `${day}${month}${year}`;
  }



  private parseYear(yearCode: string): number {
    const baseYear = 2024;
    return baseYear + parseInt(yearCode) - 4;
  }

  private parseMonth(monthCode: string, optionType: 'CALL' | 'PUT'): string {
    const monthMap: { [key: string]: string } = {
      'A': 'January', 'M': 'January',
      'B': 'February', 'N': 'February',
      'C': 'March', 'O': 'March',
      'D': 'April', 'P': 'April',
      'E': 'May', 'Q': 'May',
      'F': 'June', 'R': 'June',
      'G': 'July', 'S': 'July',
      'H': 'August', 'T': 'August',
      'I': 'September', 'U': 'September',
      'J': 'October', 'V': 'October',
      'K': 'November', 'W': 'November',
      'L': 'December', 'X': 'December'
    };
    return monthMap[monthCode];
  }

  private parseWeek(weekCode: string): number | undefined {
    switch (weekCode) {
      case 'A':
        return 0; // 1-ая неделя месяца
      case 'B':
        return 1; // 2-ая неделя месяца
      case 'C':
        return 2; // 3-я неделя месяца
      case 'D':
        return 3; // 4-ая неделя месяца
      case 'E':
        return 4; // 5-ая неделя месяца
      default:
        return undefined; // Пустое значение или не недельный опцион
    }
  }

  private parseCalcCode(calcCode: string): 'P' | 'M' | undefined {
    return calcCode === 'M' ? 'M' : 'P';
  }

  private calcTypeShortCodeDict = {
    'A': { asset: 'Фьючерс', category: 'Американский', calcType: 'Уплата премии' },
    'B': { asset: 'Фьючерс', category: 'Американский', calcType: 'Маржируемый' },
    'C': { asset: 'Акция, валюта', category: 'Европейский', calcType: 'Уплата премии' }
  };

  private fullCodeCalcTypeDict = {
    'P': 'Премиальный',
    'M': 'Маржируемый'
  };

  private optionTypeDict = {
    'C': 'Колл',
    'P': 'Пут'
  };

  private expirationTypeDict = {
    'A': 'Американский',
    'E': 'Европейский'
  };




  parseLongCode(code: string): OptionCodeModel {
    if (code.length < 13) {
      throw new Error('Input string is too short.');
    }
  
    // Проверка, является ли 5-й символ цифрой
    let assetSymbol;
    let calcTypeShort;
    let executionDate;
    
  let ix =0;

    if (isNaN(parseInt(code.charAt(5)))) {
      // Если 5-й символ не цифра, значит, это часть БА (длина БА 5 символов)
      assetSymbol = code.substring(0, 5); // Полный код БА (characters 1-5)
      calcTypeShort = code.charAt(5); // Тип расчетов краткий (character 6)
      executionDate = code.substring(6, 12); // Дата исполнения (characters 7-12)
      ix=1;
    } else {
      // Если 5-й символ цифра, длина БА — 4 символа
      assetSymbol = code.substring(0, 4); // Полный код БА (characters 1-4)
      calcTypeShort = code.charAt(4); // Тип расчетов краткий (character 5)
      executionDate = code.substring(5, 11); // Дата исполнения (characters 6-11)
    }
  
    const optionType1 = code.charAt(11+ix); // Тип опциона (character 12 или 13 в зависимости от длины БА)
    const expirationType = code.charAt(12+ix); // Тип экспирации (character 13 или 14 в зависимости от длины БА)
  
    // Парсинг даты (DDMMYY формат)
    const day = parseInt(executionDate.substring(0, 2), 10);
    const month = parseInt(executionDate.substring(2, 4), 10) - 1; // Месяцы начинаются с 0 в JS
    const year = parseInt(executionDate.substring(4, 6), 10) + 2000; // Добавляем 2000 для корректного года
  
    const parsedDate = new Date(year, month, day);
    if (isNaN(parsedDate.getTime())) {
      throw new Error('Invalid date format.');
    }
  
    // Рассчитываем номер недели в месяце
    const week = Math.ceil((parsedDate.getDate() + (new Date(year, month, 1).getDay() - 1)) / 7);
  
    // Извлекаем страйк и убеждаемся, что это число
    const strikePrice = parseFloat(code.substring(13+ix).trim());
  
    // Расшифровываем значения с использованием словарей
    const fullCalcType = this.fullCodeCalcTypeDict[calcTypeShort] || 'Unknown';
    const optionType = this.optionTypeDict[optionType1] || 'Unknown';
    const expType = this.expirationTypeDict[expirationType] || 'Unknown';
  
    return {
      assetSymbol,
      strikePrice,
      optionType,
      year: parsedDate.getFullYear(), // Год
      month: "" + (parsedDate.getMonth() + 1), // Месяц (в JS месяцы начинаются с 0)
      week: week, // Номер недели в месяце
      isWeek: expirationType === 'W', // Пример использования для недельных опционов
      executionDate: parsedDate, // Возвращаем парсированную дату
      fullCalcType,
      expType,
      ContractResult: this.searchByCodeFutures(assetSymbol)
    };
  }
  
  parseCode(code: string): OptionCodeModel {
    if(code.length>14)
      return this.parseLongCode(code);    
    return this.parseShortCode(code);
  }

  parseShortCode(code: string): OptionCodeModel {
    // Парсим assetSymbol как первые два символа
    const assetSymbol = code.slice(0, 2).trim();
  
    // Динамический парсинг цены страйка, начиная с 2-го символа
    const [strikePrice, remainingCode] = this.parseDynamicStrikePrice(code.slice(2));
  
    // Парсинг типа опциона из оставшегося кода
    const optionType = remainingCode[0] === 'C' ? 'CALL' : 'PUT';
  
    // Парсинг года из следующего символа
    const year = this.parseYear(remainingCode[2]);
  
    // Парсинг месяца
    const month = this.parseMonth(remainingCode[1], optionType);

    // Парсинг недели (если она есть)
    const week =  this.parseWeek(remainingCode[3]);
    const isWeek = week !== undefined;
  
    // Рассчитываем executionDate
    const executionDate = this.calculateExecutionDateFromParsed(year, month, week);
  
    return {
      assetSymbol,
      strikePrice,
      optionType,
      year,
      month,
      week,
      isWeek,
      executionDate,
      fullCalcType:"",
      expType:"",
      ContractResult: this.searchByCodeBase(assetSymbol)
    };
  }

  private parseExecutionDate(dateCode: string): Date {
    const day = parseInt(dateCode.slice(0, 2));
    const month = parseInt(dateCode.slice(2, 4)) - 1; // JavaScript months start at 0
    const year = parseInt(dateCode.slice(4, 8));
    return new Date(year, month, day);
  }


  searchByCodeBase(code: string): ContractResult {
    for (const group of contractGroups) {
      const contract = group.contracts.find(c => c.code_base.toLowerCase() === code.toLowerCase());
      if (contract) {
        return {
          group: group.group,
          code_base: contract.code_base,
          code_futures: contract.code_futures,
          name: contract.name
        };
      }
    }
    // Если не найдено, возвращаем искомый code_base и "не найдено" для остальных полей
    return {
      group: "не найдено",
      code_base: code,
      code_futures: "не найдено",
      name: "не найдено"
    };
  }

  /**
   * Функция поиска по длинному индексу (code_futures)
   * @param code Длинный код для поиска
   * @returns Объект ContractResult с найденными данными или "не найдено"
   */
  searchByCodeFutures(code: string): ContractResult {
    for (const group of contractGroups) {
      const contract = group.contracts.find(c => c.code_futures.toLowerCase() === code.toLowerCase());
      if (contract) {
        return {
          group: group.group,
          code_base: contract.code_base,
          code_futures: contract.code_futures,
          name: contract.name
        };
      }
    }
    // Если не найдено, возвращаем искомый code_futures и "не найдено" для остальных полей
    return {
      group: "не найдено",
      code_base: "не найдено",
      code_futures: code,
      name: "не найдено"
    };
  }

  /**
   * Динамический парсинг цены страйка, извлекая цифры до первого нецифрового символа
   */
  private parseDynamicStrikePrice(str: string): [number, string] { 
    let i = 0;
    let strikePrice = '';
    let dotEncountered = false; // Флаг, чтобы отслеживать первую точку

    // Извлекаем все цифры и одну точку до первого нецифрового символа
    while (i < str.length && (/\d/.test(str[i]) || (str[i] === '.' && !dotEncountered))) {
        if (str[i] === '.') {
            dotEncountered = true; // Указываем, что точка была встречена
        }
        strikePrice += str[i];
        i++;
    }

    // Остаток строки после цены страйка
    const remainingCode = str.slice(i);

    // Преобразуем строку в число
    const strikePriceValue = strikePrice ? parseFloat(strikePrice) : 0;

    return [strikePriceValue, remainingCode];
}

}
