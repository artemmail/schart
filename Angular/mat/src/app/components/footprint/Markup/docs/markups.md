# Footprint Markup Gap Analysis and Specs

## Current markups (implemented)
- Edit
- Brush
- Line (segment with optional arrow)
- Rect
- Text
- Horizontal line
- Vertical line
- Ray
- Parallel channel
- Ruler (price/time measurement)
- Profile (manual volume profile box, dockable)
- Strength (range analysis box)
- Fibonacci (angled channel with levels)
- Fibonacci fan

## Common chart markups (baseline expectations)
- Horizontal line (price level)
- Vertical line (time marker)
- Ray (trendline extended in one direction)
- Parallel channel (two parallel lines + optional fill)
- Price/Time ruler (measure between 2 points)
- Arrow/Callout (text + pointer)
- Ellipse/Circle
- Fibonacci extensions / time zones
- Pitchfork

## Gaps vs baseline
Missing or incomplete vs baseline:
- Ellipse/Circle
- Callout
- Fib extensions/time zones
- Pitchfork

## Scope of this change
Implement baseline core drawing tools:
- Horizontal line
- Vertical line
- Ray
- Parallel channel
- Ruler
- Fibonacci fan

Other missing tools are documented for future work.

## Specs

### Horizontal Line
Purpose:
- Mark a price level across the whole chart width.

UX:
- Draw by drag (like Line), but line remains horizontal.
- Dragging any point or the line moves the level.
- Dockable: snaps to nearest priceScale.

Render:
- Draw from chart left to right edges.
- Uses line color/width params.

Params:
- color (palette)
- width (enum)
- dockable (bool, default true)

Acceptance:
- Line is horizontal and spans view width.
- Click on the line selects it even away from endpoints.
- Docking snaps to priceScale when enabled.

### Vertical Line
Purpose:
- Mark a time/bar across the whole chart height.

UX:
- Draw by drag (like Line), but line remains vertical.
- Dragging any point or the line moves the marker.
- Dockable: snaps to nearest bar index.

Render:
- Draw from chart top to bottom edges.
- Uses line color/width params.

Params:
- color (palette)
- width (enum)
- dockable (bool, default true)

Acceptance:
- Line is vertical and spans view height.
- Click on the line selects it even away from endpoints.
- Docking snaps to bar index when enabled.

### Ray
Purpose:
- Trend line that continues in its direction until the chart edge.

UX:
- Draw with 2 points: first is anchor, second sets direction.
- Drag endpoints to change anchor/direction; drag line to move.
- Dockable: snaps points to nearest bar + priceScale.

Render:
- Draw from anchor to intersection with view bounds.
- Optional arrow head at the end.

Params:
- color (palette)
- width (enum)
- arrow (bool, default true)
- dockable (bool, default true)

Acceptance:
- Ray extends from anchor to view boundary in the drawn direction.
- Line is selectable along the extended portion.
- Docking snaps points when enabled.

### Parallel Channel
Purpose:
- Draw a parallel price channel using three points.

UX:
- Point 1 and 2 define the base line.
- Point 3 sets the parallel offset; the second line is auto-computed.
- Dragging a line moves the channel; dragging a corner edits that point.

Render:
- Two parallel lines, optional translucent fill between them.
- Selection handles at all four corners.

Params:
- color (palette)
- width (enum)
- fill (bool, default true)

Acceptance:
- Channel uses three points; fourth corner is derived.
- Lines remain parallel when moving or editing.
- Fill toggles on/off without affecting line visibility.

### Fibonacci Fan
Purpose:
- Fan of angled lines based on Fibonacci ratios from a single anchor.

UX:
- Draw with 2 points: anchor + direction point.
- Fan rays use 38.2/50/61.8/100% slopes.
- Dockable: snaps points to nearest bar + priceScale.

Render:
- Rays extend to chart bounds.
- Optional percentage labels near the line ends.

Params:
- color (palette)
- width (enum)
- showLabels (bool, default true)
- dockable (bool, default true)

Acceptance:
- Fan rays originate from anchor and extend to view boundary.
- Labels match levels and do not overlap the boundary.

### Ruler
Purpose:
- Measure price/time delta between two points.

UX:
- Draw with 2 points.
- Drag endpoints or line to reposition.
- Dockable: snaps points to nearest bar + priceScale.

Render:
- Line plus centered label with delta, percent, bar count, and time span.

Params:
- color (palette)
- width (enum)
- dockable (bool, default true)

Acceptance:
- Label updates live as points move.
- Bar and time deltas reflect data timeline.
