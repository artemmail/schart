# Keltner Channels (ATR Channel)

Purpose: Volatility channel based on ATR and a moving average basis.

Parameters:
- MA Length, ATR Length.
- MA Source (price).
- MA Type: EMA or SMA.
- ATR Multiplier.
- Basis/Upper/Lower Color.
- Width, Line Style.

Calculation:
- Basis = MA(source, maLength)
- ATR = Wilder ATR(atrLength)
- Upper = Basis + Mult * ATR
- Lower = Basis - Mult * ATR

Notes:
- Fill between bands is not drawn (line-only renderer).
