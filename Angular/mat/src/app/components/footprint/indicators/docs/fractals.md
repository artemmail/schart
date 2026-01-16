# Fractals (Bill Williams)

Purpose: Marks local swing highs/lows using left/right bars.

Parameters:
- Left Bars, Right Bars.
- Marker Style: Triangle / Arrow / Dot.
- Up/Down Color, Marker Size.

Calculation:
- Up fractal when High[i] is greater than highs on both sides.
- Down fractal when Low[i] is lower than lows on both sides.

Notes:
- Non-causal: requires future bars (right side).
- Rendered as point markers.
