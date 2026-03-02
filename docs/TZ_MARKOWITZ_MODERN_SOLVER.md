# ТЗ: модернизация решателя Марковица (legacy + modern)

Дата: 2026-02-08

## 1. Цель

Добавить современный QP-решатель для задачи Марковица в параллельном режиме с legacy-реализацией, чтобы:

1. сравнивать результаты до вывода legacy из эксплуатации;
2. не ломать текущие API-контракты;
3. тестировать через REST и MCP.

## 2. Обязательные требования

1. Сохранить существующий `legacy` solver (Microsoft Solver Foundation) без изменения поведения.
2. Добавить `modern` solver на базе `Accord.Math` (`GoldfarbIdnani`).
3. Оставить `MarkovitzMcp` как read-only endpoint, добавить переключение `solver`.
4. Добавить compare-endpoint для диагностики расхождений `legacy` vs `modern`.
5. В MCP tool `portfolio_markowitz` добавить optional `solver`.

## 3. Контракт solver-переключателя

Допустимые значения:

1. `legacy` — текущий алгоритм;
2. `modern` — новый алгоритм;
3. алиасы на `modern`: `accord`, `z3` (для обратной совместимости тестовых клиентов).

Если значение невалидно — `400 BadRequest`.

## 4. Логика modern solver

1. Расчёт доходностей и ковариации оставить в том же формате, что в legacy.
2. Ограничения:
   - `sum(w_i) = 1`
   - `E[R] >= minimum`
   - `0 <= w_i <= 1`
3. Целевая функция: минимизация дисперсии `w^T C w`.
4. Для устойчивости добавить попытки с диагональной регуляризацией ковариации (jitter) при проблемах PD-матрицы.

## 5. Compare endpoint

`GET /api/Portfolio/MarkovitzMcpCompare` должен возвращать:

1. `legacy` и `modern` решения;
2. дельты по `actual/stddev`;
3. метрики расхождения весов (`max/mean`, топ отличий);
4. флаги `comparable` и `withinTolerance`.

## 6. MCP изменения

`portfolio_markowitz(...)`:

1. добавить optional `solver`;
2. валидировать against `legacy|modern|accord|z3`;
3. прокидывать `solver` в `/api/Portfolio/MarkovitzMcp`.

## 7. Критерии приемки

1. `dotnet build` проходит без ошибок.
2. `MarkovitzMcp` с `solver=legacy` и `solver=modern` возвращает успешный ответ на одном наборе тикеров.
3. `MarkovitzMcpCompare` возвращает сравнение без таймаутов.
4. MCP `portfolio_markowitz` принимает `solver` и корректно отрабатывает валидацию.

## 8. Расширение (пункты 1-3)

Реализованы расширения поверх базового ТЗ:

1. Режимы оптимизации:
   - `min_variance` (risk = target return);
   - `max_return` (risk = max stddev);
   - `max_sharpe` (risk = max stddev, + `riskFreeRate`).
2. Ограничения:
   - `minWeight`, `maxWeight` (границы на вес бумаги);
   - `sectorMaxWeights` в формате `sectorKey:weight,...` (лимиты на сектор).
3. Автотест сравнения:
   - `tools/markowitz_compare_smoke.ps1` (проверяет `legacy` vs `modern` на фиксированных кейсах/рисках с порогами расхождений).
