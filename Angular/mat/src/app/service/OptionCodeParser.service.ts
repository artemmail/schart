export interface OptionData {
  assetCode: string;        // Код актива (например, "SR", "RI", "BR")
  strike: number;           // Цена страйка (например, 240, 130000 или -10)
  settlementType: string;   // Тип расчетов (например, "Премиальный" или "Маржируемый")
  expirationDate: string;   // Дата исполнения (например, "2024-01-31")
  optionType?: string;      // Тип опциона (например, "Колл" или "Пут")
  expirationType?: string;  // Тип экспирации (например, "Американский" или "Европейский")
  isWeekly?: boolean;       // Флаг, указывающий, является ли опцион недельным
}

export class OptionCodeParser {
  // Словарь для типов расчетов краткого кода
  private shortSettlementTypes: { [key: string]: string } = {
    'A': 'Премиальный',
    'M': 'Маржируемый',  // Исправлено с 'B' на 'M'
    'C': 'Премиальный'
  };

  // Словарь для месяцев краткого кода (поле "Месяц")
  private monthCodes: { [key: string]: string } = {
    'Январь': 'A',
    'Февраль': 'B',
    'Март': 'C',
    'Апрель': 'D',
    'Май': 'E',
    'Июнь': 'F',
    'Июль': 'G',
    'Август': 'H',
    'Сентябрь': 'I',
    'Октябрь': 'J',
    'Ноябрь': 'K',
    'Декабрь': 'L'
  };

  // Массив названий месяцев по индексу
  private monthNames: string[] = [
    'Январь',
    'Февраль',
    'Март',
    'Апрель',
    'Май',
    'Июнь',
    'Июль',
    'Август',
    'Сентябрь',
    'Октябрь',
    'Ноябрь',
    'Декабрь'
  ];

  // Словарь для полного кодов активов
  private fullAssetCodes: { [key: string]: string } = {
    'RI': 'RTS',
    'SR': 'SBER',
    'BR': 'BR',
    // Добавьте другие по необходимости
  };

  // Словарь для типов расчетов полного кода (поле "K")
  private settlementTypes: { [key: string]: string } = { 
    'Премиальный': 'P',
    'Маржируемый': 'M'
  };

  // Словарь для типов опционов полного кода (поле "T")
  private optionTypes: { [key: string]: string } = {
    'Колл': 'C',
    'Пут': 'P'
  };

  // Словарь для типов экспирации полного кода (поле "E")
  private expirationTypes: { [key: string]: string } = {
    'Американский': 'A',
    'Европейский': 'E'
  };

  // Словарь для недельных кодов
  private weekCodes: { [key: string]: string } = {
    'A': 'A', // 1-я неделя месяца
    'B': 'B', // 2-я неделя месяца
    'C': 'C', // 3-я неделя месяца
    'D': 'D', // 4-я неделя месяца
    'E': 'E'  // 5-я неделя месяца (если есть)
  };

  // Разбор короткого кода опциона
  parseShortCode(code: string): OptionData {
    let assetCode: string;
    let strike: number;
    let settlementType: string;
    let month: string;
    let year: number;
    let week: string | undefined;
    let isWeekly: boolean;

    if (code.length === 12) {
      // Недельный опцион
      assetCode = code.slice(0, 2);
      const strikeStr = code.slice(2, 8);
      strike = parseFloat(strikeStr);
      const settlementTypeCode = code.charAt(8);
      settlementType = this.shortSettlementTypes[settlementTypeCode];
      const monthCode = code.charAt(9);
      month = this.getMonthName(monthCode);
      const yearDigit = parseInt(code.charAt(10), 10);
      year = 2020 + yearDigit;
      week = code.charAt(11);
      isWeekly = true;
    } else if (code.length === 8) {
      // Месячный опцион (Исправлено с 7 на 8)
      assetCode = code.slice(0, 2);
      const strikeStr = code.slice(2, 5); // Например, '-10'
      strike = parseFloat(strikeStr);
      const settlementTypeCode = code.charAt(5);
      settlementType = this.shortSettlementTypes[settlementTypeCode];
      const monthCode = code.charAt(6);
      month = this.getMonthName(monthCode);
      const yearDigit = parseInt(code.charAt(7), 10);
      year = 2020 + yearDigit;
      isWeekly = false;
    } else {
      throw new Error('Некорректная длина короткого кода опциона.');
    }

    let expirationDate: Date;
    
    if (isWeekly) {
      // Определение первого четверга месяца
      const firstThursday = this.getFirstThursdayOfMonth(year, month);
      
      // Определение даты экспирации на основе недели
      expirationDate = this.getExpirationDate(firstThursday, week!);
    } else {
      // Для месячного опциона дата экспирации задается фиксированно (последний четверг месяца)
      expirationDate = this.getMonthlyExpirationDate(year, month);
    }

    return {
      assetCode,
      strike,
      settlementType,
      expirationDate: this.formatDate(expirationDate), // Формат YYYY-MM-DD
      isWeekly
    };
  }

