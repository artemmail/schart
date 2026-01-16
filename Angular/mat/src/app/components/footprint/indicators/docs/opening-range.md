# Opening Range

Purpose: Marks the high/low of the first N minutes/bars of each session.

Parameters:
- Session Definition: Exchange Session or Custom Time.
- Custom Start Hour/Minute (for Custom mode).
- OR Duration: 5m/15m/30m/60m or Bars.
- Bars (used when Duration = Bars).
- Extend to Session End.
- Show Mid.
- Colors, Width, Line Style.

Calculation:
- Session start is either 00:00 or the custom time (local clock).
- OR high/low are tracked during the opening window and optionally extended.

Notes:
- Uses calendar-day sessions; no exchange calendar yet.
- Bands are line-only (no fill shading).
