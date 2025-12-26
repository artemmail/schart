# Анализ FootPrintComponent

## Краткое описание текущей логики
- Компонент принимает множество входов (параметры графика, режимы отображения, обработчик postInit) и сразу прокидывает их в внутренний `FootprintStateService`, инициируя инициализацию вида при каждом изменении параметров.【F:Angular/mat/src/app/components/footprint/footprint.component.ts†L41-L187】
- В `ngAfterViewInit` создаётся контекст canvas, инициируются менеджеры работы с мышью, видами и разметкой, после чего состояние помечается как инициализированное и запускается повторная инициализация отображения.【F:Angular/mat/src/app/components/footprint/footprint.component.ts†L380-L399】
- Первичная отрисовка и последующие перестроения выполняются через цепочку `initSize()` → `resize()` → `drawClusterView()`, которую вызывают разные методы (`applySettings`, `applyData`, `initializeViewIfReady`, `handleRealtimeUpdate`).【F:Angular/mat/src/app/components/footprint/footprint.component.ts†L327-L469】
- Компонент сам управляет служебными сервисами (цвета, уровни, макет, подсказки), экспортом CSV, расчётом матриц и обработкой реального времени, что объединяет несколько доменов в одном классе.【F:Angular/mat/src/app/components/footprint/footprint.component.ts†L129-L238】

## Оценка необходимости рефакторинга
- **Множественность ответственностей.** Компонент одновременно отвечает за хранение состояния, вычисление матриц макета, работу с canvas, подсказками, экспортом данных и разметкой. Такое пересечение обязанностей затрудняет поддержку и тестирование.【F:Angular/mat/src/app/components/footprint/footprint.component.ts†L129-L238】
- **Дублирование инициализационных цепочек.** Последовательность `initSize()` → `resize()` → `drawClusterView()` повторяется в нескольких методах без единой точки входа, что повышает риск несовместимых изменений и затрудняет контроль за порядком вызовов.【F:Angular/mat/src/app/components/footprint/footprint.component.ts†L327-L469】
- **Обширное публичное API и изменяемые поля.** Большое количество публичных свойств (`canvas`, `ctx`, метки цен, массивы объёмов) и использование `var`/прямых записей в состояние усложняют отслеживание побочных эффектов и не дают чётких инвариантов.【F:Angular/mat/src/app/components/footprint/footprint.component.ts†L55-L124】
- **Локальная обработка событий окна.** Логика ресайза и слияния матриц (`resize`, `mergeMatrix`, `handleRealtimeUpdate`) встроена непосредственно в компонент, хотя её можно инкапсулировать в сервис макета, чтобы снизить связность.【F:Angular/mat/src/app/components/footprint/footprint.component.ts†L213-L350】

**Вывод:** компонент нуждается в рефакторинге, чтобы выделить чистые ответственности, сократить дублирование и облегчить сопровождение.

## Предлагаемые направления рефакторинга
1. **Выделить инициализационный оркестратор.** Создать единый метод/сервис, который управляет порядком вызовов `initSize`, `resize` и `drawClusterView`, чтобы исключить повторение логики в `applySettings`, `applyData` и `initializeViewIfReady`.【F:Angular/mat/src/app/components/footprint/footprint.component.ts†L327-L469】
2. **Разделить зоны ответственности.**
   - Вынести работу с подсказками и экспортом CSV в отдельные директивы/сервисы, оставив компоненту только координацию.【F:Angular/mat/src/app/components/footprint/footprint.component.ts†L149-L170】
   - Переместить расчёт матриц и работу с ресайзом в `FootprintLayoutService`, чтобы компонент лишь реагировал на события.【F:Angular/mat/src/app/components/footprint/footprint.component.ts†L213-L350】
3. **Сократить публичные поля и неявные мутации.** Ограничить внешнюю видимость для служебных свойств, заменить `var` на `const/let`, а обновление состояния завернуть в методы `FootprintStateService`, чтобы снизить вероятность несогласованных изменений.【F:Angular/mat/src/app/components/footprint/footprint.component.ts†L55-L186】
4. **Обновить post-init механизм.** Обернуть `postInit` в типизированный хук или Observable и централизовать вызов в одном месте после успешной инициализации, чтобы избежать расхождений между реализацией по умолчанию и пользовательским обработчиком.【F:Angular/mat/src/app/components/footprint/footprint.component.ts†L401-L469】
