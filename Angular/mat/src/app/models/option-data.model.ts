// src/app/models/option-data.model.ts
export interface OptionData {
  assetCode: string;        // Код актива (например, "SR", "RI", "BR")
  strike: number;           // Цена страйка (например, 240, 130000 или -10)
  settlementType: string;   // Тип расчетов (например, "Премиальный" или "Маржируемый")
  expirationDate: string;   // Дата исполнения (например, "2024-01-31")
  optionType?: string;      // Тип опциона (например, "Колл" или "Пут")
  expirationType?: string;  // Тип экспирации (например, "Американский" или "Европейский")
  isWeekly?: boolean;       // Флаг, указывающий, является ли опцион недельным
}

export interface OptionCodeModel {
  assetSymbol: string;    // Символ базового актива
  strikePrice: number;    // Цена страйка
  optionType: 'CALL' | 'PUT';  // Тип опциона: CALL или PUT
  year: number;           // Год исполнения опциона
  month: string;          // Месяц исполнения опциона
  week?: number;          // Неделя исполнения опциона (опционально для недельных опционов)
  isWeek: boolean;        // Показывает, является ли опцион недельным
  calcCode?: 'P' | 'M';   // Код расчетов
  executionDate?: Date;   // Дата исполнения опциона  
  fullCalcType:string;
  expType:string;
  ContractResult: ContractResult;
}

// contract.model.ts

// Интерфейс для отдельного контракта
export interface Contract {
  code_base: string;
  code_futures: string;
  name: string;
}

// Интерфейс для группы контрактов
export interface ContractGroup {
  group: string;
  contracts: Contract[];
}

// Интерфейс для результата поиска
export interface ContractResult {
  group: string;
  code_base: string;
  code_futures: string;
  name: string;
}

