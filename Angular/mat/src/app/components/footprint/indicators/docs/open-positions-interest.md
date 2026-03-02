# Open Positions

Purpose: Shows MOEX open positions of legal/physical participants inside FootPrint as a separate indicator panel.

Type:
- `open-positions-interest`
- Default panel: `newPanel`
- Panel behavior: `fixed`
- Visuals: 4 line series

Parameters:
- `Показывать`: `Позиции` or `Число лиц`.
- `Длинные позиции юридических лиц` (checkbox).
- `Короткие позиции юридических лиц` (checkbox).
- `Длинные позиции физических лиц` (checkbox).
- `Короткие позиции физических лиц` (checkbox).

Data source:
- `CommonService.getFutInfo(ticker)` is used to verify that the current symbol is a futures instrument and to resolve base contract code.
- `DataService.getOpenPositionsByContract(contract)` loads the historical open positions table.
- Requests are cached per ticker in FootPrint runtime.

Timeframe behavior:
- If FootPrint period is `< 1 day` (`period < 1440`), daily open-position value is repeated for all bars of that day.
- If FootPrint period is `> 1 day` (`period > 1440`), the latest available open-position value is shown.
- If period is exactly daily, value is mapped by date (latest value up to candle day end).

Status messages in panel:
- `Тикер не задан.`
- `Загрузка открытых позиций...`
- `Инструмент не является фьючерсом.`
- `Нет информации по открытым позициям.`
- `Данные по открытому интересу доступны по подписке.`
- Generic load error message on unexpected failures.

Access:
- Same access model as `/OpenPositions`: non-demo contracts require active subscription.
