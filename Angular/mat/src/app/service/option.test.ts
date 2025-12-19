import { OptionCodeParser, OptionData } from "./OptionCodeParser.service";

describe('OptionCodeParser', () => {
  let optionCodeParser: OptionCodeParser;

  beforeEach(() => {
    optionCodeParser = new OptionCodeParser();
  });

  // Пример 1: Недельный опцион на индекс RTS со страйком 130000
  it('should generate correct short and full codes for weekly RTS call option with strike 130000', () => {
    const optionData1: OptionData = {
      assetCode: 'RI',
      strike: 130000,
      settlementType: 'Маржируемый',
      expirationDate: '30.12.19',
      isWeekly: true,
      optionType: 'Колл',
      expirationType: 'Американский'
    };

    const expectedShortCode1 = 'RI130000BM0A';
    const expectedFullCode1 = 'RTSM301219CA130000'; // RTS + M + 301219 + C + A + 130000

    const shortCode = optionCodeParser.generateShortCode(optionData1);
    const fullCode = optionCodeParser.generateLongCode(optionData1);

    expect(shortCode).toBe(expectedShortCode1);
    expect(fullCode).toBe(expectedFullCode1);
  });

  // Пример 2: Недельный опцион на SBER со страйком 240
  it('should generate correct short and full codes for weekly SBER call option with strike 240', () => {
    const optionData2: OptionData = {
      assetCode: 'SR',
      strike: 240,
      settlementType: 'Маржируемый',
      expirationDate: '31.01.24',
      isWeekly: true,
      optionType: 'Колл',
      expirationType: 'Европейский'
    };

    const expectedShortCode2 = 'SR000240BM4A'; // 'B' для 'Маржируемый', 'M' код в settlementTypes='M'
    const expectedFullCode2 = 'SBERM310124CE240'; // SBER + M + 310124 + C + E + 240

    const shortCode = optionCodeParser.generateShortCode(optionData2);
    const fullCode = optionCodeParser.generateLongCode(optionData2);

    expect(shortCode).toBe(expectedShortCode2);
    expect(fullCode).toBe(expectedFullCode2);
  });

  // Пример 3: Месячный опцион на Брент с отрицательным страйком -10
  it('should generate correct short and full codes for Brent call option with negative strike -10', () => {
    const optionData3: OptionData = {
      assetCode: 'BR',
      strike: -10,
      settlementType: 'Маржируемый',
      expirationDate: '25.06.20',
      isWeekly: false,
      optionType: 'Колл',
      expirationType: 'Американский'
    };

    const expectedShortCode3 = 'BR-10MF0'; // 'M' для 'Маржируемый'
    const expectedFullCode3 = 'BRMM250620CA-10'; // BR + M + 250620 + C + A + -10

    const shortCode = optionCodeParser.generateShortCode(optionData3);
    const fullCode = optionCodeParser.generateLongCode(optionData3);

    expect(shortCode).toBe(expectedShortCode3);
    expect(fullCode).toBe(expectedFullCode3);
  });

  // Пример 4: Месячный опцион на Брент с нулевым страйком
  it('should generate correct short and full codes for Brent call option with zero strike', () => {
    const optionData4: OptionData = {
      assetCode: 'BR',
      strike: 0,
      settlementType: 'Маржируемый',
      expirationDate: '25.06.20',
      isWeekly: false,
      optionType: 'Колл',
      expirationType: 'Американский'
    };

    const expectedShortCode4 = 'BR0MF0'; // 'M' для 'Маржируемый'
    const expectedFullCode4 = 'BRMM250620CA0'; // BR + M + 250620 + C + A + 0

    const shortCode = optionCodeParser.generateShortCode(optionData4);
    const fullCode = optionCodeParser.generateLongCode(optionData4);

    expect(shortCode).toBe(expectedShortCode4);
    expect(fullCode).toBe(expectedFullCode4);
  });

});
