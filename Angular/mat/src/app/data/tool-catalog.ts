export interface CatalogTool {
  title: string;
  description: string;
  group: string;
  path: string;
  icon: string;
  query?: Record<string, string | number>;
  keywords?: string;
}

export const TOOL_GROUPS = ['Графики', 'Обзор рынка', 'Сканеры', 'Портфель', 'Опционы и фьючерсы', 'Сообщество и помощь'];

export const TOOL_CATALOG: CatalogTool[] = [
  { title: 'Кластерный график (FootPrint)', description: 'Объёмы сделок внутри свечи, дельта и профиль объёма.', group: 'Графики', path: '/FootPrint', query: { mode: 'clusters' }, icon: 'candlestick_chart', keywords: 'кластеры горизонтальные объемы footprint' },
  { title: 'Свечной график', description: 'Цена и объём на выбранном таймфрейме.', group: 'Графики', path: '/FootPrint', query: { mode: 'candles' }, icon: 'show_chart' },
  { title: 'Тиковый график', description: 'Отдельные сделки и их объёмы.', group: 'Графики', path: '/FootPrint', query: { mode: 'ticks', period: 0 }, icon: 'scatter_plot' },
  { title: 'Мультиграфики', description: 'Сравнение нескольких бумаг на одном экране.', group: 'Графики', path: '/MultiCandles', icon: 'grid_view' },
  { title: 'Мультидельта', description: 'Дельта объёмов по нескольким инструментам.', group: 'Графики', path: '/MultiDeltas', icon: 'bar_chart' },
  { title: 'Избранные графики', description: 'Доска сохранённых графиков с настраиваемой сеткой.', group: 'Графики', path: '/FavoritesBoard', icon: 'star' },
  { title: 'Карта рынка', description: 'Изменение цен и объёмы по бумагам и секторам.', group: 'Обзор рынка', path: '/MarketMap', icon: 'map' },
  { title: 'Облигации', description: 'Карта доходности, фильтры и таблица выпусков.', group: 'Обзор рынка', path: '/bonds', icon: 'account_balance' },
  { title: 'Сезонность', description: 'Исторические изменения цен по календарным периодам.', group: 'Обзор рынка', path: '/Report/Seasonality', icon: 'calendar_month' },
  { title: 'Дневной объём торгов', description: 'Суммарная активность на Московской бирже.', group: 'Обзор рынка', path: '/Report/TotalVolume', icon: 'stacked_bar_chart' },
  { title: 'Панель объёмов', description: 'Обзор распределения торговой активности.', group: 'Обзор рынка', path: '/Report/VolumeDashboard', icon: 'dashboard' },
  { title: 'Лидеры рынка', description: 'Лидеры роста, падения и торговых объёмов.', group: 'Сканеры', path: '/Report/Leaders', icon: 'leaderboard' },
  { title: 'Барометр рынка', description: 'Фрактальный барометр Старченко: состояние трендов.', group: 'Сканеры', path: '/Report/Barometer', icon: 'speed' },
  { title: 'Всплески объёмов', description: 'Бумаги с торговыми объёмами выше среднего.', group: 'Сканеры', path: '/Report/VolumeSplash', icon: 'bubble_chart' },
  { title: 'Статистика свечей', description: 'Поиск и сравнение характеристик свечей.', group: 'Сканеры', path: '/Report/CandlesStat', icon: 'insights' },
  { title: 'Крупнейшие сделки', description: 'Поиск крупных сделок за выбранный период.', group: 'Сканеры', path: '/Report/TopOrders', icon: 'search' },
  { title: 'Демо-портфель', description: 'Справка по виртуальной торговле. Сделки доступны в панели графика.', group: 'Портфель', path: '/Portfolio', icon: 'account_balance_wallet' },
  { title: 'Оптимизация портфеля', description: 'Подбор весов бумаг по модели Марковица.', group: 'Портфель', path: '/Portfolio/Optimization', icon: 'balance' },
  { title: 'Парный трейдинг', description: 'Сравнение двух бумаг или составных портфелей.', group: 'Портфель', path: '/FootPrint', query: { mode: 'arbitrage' }, icon: 'compare_arrows' },
  { title: 'Фьючерсы', description: 'Контрактные группы и спецификации инструментов.', group: 'Опционы и фьючерсы', path: '/FuturesList', icon: 'view_list' },
  { title: 'Открытые позиции', description: 'Структура открытых позиций по контрактам.', group: 'Опционы и фьючерсы', path: '/OpenPositions', icon: 'assignment' },
  { title: 'Доска опционов', description: 'Страйки, сроки и котировки опционов.', group: 'Опционы и фьючерсы', path: '/OptionBoard', icon: 'table_view' },
  { title: 'Улыбка волатильности', description: 'Подразумеваемая волатильность по страйкам.', group: 'Опционы и фьючерсы', path: '/VolatilitySmile', icon: 'stacked_line_chart' },
  { title: 'Кривая волатильности', description: 'Сравнение волатильности по срокам.', group: 'Опционы и фьючерсы', path: '/VolatilityGraph', icon: 'timeline' },
  { title: 'Конструктор опционного портфеля', description: 'Моделирование комбинаций опционных позиций.', group: 'Опционы и фьючерсы', path: '/OptionCalcPortfolio', icon: 'calculate' },
  { title: 'Мой опционный портфель', description: 'Расчёт сохранённых опционных позиций.', group: 'Опционы и фьючерсы', path: '/OptionCalcUserPortfolio', icon: 'work' },
  { title: 'Лента блогов', description: 'Публикации и обсуждения пользователей.', group: 'Сообщество и помощь', path: '/ServiceNews', icon: 'rss_feed' },
  { title: 'Написать пост', description: 'Опубликовать исследование или идею.', group: 'Сообщество и помощь', path: '/ServiceNews/Create', icon: 'edit_note' },
  { title: 'Опубликовать изображение', description: 'Загрузить изображение и получить ссылку.', group: 'Сообщество и помощь', path: '/ShareImage', icon: 'image' },
  { title: 'Помощник', description: 'Диалог с аналитическими инструментами (MCP Console).', group: 'Сообщество и помощь', path: '/McpConsole', icon: 'chat', keywords: 'mcp console' },
  { title: 'Тарифы', description: 'Подписка на аналитику и доступ к базе сделок.', group: 'Сообщество и помощь', path: '/Payment', icon: 'payments' },
  { title: 'Справка', description: 'Как пользоваться графиками и разделами сайта.', group: 'Сообщество и помощь', path: '/ServiceNews/Content/karta-razdelov-stockchart-ru', icon: 'help_outline' },
];

export function toolTitleForUrl(url: string): string {
  const path = url.split(/[?#]/)[0];
  return TOOL_CATALOG.find(tool => tool.path === path)?.title ?? (path === '/' ? 'главной странице' : 'выбранному разделу');
}