  // Метод для определения первого четверга месяца
  private getFirstThursdayOfMonth(year: number, month: string): Date {
    const monthIndex = this.getMonthIndex(month); // Преобразование названия месяца в индекс (0-11)
    let date = new Date(year, monthIndex, 1);
    
    while (date.getDay() !== 4) { // 4 соответствует четвергу
      date.setDate(date.getDate() + 1);
    }
    
    return date;
  }

  // Метод для вычисления даты экспирации недельного опциона
  private getExpirationDate(firstThursday: Date, week: string): Date {
    const weekNumber = week.charCodeAt(0) - 'A'.charCodeAt(0) + 1; // 'A' = 1, 'B' = 2, и т.д.
    const expirationDate = new Date(firstThursday);
    
    expirationDate.setDate(firstThursday.getDate() + 7 * (weekNumber - 1));
    
    // Проверка и корректировка на неторговые дни
    return this.adjustForNonTradingDay(expirationDate);
  }

  // Метод для вычисления даты экспирации месячного опциона (последний четверг месяца)
  private getMonthlyExpirationDate(year: number, month: string): Date {
    const monthIndex = this.getMonthIndex(month);
    // Начинаем с последнего дня месяца
    let date = new Date(year, monthIndex + 1, 0); // День 0 следующего месяца = последний день текущего
    // Находим последний четверг
    while (date.getDay() !== 4) {
      date.setDate(date.getDate() - 1);
    }
    return this.adjustForNonTradingDay(date);
  }

  // Метод для преобразования названия месяца в индекс (0-11)
  private getMonthIndex(monthName: string): number {
    const index = this.monthNames.indexOf(monthName);
    if (index === -1) {
      throw new Error(`Неизвестное название месяца: ${monthName}`);
    }
    return index;
  }

  // Метод для корректировки даты на рабочий день, если она выпадает на выходной
  private adjustForNonTradingDay(date: Date): Date {
    const day = date.getDay();
    if (day === 0) { // Воскресенье
      date.setDate(date.getDate() - 2);
    } else if (day === 6) { // Суббота
      date.setDate(date.getDate() - 1);
    }
    // Дополнительная логика для праздничных дней может быть добавлена здесь
    return date;
  }

  // Вспомогательная функция для получения названия месяца из кода
  private getMonthName(monthCode: string): string {
    const reverseMonthCodes: { [key: string]: string } = {
      'A': 'Январь',
      'B': 'Февраль',
      'C': 'Март',
      'D': 'Апрель',
      'E': 'Май',
      'F': 'Июнь',
      'G': 'Июль',
      'H': 'Август',
      'I': 'Сентябрь',
      'J': 'Октябрь',
      'K': 'Ноябрь',
      'L': 'Декабрь'
    };
    return reverseMonthCodes[monthCode] || '';
  }

