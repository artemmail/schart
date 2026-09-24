import { describe, expect, it } from '@jest/globals';
import { OptionCodeParser, OptionData, parseExpirationDate } from './OptionCodeParser.service';

// Контрольные примеры MOEX, а не результаты обратного вызова проверяемой реализации:
// https://www.moex.com/s205 (примеры 1–3 после алгоритма определения Y/M/W).
const moexExamples: { name: string; data: OptionData; shortCode: string; longCode: string }[] = [
  {
    name: 'weekly RTS call crossing the year boundary',
    data: {
      assetCode: 'RI', strike: 130000, settlementType: 'Маржируемый',
      expirationDate: '2019-12-30', isWeekly: true, optionType: 'Колл',
      expirationType: 'Американский', underlyingCode: 'RTS-1.20',
    },
    shortCode: 'RI130000BA0A',
    longCode: 'RTS-1.20M301219CA130000',
  },
  {
    name: 'weekly premium SBER call crossing the month boundary',
    data: {
      assetCode: 'SR', strike: 240, settlementType: 'Премиальный',
      expirationDate: '2024-01-31', isWeekly: true, optionType: 'Колл', expirationType: 'Европейский',
    },
    shortCode: 'SR240CB4A',
    longCode: 'SBERP310124CE240',
  },
  {
    name: 'monthly Brent call with a negative strike',
    data: {
      assetCode: 'BR', strike: -10, settlementType: 'Маржируемый',
      expirationDate: '2020-06-25', isWeekly: false, optionType: 'Колл',
      expirationType: 'Американский', underlyingCode: 'BR-7.20',
    },
    shortCode: 'BR-10BF0',
    longCode: 'BR-7.20M250620CA-10',
  },
  {
    name: 'monthly Brent call with a zero strike',
    data: {
      assetCode: 'BR', strike: 0, settlementType: 'Маржируемый',
      expirationDate: '2020-06-25', isWeekly: false, optionType: 'Колл',
      expirationType: 'Американский', underlyingCode: 'BR-7.20',
    },
    shortCode: 'BR0BF0',
    longCode: 'BR-7.20M250620CA0',
  },
];

const sber: OptionData = moexExamples[1].data;

describe('parseExpirationDate', () => {
  it.each([
    ['2024-02-29', '2024-02-29'],
    ['29.02.24', '2024-02-29'],
    ['30.12.19', '2019-12-30'],
    ['01.01.00', '2000-01-01'],
    ['31.12.99', '2099-12-31'],
  ])('parses %s as UTC calendar date %s', (input, expected) => {
    expect(parseExpirationDate(input).toISOString()).toBe(`${expected}T00:00:00.000Z`);
  });

  it.each([
    '', '2024-1-31', '31.01.2024', '2024/01/31', '2024-01-31T00:00:00Z',
    ' 2024-01-31', '2024-01-31 ', '2024-01-31\n', '31.01.24\n',
    '2024-01-31junk', '2024-00-01', '2024-13-01',
    '2024-01-00', '2024-01-32', '2024-04-31', '2023-02-29', '29.02.23',
    '31.04.24', '00.01.24', '01.13.24', '1999-12-31', '2100-01-01',
  ])('rejects invalid or unsupported date %s', (input) => {
    expect(() => parseExpirationDate(input)).toThrow(/дат/);
  });
});

