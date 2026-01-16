# EMA (Exponential Moving Average)

Purpose: Exponential moving average that reacts faster than SMA.

Parameters:
- Length: period length.
- Source: price source (close/open/high/low/hl2/hlc3/ohlc4).
- Offset: shift line by N bars (+ right, - left).
- Color, Width, Line Style.

Calculation:
- EMA[i] = EMA[i-1] + alpha * (src[i] - EMA[i-1])
- alpha = 2 / (length + 1)
- First EMA value uses SMA of the first window.

Notes:
- Offset shifts the output series; early/late bars may be empty (NaN).