  // Вспомогательная функция для форматирования даты в YYYY-MM-DD
  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = (`0${date.getMonth() + 1}`).slice(-2); // Месяцы начинаются с 0
    const day = (`0${date.getDate()}`).slice(-2);
    return `${year}-${month}-${day}`;
  }

  // Генерация короткого кода
  generateShortCode(optionData: OptionData): string {
    const { assetCode, strike, settlementType, expirationDate, isWeekly } = optionData;

    // Генерация кода типа расчетов для короткого кода
    const settlementTypeCode = Object.keys(this.shortSettlementTypes).find(
      key => this.shortSettlementTypes[key] === settlementType
    );
    if (!settlementTypeCode) {
      throw new Error(`Неизвестный тип расчетов: ${settlementType}`);
    }

    // Получение даты четверга недели экспирации
    const thursday = this.getThursday(expirationDate);
    const yearDigit = thursday.getFullYear() % 10;
    const monthIndex = thursday.getMonth(); // 0=Январь, 1=Февраль,...11=Декабрь
    const monthName = this.monthNames[monthIndex];
    const monthCode = this.monthCodes[monthName];
    if (!monthCode) {
      throw new Error(`Неизвестный месяц: ${monthName}`);
    }

    let weekCode = '';
    if (isWeekly) {
      const weekNumber = this.getWeekOfMonth(thursday);
      weekCode = this.getWeekCode(weekNumber);
      if (!weekCode) {
        throw new Error(`Неизвестный номер недели: ${weekNumber}`);
      }
    }

    // Формирование строки страйка с учётом возможного отрицательного значения и фиксированной длины
    let strikeStr: string;
    if (isWeekly) {
      strikeStr = strike < 0 
        ? `-${Math.abs(strike).toString().padStart(5, '0')}` 
        : strike.toString().padStart(6, '0');
    } else {
      strikeStr = strike < 0 
        ? `-${Math.abs(strike)}` 
        : strike.toString();
    }

    // Формирование короткого кода
    if (isWeekly) {
      return `${assetCode}${strikeStr}${settlementTypeCode}${monthCode}${yearDigit}${weekCode}`;
    } else {
      return `${assetCode}${strikeStr}${settlementTypeCode}${monthCode}${yearDigit}`;
    }
  }

  // Метод для получения даты четверга из строки даты
  private getThursday(expirationDate: string): Date {
    const parts = expirationDate.split('-'); // Ожидается формат YYYY-MM-DD
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1; // Месяц в Date начинается с 0
    const day = parseInt(parts[2], 10);
    const date = new Date(year, month, day);
    return date;
  }

  // Функция для определения номера недели в месяце
  private getWeekOfMonth(date: Date): number {
    const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
    const firstThursday = this.getFirstThursdayOfMonth(date.getFullYear(), this.monthNames[date.getMonth()]);
    const diff = date.getDate() - firstThursday.getDate();
    return Math.floor(diff / 7) + 1;
  }

  // Вспомогательная функция для получения кода недели
  private getWeekCode(weekNumber: number): string {
    const weekCodeMap: { [key: number]: string } = {
      1: 'A',
      2: 'B',
      3: 'C',
      4: 'D',
      5: 'E'
    };
    return weekCodeMap[weekNumber] || '';
  }

  // Генерация длинного кода
  generateLongCode(optionData: OptionData): string {
    const { assetCode, settlementType, expirationDate, optionType, expirationType, strike } = optionData;

    // Получение полного кода актива
    const fullAssetCode = this.fullAssetCodes[assetCode] || assetCode;

    // Генерация кода типа расчетов для длинного кода
    const settlementTypeCode = this.settlementTypes[settlementType];
    if (!settlementTypeCode) {
      throw new Error(`Неизвестный тип расчетов: ${settlementType}`);
    }

    // Генерация кода типа опциона
    const optionTypeCode = optionType ? this.optionTypes[optionType] : '';
    if (optionType && !optionTypeCode) {
      throw new Error(`Неизвестный тип опциона: ${optionType}`);
    }

    // Генерация кода типа экспирации
    const expirationTypeCode = expirationType ? this.expirationTypes[expirationType] : '';
    if (expirationType && !expirationTypeCode) {
      throw new Error(`Неизвестный тип экспирации: ${expirationType}`);
    }

    // Форматирование даты в ДДММГГ (например, 310124 для 31.01.24)
    const dateParts = expirationDate.split('-'); // Ожидается формат YYYY-MM-DD
    if (dateParts.length !== 3) {
      throw new Error(`Некорректный формат даты: ${expirationDate}`);
    }
    const formattedDate = `${dateParts[2]}${dateParts[1]}${dateParts[0].slice(-2)}`;

    // Формирование строки страйка с учётом возможного отрицательного значения
    const strikeStr = strike < 0 
      ? `-${Math.abs(strike)}`
      : strike.toString();

    // Формирование длинного кода
    return `${fullAssetCode}${settlementTypeCode}${formattedDate}${optionTypeCode}${expirationTypeCode}${strikeStr}`;
  }
}
