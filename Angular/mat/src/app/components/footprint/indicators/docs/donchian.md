# Donchian Channels

Purpose: Breakout channel based on highest high / lowest low over N bars.

Parameters:
- Length: lookback window.
- Show Middle: show midline (upper+lower)/2.
- Upper/Lower/Middle Color.
- Width, Line Style.

Calculation:
- Upper = max(high[i-length+1..i])
- Lower = min(low[i-length+1..i])
- Middle = (Upper + Lower) / 2

Notes:
- Fill between bands is not drawn (line-only renderer).
