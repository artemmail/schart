# Pivot Points

Purpose: Draws pivot levels (P, R1..R3, S1..S3) based on prior period.

Parameters:
- Pivot Timeframe: Daily / Weekly / Monthly.
- Method: Classic / Fibonacci / Camarilla / Woodie.
- Levels: 1..3 (how many R/S levels to show).
- Show Labels (reserved).
- Extend Lines: Current period / To right / Full chart.
- Colors for P / R / S, Width, Line Style.

Calculation:
- Levels are computed from the previous period's High/Low/Close.
- Methods follow standard formulas (Classic/Fib/Camarilla/Woodie).

Notes:
- "Extend" uses line visibility per period; no forward projection beyond data.
- Label rendering is not implemented yet.
