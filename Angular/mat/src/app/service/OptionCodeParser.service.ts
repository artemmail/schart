export type OptionSettlementType = 'Премиальный' | 'Маржируемый';
export type OptionType = 'Колл' | 'Пут';
export type OptionExpirationType = 'Американский' | 'Европейский';

export interface OptionData {
  assetCode: string;
  strike: number;
  settlementType: OptionSettlementType;
  /** Основной формат YYYY-MM-DD; DD.MM.YY поддерживается для 2000–2099 годов. */
  expirationDate: string;
  optionType: OptionType;
  expirationType: OptionExpirationType;
  isWeekly?: boolean;
  /** Полный код базового актива; для опциона на фьючерс обязательна серия, например BR-7.20. */
  underlyingCode?: string;
}

/** Строго проверяет календарную дату, возвращая полночь UTC без зависимости от часового пояса. */
export function parseExpirationDate(value: string): Date {
  const iso = typeof value === 'string' ? /^(\d{4})-(\d{2})-(\d{2})$/.exec(value) : null;
  const legacy = typeof value === 'string' ? /^(\d{2})\.(\d{2})\.(\d{2})$/.exec(value) : null;
  const parts = iso ?? legacy;
  if (!parts || parts[0] !== value) {
    throw new Error(`Некорректный формат даты экспирации: ${value}. Ожидается YYYY-MM-DD или DD.MM.YY.`);
  }

  const year = iso ? Number(parts[1]) : 2000 + Number(parts[3]);
  const month = Number(parts[2]);
  const day = Number(parts[iso ? 3 : 1]);
  const date = new Date(Date.UTC(year, month - 1, day));
  // Полный код содержит только две цифры года: явно ограничиваем поддерживаемый век.
  if (year < 2000 || year > 2099 || date.getUTCFullYear() !== year ||
      date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    throw new Error(`Некорректная дата экспирации: ${value}. Ожидается календарная дата 2000–2099 годов.`);
  }
  return date;
}

// Спецификация и контрольные примеры: https://www.moex.com/s205
const MONTH_CODES: Readonly<Record<OptionType, string>> = {
  'Колл': 'ABCDEFGHIJKL',
  'Пут': 'MNOPQRSTUVWX',
};
const WEEK_CODES = 'ABCDE';
const SHORT_SETTLEMENT_TYPES: Readonly<Record<string, {
  settlementType: OptionSettlementType;
  expirationType: OptionExpirationType;
}>> = {
  A: { settlementType: 'Премиальный', expirationType: 'Американский' },
  B: { settlementType: 'Маржируемый', expirationType: 'Американский' },
  C: { settlementType: 'Премиальный', expirationType: 'Европейский' },
};
// Для остальных активов полный код передаётся явно через underlyingCode.
const SPOT_ASSET_CODES = new Map([
  ['SR', 'SBER'], ['SP', 'SBERP'], ['GZ', 'GAZP'],
  ['Si', 'Si'], ['Eu', 'Eu'], ['CR', 'CNY'],
]);

export class OptionCodeParser {
  /**
   * Короткий код не содержит точного дня исполнения и десятилетия.
   * expirationDate берётся из данных контракта и проверяется по полям M/Y/W;
   * календарь праздников и дата месячной экспирации здесь не угадываются.
   */
  parseShortCode(code: string, expirationDate: string): OptionData {
    const match = typeof code === 'string'
      ? /^([A-Za-z0-9]{2})(-?\d+(?:\.\d+)?)([ABC])([A-X])(\d)([A-E])?$/.exec(code)
      : null;
    if (!match || match[0] !== code) {
      throw new Error(`Некорректный короткий код опциона: ${code}`);
    }

    const [, assetCode, strikeText, settlementCode, monthCode, yearDigit, weekCode] = match;
    const date = parseExpirationDate(expirationDate);
    const optionType: OptionType = MONTH_CODES['Колл'].includes(monthCode) ? 'Колл' : 'Пут';
    const isWeekly = weekCode !== undefined;
    if (this.getExpirationCode(date, optionType, isWeekly) !== `${monthCode}${yearDigit}${weekCode ?? ''}`) {
      throw new Error(`Дата экспирации ${expirationDate} не соответствует короткому коду ${code}.`);
    }

    const strike = Number(strikeText);
    this.formatStrike(strike);
    return {
      assetCode,
      strike,
      ...SHORT_SETTLEMENT_TYPES[settlementCode],
      expirationDate: date.toISOString().slice(0, 10),
      optionType,
      isWeekly,
    };
  }

