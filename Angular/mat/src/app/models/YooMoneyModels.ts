// Модель OperationDetails
export interface OperationDetails {
    error: string;
    operation_id: string;
    status: string;
    pattern_id: string;
    direction: string;
    amount: number;
    amount_due?: number;
    fee?: number;
    datetime: Date;
    title: string;
    sender: string;
    recipient: string;
    recipient_type: string;
    message: string;
    comment: string;
    label: string;
    details: string;
    type: string;
    digital_goods?: DigitalGoods; // Данные о цифровом товаре (при наличии)
  }
  
  // Модель DigitalGoods
  export interface DigitalGoods {
    article: DigitalArticle[]; // Список товаров
    bonus: DigitalBonus[]; // Список бонусов
  }
  
  // Модель DigitalArticle для каждого товара в digital_goods.article
  export interface DigitalArticle {
    merchantArticleId: string; // Идентификатор товара в системе продавца
    serial: string; // Серийный номер товара
    secret: string; // Секретная часть цифрового товара
  }
  
  // Модель DigitalBonus для каждого бонуса в digital_goods.bonus
  export interface DigitalBonus {
    serial: string; // Серийный номер бонуса
    secret: string; // Секрет бонуса
  }
  
  // Модель OperationHistory
  export interface OperationHistory {
    operation_id: string;         // Уникальный идентификатор операции
    status: string;               // Статус операции (например, "completed", "pending")
    type: string;                 // Тип операции: "deposition" или "payment"
    amount: number;               // Сумма операции
    datetime: Date;                   // Дата операции
    label?: string;               // Метка операции, если указана
    details?: boolean;            // Логический флаг для отображения деталей
    title: string;                // Краткое описание операции
    direction: string;            // Направление операции: "in" или "out"
    description?: string;         // Описание или заметка к операции, если присутствует
    group_id: string;             // Группа операции
    pattern_id?: string;          // Идентификатор шаблона, если присутствует
    amount_currency: string;      // Валюта суммы операции
    is_sbp_operation: boolean;    // Флаг для операций СБП
    spendingCategories: SpendingCategory[]; // Категории расходов
  }
  
  // Модель SpendingCategory
  export interface SpendingCategory {
    name: string;                 // Имя категории расходов
    sum: number;                  // Сумма по категории расходов
  }