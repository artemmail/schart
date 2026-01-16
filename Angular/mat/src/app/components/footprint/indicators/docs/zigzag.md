# ZigZag

Purpose: Simplifies price into swing segments based on deviation and depth.

Parameters:
- Deviation Mode: Percent or Points.
- Deviation: minimum move to confirm a swing.
- Depth: minimum bars between pivots.
- Backstep: treated as additional minimum spacing.
- Show Pivot Labels (reserved).
- Color, Width, Line Style.

Calculation:
- Scans highs/lows and confirms pivots when price reverses by the deviation.
- Line segments are interpolated between pivots.

Notes:
- This implementation uses a simplified depth/backstep rule.
- Label rendering is not implemented yet.
