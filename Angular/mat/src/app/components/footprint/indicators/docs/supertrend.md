# SuperTrend

Purpose: Trend-following stop line based on ATR; shows up/down trend.

Parameters:
- ATR Length.
- Multiplier.
- Source (default HL2).
- Show Trend Coloring.
- Up Color, Down Color.
- Width, Line Style.

Calculation:
- ATR via Wilder smoothing.
- BasicUpper = src + Mult * ATR
- BasicLower = src - Mult * ATR
- Final bands use standard SuperTrend rules with trend switching.
- Output line is final lower (uptrend) or final upper (downtrend).

Notes:
- If trend coloring is disabled, a single line is drawn.