export const contractGroups: ContractGroup[] = [
  {
    "group": "Индексные контракты",
    "contracts": [
      {
        "code_base": "MX",
        "code_futures": "MIX",
        "name": "Индекс МосБиржи"
      },
      {
        "code_base": "MM",
        "code_futures": "MXI",
        "name": "Индекс МосБиржи (мини)"
      },
      {
        "code_base": "RI",
        "code_futures": "RTS",
        "name": "Индекс РТС"
      },
      {
        "code_base": "RM",
        "code_futures": "RTSM",
        "name": "Индекс РТС (мини)"
      },
      {
        "code_base": "VI",
        "code_futures": "RVI",
        "name": "Волатильность российского рынка"
      },
      {
        "code_base": "HO",
        "code_futures": "HOME",
        "name": "Индекс московской недвижимости ДомКлик"
      },
      {
        "code_base": "OG",
        "code_futures": "OGI",
        "name": "Индекс МосБиржи нефти и газа"
      },
      {
        "code_base": "MA",
        "code_futures": "MMI",
        "name": "Индекс МосБиржи металлов и добычи"
      },
      {
        "code_base": "FN",
        "code_futures": "FNI",
        "name": "Индекс МосБиржи финансов"
      },
      {
        "code_base": "CS",
        "code_futures": "CNI",
        "name": "Индекс МосБиржи потребительского сектора"
      },
      {
        "code_base": "RB",
        "code_futures": "RGBI",
        "name": "Индекс RGBI"
      },
      {
        "code_base": "IMOEXF",
        "code_futures": "IMOEXF",
        "name": "Индекс Мосбиржи"
      },
      {
        "code_base": "IP",
        "code_futures": "IPO",
        "name": "Индекс Мосбиржи IPO"
      }
    ]
  },
  {
    "group": "Фондовые контракты",
    "contracts": [   {
      "code_base": "AF",
      "code_futures": "AFLT",
      "name": "ПАО \"Аэрофлот\" (о.а.)"
    },
    {
      "code_base": "AL",
      "code_futures": "ALRS",
      "name": "АК \"АЛРОСА\" (ПАО) (о.а.)"
    },
    {
      "code_base": "CH",
      "code_futures": "CHMF",
      "name": "ПАО \"Северсталь\" (о.а.)"
    },
    {
      "code_base": "FS",
      "code_futures": "FEES",
      "name": "ПАО \"ФСК ЕЭС\" (о.а.)"
    },
    {
      "code_base": "GZ",
      "code_futures": "GAZP",
      "name": "ПАО \"Газпром\" (о.а.)"
    },    
    {
      "code_base": "GK",
      "code_futures": "GMKN",
      "name": "ПАО ГМК \"Норильский Никель\" (о.а.)"
    },
    {
      "code_base": "HY",
      "code_futures": "HYDR",
      "name": "ПАО \"РусГидро\" (о.а.)"
    },
    {
      "code_base": "LK",
      "code_futures": "LKOH",
      "name": "ПАО НК \"ЛУКОЙЛ\" (о.а.)"
    },
    {
      "code_base": "MN",
      "code_futures": "MGNT",
      "name": "ПАО \"Магнит\" (о.а.)"
    },
    {
      "code_base": "ME",
      "code_futures": "MOEX",
      "name": "ПАО Московская Биржа (о.а.)"
    },
    {
      "code_base": "MT",
      "code_futures": "MTSI",
      "name": "ПАО \"МТС\" (о.а.)"
    },
    {
      "code_base": "NM",
      "code_futures": "NLMK",
      "name": "ПАО \"НЛМК\" (о.а.)"
    },
    {
      "code_base": "NK",
      "code_futures": "NVTK",
      "name": "ПАО \"НОВАТЭК\" (о.а.)"
    },
    {
      "code_base": "RN",
      "code_futures": "ROSN",
      "name": "ПАО \"НК \"Роснефть\" (о.а.)"
    },
    {
      "code_base": "RT",
      "code_futures": "RTKM",
      "name": "ПАО \"Ростелеком\" (о.а.)"
    },
    {
      "code_base": "SP",
      "code_futures": "SBER",
      "name": "ПАО Сбербанк (п.а.)"
    },
    {
      "code_base": "SR",
      "code_futures": "SBER",
      "name": "ПАО Сбербанк (о.а.)"
    },
    {
      "code_base": "SBERF",
      "code_futures": "SBERF",
      "name": "ПАО Сбербанк (о.а.)"
    },
    {
      "code_base": "SG",
      "code_futures": "SNGSP",
      "name": "ПАО \"Сургутнефтегаз\" (п.а.)"
    },
    {
      "code_base": "SN",
      "code_futures": "SNGS",
      "name": "ПАО \"Сургутнефтегаз\" (о.а.)"
    },
    {
      "code_base": "TT",
      "code_futures": "TATN",
      "name": "ПАО \"Татнефть\" им. В.Д. Шашина (о.а.)"
    },
    {
      "code_base": "TP",
      "code_futures": "TATNP",
      "name": "ПАО \"Татнефть\" им. В.Д. Шашина (п.а.)"
    },
    {
      "code_base": "TN",
      "code_futures": "TRNF",
      "name": "ПАО \"Транснефть\" (п.а.)"
    },
    {
      "code_base": "VB",
      "code_futures": "VTBR",
      "name": "Банк ВТБ (ПАО) (о.а.)"
    },
    {
      "code_base": "MG",
      "code_futures": "MAGN",
      "name": "ПАО \"Магнитогорский металлургический комбинат\" (о.а.)"
    },
    {
      "code_base": "PZ",
      "code_futures": "PLZL",
      "name": "ПАО \"Полюс\" (о.а.)"
    },
    {
      "code_base": "YD",
      "code_futures": "YDEX",
      "name": "МКПАО Яндекс (о.а.)"
    },
    {
      "code_base": "AK",
      "code_futures": "AFKS",
      "name": "АФК Система (о.а.)"
    },
    {
      "code_base": "IR",
      "code_futures": "IRAO",
      "name": "ПАО \"Интер РАО ЕЭС\" (о.а.)"
    },
    {
      "code_base": "PO",
      "code_futures": "POLY",
      "name": "Полиметалл Интернэшнл (о.а.)"
    },
    {
      "code_base": "PI",
      "code_futures": "PIKK",
      "name": "ПИК СЗ (о.а.)"
    },
    {
      "code_base": "SE",
      "code_futures": "SPBE",
      "name": "ПАО \"СПБ Биржа\" (о.а.)"
    },
    {
      "code_base": "RL",
      "code_futures": "RUAL",
      "name": "МКПАО \"Объединённая Компания \"РУСАЛ\" (о.а.)"
    },
    {
      "code_base": "PH",
      "code_futures": "PHOR",
      "name": "ПАО \"ФосАгро\" (о.а.)"
    },
    {
      "code_base": "SS",
      "code_futures": "SMLT",
      "name": "ПАО \"Группа компаний \"Самолет\" (о.а.)"
    },
    {
      "code_base": "MC",
      "code_futures": "MTLR",
      "name": "ПАО \"Мечел\" (о.а.)"
    },
    {
      "code_base": "RE",
      "code_futures": "RSTI",
      "name": "ПАО \"Российские сети\" (о.а.)"
    },
    {
      "code_base": "SO",
      "code_futures": "SIBN",
      "name": "ПАО \"Газпром нефть\" (о.а.)"
    },
    {
      "code_base": "TI",
      "code_futures": "TCSG",
      "name": "МКПАО \"ТКС Холдинг\" (о.а.)"
    },
    {
      "code_base": "FV",
      "code_futures": "FIVE",
      "name": "ГДР Икс 5 Ритейл Груп Н.В"
    },
    {
      "code_base": "VK",
      "code_futures": "VKCO",
      "name": "МКПАО \"ВК\" (о.а.)"
    },
    {
      "code_base": "OZ",
      "code_futures": "OZON",
      "name": "АДР Озон Холдингс Пи Эл Си"
    },
    {
      "code_base": "SF",
      "code_futures": "SPYF",
      "name": "SPY ETF Trust"
    },
    {
      "code_base": "NA",
      "code_futures": "NASD",
      "name": "Invesco QQQ ETF Trust Unit Series 1"
    },
    {
      "code_base": "PS",
      "code_futures": "POSI",
      "name": "ПАО Группа Позитив (о.а.)"
    },
    {
      "code_base": "SX",
      "code_futures": "STOX",
      "name": "iShares Core EURO STOXX 50 UCITS ETF EUR (Dist)"
    },
    {
      "code_base": "HS",
      "code_futures": "HANG",
      "name": "Tracker Fund of Hong Kong ETF"
    },
    {
      "code_base": "DX",
      "code_futures": "DAX",
      "name": "iShares Core DAX UCITS ETF (DE)"
    },
    {
      "code_base": "N2",
      "code_futures": "NIKK",
      "name": "iShares Core Nikkei 225 ETF"
    },
    {
      "code_base": "IS",
      "code_futures": "ISKJ",
      "name": "ПАО \"Артген\" (о.а.)"
    },
    {
      "code_base": "WU",
      "code_futures": "WUSH",
      "name": "ПАО \"ВУШ Холдинг\" (о.а.)"
    },
    {
      "code_base": "MV",
      "code_futures": "MVID",
      "name": "ПАО \"М.Видео\" (о.а.)"
    },
    {
      "code_base": "CM",
      "code_futures": "CBOM",
      "name": "ПАО \"МОСКОВСКИЙ КРЕДИТНЫЙ БАНК\" (о.а.)"
    },
    {
      "code_base": "SZ",
      "code_futures": "SGZH",
      "name": "ПАО \"Сегежа Групп\" (о.а.)"
    },
    {
      "code_base": "BE",
      "code_futures": "BELU",
      "name": "ПАО \"НоваБев Групп\" (о.а.)"
    },
    {
      "code_base": "FL",
      "code_futures": "FLOT",
      "name": "ПАО \"Совкомфлот\" (о.а.)"
    },
    {
      "code_base": "BS",
      "code_futures": "BSPB",
      "name": "ПАО \"Банк \"Санкт-Петербург\" (о.а.)"
    },
    {
      "code_base": "BN",
      "code_futures": "BANE",
      "name": "ПАО АНК \"Башнефть\" (о.а.)"
    },
    {
      "code_base": "KM",
      "code_futures": "KMAZ",
      "name": "ПАО \"КАМАЗ\" (о.а.)"
    },
    {
      "code_base": "AS",
      "code_futures": "ASTR",
      "name": "ПАО Группа Астра (о.а.)"
    },
    {
      "code_base": "S0",
      "code_futures": "SOFL",
      "name": "ПАО \"Софтлайн\" (о.а.)"
    },
    {
      "code_base": "SC",
      "code_futures": "SVCB",
      "name": "ПАО \"Совкомбанк\" (о.а.)"
    },
    {
      "code_base": "R2",
      "code_futures": "R2000",
      "name": "iShares Russell 2000 ETF"
    },
    {
      "code_base": "DJ",
      "code_futures": "DJ30",
      "name": "DJ Industrial Average ETF Trust"
    },
    {
      "code_base": "BB",
      "code_futures": "ALIBABA",
      "name": "АДР на акции Алибаба Груп Холдинг Лимитед"
    },
    {
      "code_base": "BD",
      "code_futures": "BAIDU",
      "name": "АДР на акции Байду Инк."
    },
    {
      "code_base": "RA",
      "code_futures": "RASP",
      "name": "ПАО \"Распадская\" (о.а.)"
    },
    {
      "code_base": "FE",
      "code_futures": "FESH",
      "name": "ПАО \"ДВМП\" (о.а.)"
    },
    {
      "code_base": "RU",
      "code_futures": "RNFT",
      "name": "ПАО НК \"РуссНефть\" (о.а.)"
    },
    {
      "code_base": "LE",
      "code_futures": "LEAS",
      "name": "ПАО \"ЛК \"Европлан\" (о.а.)"
    },
    {
      "code_base": "EM",
      "code_futures": "EM",
      "name": "iShares MSCI Emerging Markets ETF"
    },
    {
      "code_base": "SH",
      "code_futures": "SFIN",
      "name": "ПАО \"ЭсЭфАй\""
    }]
  },  
  {
    "group": "Процентные контракты",
    "contracts": [
      {
        "code_base": "RR",
        "code_futures": "RUON",
        "name": "ставка RUONIA"
      },
      {
        "code_base": "MF",
        "code_futures": "1MFR",
        "name": "ставка RUSFAR"
      }
    ]
  },
  {
    "group": "Валютные контракты",
    "contracts": [
      {
        "code_base": "CR",
        "code_futures": "CNY",
        "name": "курс китайский юань – российский рубль"
      },
      {
        "code_base": "Eu",
        "code_futures": "Eu",
        "name": "курс евро – российский рубль"
      },
      {
        "code_base": "Si",
        "code_futures": "Si",
        "name": "курс доллар США – российский рубль"
      },
      {
        "code_base": "USDRUBF",
        "code_futures": "USDRUBF",
        "name": "курс доллара США - российский рубль"
      },
      {
        "code_base": "EURRUBF",
        "code_futures": "EURRUBF",
        "name": "курс евро - российский рубль"
      },
      {
        "code_base": "CNYRUBF",
        "code_futures": "CNYRUBF",
        "name": "курс китайский юань – российский рубль"
      },
      {
        "code_base": "TY",
        "code_futures": "TRY",
        "name": "курс турецкая лира – российский рубль"
      },
      {
        "code_base": "HK",
        "code_futures": "HKD",
        "name": "курс гонконгский доллар – российский рубль"
      },
      {
        "code_base": "AE",
        "code_futures": "AED",
        "name": "курс дирхам ОАЭ – российский рубль"
      },
      {
        "code_base": "I2",
        "code_futures": "INR",
        "name": "курс индийская рупия – российский рубль"
      },
      {
        "code_base": "KZ",
        "code_futures": "KZT",
        "name": "курс казахстанский тенге – российский рубль"
      },
      {
        "code_base": "AR",
        "code_futures": "AMD",
        "name": "курс армянский драм – российский рубль"
      },
      {
        "code_base": "BY",
        "code_futures": "BYN",
        "name": "курс белорусский рубль – российский рубль"
      },
      {
        "code_base": "ED",
        "code_futures": "ED",
        "name": "курс евро – доллар США"
      },
      {
        "code_base": "AU",
        "code_futures": "AUDU",
        "name": "курс австралийский доллар – доллар США"
      },
      {
        "code_base": "GU",
        "code_futures": "GBPU",
        "name": "курс фунт стерлингов – доллар США"
      },
      {
        "code_base": "CA",
        "code_futures": "UCAD",
        "name": "курс доллар США - канадский доллар"
      },
      {
        "code_base": "CF",
        "code_futures": "UCHF",
        "name": "курс доллар США – швейцарский франк"
      },
      {
        "code_base": "JP",
        "code_futures": "UJPY",
        "name": "курс доллар США – японская йена"
      },
      {
        "code_base": "TR",
        "code_futures": "UTRY",
        "name": "курс доллар США – турецкая лира"
      },
      {
        "code_base": "UC",
        "code_futures": "UCNY",
        "name": "курс доллар США – китайский юань"
      },
      {
        "code_base": "UT",
        "code_futures": "UKZT",
        "name": "курс доллар США – казахстанский тенге"
      },
      {
        "code_base": "EC",
        "code_futures": "ECAD",
        "name": "курс евро – канадский доллар"
      },
      {
        "code_base": "EG",
        "code_futures": "EGBP",
        "name": "курс евро – фунт стерлингов"
      },
      {
        "code_base": "EJ",
        "code_futures": "EJPY",
        "name": "курс евро – японская йена"
      }
    ]
  },
  {
    "group": "Товарные контракты",
    "contracts": [
      {
        "code_base": "BR",
        "code_futures": "BR",
        "name": "нефть Брэнт"
      },
      {
        "code_base": "GD",
        "code_futures": "GOLD",
        "name": "золото"
      },
      {
        "code_base": "GL",
        "code_futures": "GL",
        "name": "Золото (в рублях)"
      },
      {
        "code_base": "GLDRUBF",
        "code_futures": "GLDRUBF",
        "name": "золото"
      },
      {
        "code_base": "PD",
        "code_futures": "PLD",
        "name": "палладий"
      },
      {
        "code_base": "PT",
        "code_futures": "PLT",
        "name": "платина"
      },
      {
        "code_base": "SV",
        "code_futures": "SILV",
        "name": "серебро"
      },
      {
        "code_base": "SA",
        "code_futures": "SUGR",
        "name": "сахар-сырец"
      },
      {
        "code_base": "SL",
        "code_futures": "SLV",
        "name": "серебро (поставочное)"
      },
      {
        "code_base": "AM",
        "code_futures": "ALMN",
        "name": "алюминий"
      },
      {
        "code_base": "CL",
        "code_futures": "CL",
        "name": "нефть сорта Light Sweet Crude Oil"
      },
      {
        "code_base": "Co",
        "code_futures": "Co",
        "name": "медь"
      },
      {
        "code_base": "GO",
        "code_futures": "GLD",
        "name": "золото (поставочный)"
      },
      {
        "code_base": "Nl",
        "code_futures": "Nl",
        "name": "никель"
      },
      {
        "code_base": "Zn",
        "code_futures": "Zn",
        "name": "цинк"
      },
      {
        "code_base": "NG",
        "code_futures": "NG",
        "name": "природный газ"
      },
      {
        "code_base": "WH",
        "code_futures": "WH4",
        "name": "пшеница"
      },
      {
        "code_base": "W4",
        "code_futures": "WHEAT",
        "name": "Индекс пшеницы"
      },
      {
        "code_base": "Su",
        "code_futures": "SUGAR",
        "name": "сахар"
      },
      {
        "code_base": "CC",
        "code_futures": "COCOA",
        "name": "какао"
      }
    ]
  }
]