describe('OptionCodeParser', () => {
  const parser = new OptionCodeParser();

  it.each(moexExamples)('matches the published MOEX example: $name', ({ data, shortCode, longCode }) => {
    expect(parser.generateShortCode(data)).toBe(shortCode);
    expect(parser.generateLongCode(data)).toBe(longCode);

    // DD.MM.YY остаётся допустимым входным форматом, выход парсера всегда ISO.
    const [year, month, day] = data.expirationDate.split('-');
    const legacyData = { ...data, expirationDate: `${day}.${month}.${year.slice(-2)}` };
    expect(parser.generateShortCode(legacyData)).toBe(shortCode);
    expect(parser.generateLongCode(legacyData)).toBe(longCode);

    const { underlyingCode, ...expectedParsed } = data;
    expect(parser.parseShortCode(shortCode, legacyData.expirationDate)).toEqual(expectedParsed);
  });

  it('encodes and parses a premium put independently of the settlement code', () => {
    const data: OptionData = {
      ...sber, assetCode: 'GZ', strike: 190, expirationDate: '2022-10-26', optionType: 'Пут',
    };
    expect(parser.generateShortCode(data)).toBe('GZ190CV2D');
    expect(parser.generateLongCode(data)).toBe('GAZPP261022PE190');
    expect(parser.parseShortCode('GZ190CV2D', '2022-10-26')).toEqual(data);
  });

  it('uses A/P for American premium options on futures', () => {
    const data: OptionData = { ...moexExamples[0].data, settlementType: 'Премиальный' };
    expect(parser.generateShortCode(data)).toBe('RI130000AA0A');
    expect(parser.generateLongCode(data)).toBe('RTS-1.20P301219CA130000');
    expect(parser.parseShortCode('RI130000AA0A', '2019-12-30')).toMatchObject({
      settlementType: 'Премиальный', expirationType: 'Американский', optionType: 'Колл',
    });
  });

  it.each([
    ['01', 'A', 'M'], ['02', 'B', 'N'], ['03', 'C', 'O'], ['04', 'D', 'P'],
    ['05', 'E', 'Q'], ['06', 'F', 'R'], ['07', 'G', 'S'], ['08', 'H', 'T'],
    ['09', 'I', 'U'], ['10', 'J', 'V'], ['11', 'K', 'W'], ['12', 'L', 'X'],
  ])('uses the MOEX call/put month table for month %s', (month, callCode, putCode) => {
    const expirationDate = `2026-${month}-15`;
    const data: OptionData = { ...sber, expirationDate, isWeekly: false };
    expect(parser.generateShortCode(data)).toBe(`SR240C${callCode}6`);
    expect(parser.generateShortCode({ ...data, optionType: 'Пут' })).toBe(`SR240C${putCode}6`);
    expect(parser.parseShortCode(`SR240C${callCode}6`, expirationDate)).toEqual(data);
    expect(parser.parseShortCode(`SR240C${putCode}6`, expirationDate)).toEqual({ ...data, optionType: 'Пут' });
  });

  it.each(['2024-01-29', '2024-01-30', '2024-01-31', '2024-02-01', '2024-02-02', '2024-02-03', '2024-02-04'])(
    'uses the Thursday of the same Monday–Sunday week for %s', (expirationDate) => {
      expect(parser.generateShortCode({ ...sber, expirationDate })).toBe('SR240CB4A');
    },
  );

  it.each([
    ['2024-02-01', 'A'], ['2024-02-08', 'B'], ['2024-02-15', 'C'],
    ['2024-02-22', 'D'], ['2024-02-29', 'E'],
  ])('uses Thursday ordinal for weekly expiration %s', (expirationDate, weekCode) => {
    expect(parser.generateShortCode({ ...sber, expirationDate })).toBe(`SR240CB4${weekCode}`);
    expect(parser.parseShortCode(`SR240CB4${weekCode}`, expirationDate).expirationDate).toBe(expirationDate);
  });

  it('keeps the actual month and date for monthly options', () => {
    const data = { ...sber, isWeekly: false };
    expect(parser.generateShortCode(data)).toBe('SR240CA4');
    expect(parser.generateLongCode(data)).toBe('SBERP310124CE240');
    expect(parser.parseShortCode('SR240CA4', '2024-01-31')).toEqual(data);
  });

  it('treats an omitted weekly flag as a monthly option', () => {
    const { isWeekly, ...data } = sber;
    expect(parser.generateShortCode(data)).toBe('SR240CA4');
  });

  it.each([
    [0, 'SR0CB4A'], [-10, 'SR-10CB4A'], [2.5, 'SR2.5CB4A'],
    [-0.25, 'SR-0.25CB4A'], [130000, 'SR130000CB4A'],
  ])('supports variable-width strike %s without zero padding', (strike, shortCode) => {
    expect(parser.generateShortCode({ ...sber, strike })).toBe(shortCode);
    expect(parser.parseShortCode(shortCode, sber.expirationDate).strike).toBe(strike);
    expect(parser.generateLongCode({ ...sber, strike })).toBe(`SBERP310124CE${strike}`);
  });

  it('preserves the case of currency asset codes', () => {
    const data: OptionData = { ...sber, assetCode: 'Si', strike: 72.5 };
    expect(parser.generateShortCode(data)).toBe('Si72.5CB4A');
    expect(parser.generateLongCode(data)).toBe('SiP310124CE72.5');
    expect(parser.parseShortCode('Si72.5CB4A', sber.expirationDate)).toEqual(data);
  });

  it('uses the supplied expiration date to resolve the decade', () => {
    expect(parser.parseShortCode('SR240CA4', '2034-01-18').expirationDate).toBe('2034-01-18');
  });

  it('requires the actual date instead of guessing a monthly or holiday expiration', () => {
    expect(() => parser.parseShortCode('BR0BF0', undefined!)).toThrow(/дат/);
    expect(() => parser.parseShortCode('RI130000BA0A', undefined!)).toThrow(/дат/);
  });

  it.each([
    ['SR240CB4A', '2024-01-24'], // другая неделя
    ['SR240CA4', '2024-02-15'], // другой месяц
    ['SR240CA4', '2025-01-15'], // другой год
    ['SR240CA4E', '2024-01-31'], // в январе 2024 нет пятого четверга
  ])('rejects expiration metadata inconsistent with %s', (code, date) => {
    expect(() => parser.parseShortCode(code, date)).toThrow(/не соответствует/);
  });

  it.each([
    '', 'SR240MB4A', 'SR240DB4A', 'SR240CY4A', 'SR240CB4F', 'SR240CBXA',
    'SR240CB4AA', 'SR240CB4Aextra', 'SRNaNCB4A', 'SR1.2.3CB4A', 'SR--10CB4A',
    'SR240CB4A\n', 'SR240CB4A ', ' SR240CB4A',
  ])('rejects malformed short code %s', (code) => {
    expect(() => parser.parseShortCode(code, sber.expirationDate)).toThrow(/короткий код/);
  });

  it.each(['2023-02-29', '31.04.24', '2024-1-31', '2024-01-31T00:00:00Z'])(
    'applies the same date validation to both generators for %s', (expirationDate) => {
      expect(() => parser.generateShortCode({ ...sber, expirationDate })).toThrow(/дат/);
      expect(() => parser.generateLongCode({ ...sber, expirationDate })).toThrow(/дат/);
    },
  );

  it.each([NaN, Infinity, -Infinity, 1e21, 1e-7])('rejects a non-decimal or non-finite strike %s', (strike) => {
    expect(() => parser.generateShortCode({ ...sber, strike })).toThrow(/страйк/);
    expect(() => parser.generateLongCode({ ...sber, strike })).toThrow(/страйк/);
  });

  it.each([
    { assetCode: 'SBER' }, { assetCode: 'SR\n' }, { optionType: undefined }, { optionType: 'CALL' },
    { expirationType: undefined }, { expirationType: 'Asian' }, { settlementType: 'Unknown' },
  ])('rejects missing or unknown required fields: %j', (invalid) => {
    const data = { ...sber, ...invalid } as OptionData;
    expect(() => parser.generateShortCode(data)).toThrow();
    expect(() => parser.generateLongCode(data)).toThrow();
  });

  it('rejects an unsupported combination of settlement and exercise styles', () => {
    const data: OptionData = { ...sber, settlementType: 'Маржируемый' };
    expect(() => parser.generateShortCode(data)).toThrow(/американский/);
    expect(() => parser.generateLongCode(data)).toThrow(/американский/);
  });

  it.each([undefined, '', 'RTS', 'RTS-0.20', 'RTS-13.20', 'RTS-1.2020', 'RTS-1.20\n'])(
    'requires an explicit valid underlying futures series, received %s', (underlyingCode) => {
      expect(() => parser.generateLongCode({ ...moexExamples[0].data, underlyingCode })).toThrow(/underlyingCode/);
    },
  );

  it('requires an explicit full code for spot assets outside the built-in mapping', () => {
    const data = { ...sber, assetCode: 'LK' };
    expect(() => parser.generateLongCode(data)).toThrow(/underlyingCode/);
    expect(parser.generateLongCode({ ...data, underlyingCode: 'LKOH' })).toBe('LKOHP310124CE240');
    expect(() => parser.generateLongCode({ ...data, underlyingCode: 'LKOH-3.24' })).toThrow(/underlyingCode/);
    expect(() => parser.generateLongCode({ ...data, underlyingCode: 'LKOH\n' })).toThrow(/underlyingCode/);
  });
});
