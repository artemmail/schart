# VWAP (Session/Period VWAP)

Purpose: Volume-weighted average price inside an anchor period (session/day/week/month).

Parameters:
- Anchor: Session / Day / Week / Month.
- Price Source: HLC3 (default), HL2, OHLC4, Close.
- Show Bands: enable/disable bands.
- Band Mode: StDev or Percent.
- Band Value: multiplier (StDev) or percent (Percent).
- Color, Band Color, Width, Line Style.

Calculation:
- VWAP = sum(price * volume) / sum(volume) within the anchor period.
- StDev bands use volume-weighted variance.
- Percent bands use VWAP * (1 +/- percent/100).

Notes:
- "Session" uses calendar day boundaries (no exchange-session calendar yet).
- Bands are drawn as lines (no area fill in renderer).
