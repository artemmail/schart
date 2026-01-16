# WMA (Weighted Moving Average)

Purpose: Linear-weighted moving average (recent bars have higher weight).

Parameters:
- Length: period length.
- Source: price source.
- Offset: shift line by N bars.
- Color, Width, Line Style.

Calculation:
- Weights 1..length across the window.
- WMA = sum(weight * src) / sum(weights).

Notes:
- Offset shifts the output series; early/late bars may be empty (NaN).