  generateShortCode(optionData: OptionData): string {
    const { date, strike, settlementCode } = this.validateOptionData(optionData);
    const expirationCode = this.getExpirationCode(date, optionData.optionType, optionData.isWeekly ?? false);
    return `${optionData.assetCode}${strike}${settlementCode}${expirationCode}`;
  }

  generateLongCode(optionData: OptionData): string {
    const { date, strike } = this.validateOptionData(optionData);
    const underlyingCode = this.getUnderlyingCode(optionData);
    const settlementCode = optionData.settlementType === 'Маржируемый' ? 'M' : 'P';
    const optionTypeCode = optionData.optionType === 'Колл' ? 'C' : 'P';
    const expirationTypeCode = optionData.expirationType === 'Американский' ? 'A' : 'E';
    const day = String(date.getUTCDate()).padStart(2, '0');
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const year = String(date.getUTCFullYear()).slice(-2);
    return `${underlyingCode}${settlementCode}${day}${month}${year}${optionTypeCode}${expirationTypeCode}${strike}`;
  }

  private validateOptionData(optionData: OptionData): { date: Date; strike: string; settlementCode: string } {
    if (typeof optionData.assetCode !== 'string' || optionData.assetCode.length !== 2 ||
        !/^[A-Za-z0-9]{2}$/.test(optionData.assetCode)) {
      throw new Error(`Некорректный код актива: ${optionData.assetCode}`);
    }
    if (optionData.optionType !== 'Колл' && optionData.optionType !== 'Пут') {
      throw new Error(`Неизвестный тип опциона: ${optionData.optionType}`);
    }
    if (optionData.expirationType !== 'Американский' && optionData.expirationType !== 'Европейский') {
      throw new Error(`Неизвестный тип экспирации: ${optionData.expirationType}`);
    }
    if (optionData.settlementType !== 'Маржируемый' && optionData.settlementType !== 'Премиальный') {
      throw new Error(`Неизвестный тип расчетов: ${optionData.settlementType}`);
    }
    if (optionData.settlementType === 'Маржируемый' && optionData.expirationType === 'Европейский') {
      throw new Error('Маржируемый опцион должен иметь американский тип экспирации.');
    }
    const settlementCode = optionData.settlementType === 'Маржируемый' ? 'B'
      : optionData.expirationType === 'Американский' ? 'A' : 'C';
    return {
      date: parseExpirationDate(optionData.expirationDate),
      strike: this.formatStrike(optionData.strike),
      settlementCode,
    };
  }

  private formatStrike(strike: number): string {
    const text = String(strike);
    if (!Number.isFinite(strike) || !/^-?\d+(?:\.\d+)?$/.test(text)) {
      throw new Error(`Некорректный страйк: ${strike}`);
    }
    // MOEX использует переменную длину страйка, без дополнения нулями.
    return text;
  }

  private getExpirationCode(date: Date, optionType: OptionType, isWeekly: boolean): string {
    const referenceDate = new Date(date.getTime());
    if (isWeekly) {
      // Четверг той же недели (понедельник–воскресенье), включая переход месяца/года.
      const weekdayFromMonday = (referenceDate.getUTCDay() + 6) % 7;
      referenceDate.setUTCDate(referenceDate.getUTCDate() + 3 - weekdayFromMonday);
    }
    const monthCode = MONTH_CODES[optionType][referenceDate.getUTCMonth()];
    const yearDigit = referenceDate.getUTCFullYear() % 10;
    const weekCode = isWeekly ? WEEK_CODES[Math.floor((referenceDate.getUTCDate() - 1) / 7)] : '';
    return `${monthCode}${yearDigit}${weekCode}`;
  }

  private getUnderlyingCode(optionData: OptionData): string {
    if (optionData.expirationType === 'Американский') {
      // Серия базового фьючерса не выводится из даты исполнения самого опциона.
      const code = optionData.underlyingCode;
      if (!code || /^[A-Za-z0-9]+-(?:[1-9]|1[0-2])\.\d{2}$/.exec(code)?.[0] !== code) {
        throw new Error('Для полного кода опциона на фьючерс требуется underlyingCode с серией, например BR-7.20.');
      }
      return code;
    }

    const code = optionData.underlyingCode ?? SPOT_ASSET_CODES.get(optionData.assetCode);
    if (!code || /^[A-Za-z0-9]+$/.exec(code)?.[0] !== code) {
      throw new Error(`Для актива ${optionData.assetCode} требуется полный код underlyingCode.`);
    }
    return code;
  }
}
