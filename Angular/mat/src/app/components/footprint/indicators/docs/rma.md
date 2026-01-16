# RMA / SMMA (Smoothed Moving Average)

Purpose: Wilder-style smoothing, smoother than EMA (used in RSI).

Parameters:
- Length: period length.
- Source: price source.
- Offset: shift line by N bars.
- Color, Width, Line Style.

Calculation:
- RMA[i] = (RMA[i-1] * (length - 1) + src[i]) / length
- First value uses SMA of the first window.

Notes:
- Offset shifts the output series; early/late bars may be empty (NaN).
