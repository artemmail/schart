import { ColumnEx } from 'src/app/models/Column';
import { hexToRgb } from 'src/app/service/FootPrint/utils';
import { Point } from '../models/matrix';
import { MarkUpManager } from './markup-manager';
import { Profile } from './profile';
import { ShapePoint } from './shape';

type StrengthLevel = {
  price: number;
  ask: number;
  bid: number;
  total: number;
  delta: number;
};

type AbsorptionZone = {
  price: number;
  type: 'buy' | 'sell';
  weight: number;
};

type HeatBucket = {
  p1: number;
  p2: number;
  delta: number;
};

type StrengthStats = {
  score: number;
  verdict: string;
  verdictLabel: string;
  reason: string;
  priceStart: number;
  priceEnd: number;
  priceChange: number;
  deltaTotal: number;
  absDeltaTotal: number;
  efficiency: number;
  normalizedEfficiency: number;
  responseAsym: number;
  bullAbsCount: number;
  bearAbsCount: number;
  buyStackCount: number;
  sellStackCount: number;
  levels: StrengthLevel[];
  zones: AbsorptionZone[];
  effortHigh: boolean;
};

export class Strength extends Profile {
  constructor(manager: MarkUpManager, params: Record<string, any>) {
    super(manager, params);
    this.type = 'Strength';
  }

  override selectedPoint(point: Point): ShapePoint | null {
    if (!this.sortPoints()) return null;
    const hit = super.selectedPoint(point);
    if (hit) return hit;
    const rect = this.getScreenRect();
    if (
      point.x >= rect.left &&
      point.x <= rect.right &&
      point.y >= rect.top &&
      point.y <= rect.bottom
    ) {
      return { shape: this, point: null };
    }
    return null;
  }

  override drawShape() {
    const ctx = this.footprint.ctx;
    const data = this.footprint.data;
    if (!ctx || !data) return;
    if (!this.sortPoints()) return;

    const rect = this.getScreenRect();
    ctx.save();
    ctx.lineWidth = 1;
    ctx.strokeStyle = this.getSelectionColor();
    ctx.myStrokeRect({ x: rect.left, y: rect.top, w: rect.width, h: rect.height });
    ctx.restore();

    let col1 = Math.trunc(this.vPoints[0].x);
    let col2 = Math.trunc(this.vPoints[1].x);
    if (col2 != this.vPoints[1].x) col2++;
    col1 = Math.max(0, col1);
    col2 = Math.min(data.clusterData.length, col2);
    if (col2 <= col1) return;

    const pMin = Math.min(this.vPoints[0].y, this.vPoints[2].y);
    const pMax = Math.max(this.vPoints[0].y, this.vPoints[2].y);
    const stats = this.buildStats(col1, col2, pMin, pMax);
    if (!stats) return;

    const palette = this.footprint.palette;
    const sscale = this.footprint.colorsService.sscale();
    const pad = Math.max(3, Math.round(4 * sscale));
    const headerFont = Math.round(
      Math.min(18 * sscale, Math.max(10 * sscale, rect.height * 0.18))
    );
    const subFont = Math.round(
      Math.min(13 * sscale, Math.max(8 * sscale, rect.height * 0.12))
    );
    const footerFont = Math.round(
      Math.min(12 * sscale, Math.max(7 * sscale, rect.height * 0.1))
    );
    const noteFont = Math.round(
      Math.min(12 * sscale, Math.max(7 * sscale, rect.height * 0.11))
    );

    const headerHeight = headerFont + subFont + pad * 2;
    const footerHeight = footerFont + pad * 2;

    const innerLeft = rect.left + pad;
    const innerRight = rect.right - pad;
    const innerTop = rect.top + headerHeight;
    const innerBottom = rect.bottom - footerHeight;
    const innerWidth = innerRight - innerLeft;
    const innerHeight = innerBottom - innerTop;

    ctx.save();
    ctx.beginPath();
    ctx.rect(rect.left, rect.top, rect.width, rect.height);
    ctx.clip();

    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    const scoreLabel = stats.score > 0 ? `+${stats.score}` : `${stats.score}`;
    const scoreText = `${scoreLabel} ${stats.verdict}`;
    const verdictColor =
      stats.score > 0 ? palette.upStrong : stats.score < 0 ? palette.downStrong : palette.text;

    ctx.font = `${headerFont}px Verdana`;
    ctx.fillStyle = verdictColor;
    ctx.fillText(this.fitText(ctx, scoreText, rect.width - pad * 2), rect.left + pad, rect.top + pad);

    ctx.font = `${subFont}px Verdana`;
    ctx.fillStyle = palette.textMuted;
    const reasonY = rect.top + pad + headerFont + Math.round(pad * 0.4);
    ctx.fillText(this.fitText(ctx, stats.reason, rect.width - pad * 2), rect.left + pad, reasonY);

    if (innerWidth > 6 && innerHeight > 6) {
      if (stats.levels.length) {
        const levelCount = Math.max(1, Math.round((pMax - pMin) / data.priceScale));
        let bucketCount = Math.min(40, Math.max(20, Math.floor(innerHeight / (4 * sscale))));
        bucketCount = Math.min(bucketCount, levelCount);
        bucketCount = Math.max(1, bucketCount);
        const heat = this.buildHeatBuckets(stats.levels, pMin, pMax, bucketCount);
        if (heat.maxAbsDelta > 0) {
          for (const bucket of heat.buckets) {
            if (bucket.delta === 0) continue;
            const y1 = this.baseToScreen({ x: col1, y: bucket.p1 }).y;
            const y2 = this.baseToScreen({ x: col1, y: bucket.p2 }).y;
            const top = Math.min(y1, y2);
            const bottom = Math.max(y1, y2);
            const clipTop = Math.max(innerTop, top);
            const clipBottom = Math.min(innerBottom, bottom);
            if (clipBottom <= clipTop) continue;
            const intensity = Math.min(1, Math.abs(bucket.delta) / heat.maxAbsDelta);
            const baseColor = bucket.delta > 0 ? palette.upStrong : palette.downStrong;
            ctx.fillStyle = this.rgba(baseColor, 0.08 + intensity * 0.32);
            ctx.myFillRect({ x: innerLeft, y: clipTop, w: innerWidth, h: clipBottom - clipTop });
          }
        }
      }

      if (stats.zones.length) {
        const labelFont = Math.max(7 * sscale, Math.min(11 * sscale, innerHeight * 0.12));
        ctx.font = `${Math.round(labelFont)}px Verdana`;
        ctx.textBaseline = 'middle';
        ctx.textAlign = 'left';
        for (const zone of stats.zones) {
          const r = this.footprint.clusterRect2(zone.price, col1, col2 - col1, this.footprint.viewsManager.viewMain.mtx);
          const zTop = Math.max(innerTop, r.y);
          const zBottom = Math.min(innerBottom, r.y + r.h);
          if (zBottom <= zTop) continue;
          const zoneColor = zone.type === 'sell' ? palette.upSoft : palette.downSoft;
          ctx.fillStyle = this.rgba(zoneColor, 0.35);
          ctx.myFillRect({ x: innerLeft, y: zTop, w: innerWidth, h: zBottom - zTop });
          ctx.fillStyle = palette.text;
          const label = zone.type === 'sell' ? 'ABSORB SELL' : 'ABSORB BUY';
          const labelX = innerLeft + pad;
          const labelY = zTop + (zBottom - zTop) / 2;
          ctx.fillText(this.fitText(ctx, label, innerWidth - pad * 2), labelX, labelY);
        }
      }

      const priceRange = Math.max(pMax - pMin, data.priceScale);
      const moveStrength = Math.min(1, Math.abs(stats.priceChange) / priceRange);
      const arrowStrength = Math.min(1, 0.6 * moveStrength + 0.4 * stats.normalizedEfficiency);
      const arrowWidth = Math.max(1, Math.round(1 + arrowStrength * 5));
      const arrowX1 = innerLeft + pad;
      const arrowX2 = innerRight - pad;
      if (arrowX2 > arrowX1 + 4) {
        const yStart = this.baseToScreen({ x: col1, y: stats.priceStart }).y;
        const yEnd = this.baseToScreen({ x: col2, y: stats.priceEnd }).y;
        const arrowY1 = this.clamp(yStart, innerTop + pad, innerBottom - pad);
        const arrowY2 = this.clamp(yEnd, innerTop + pad, innerBottom - pad);
        const arrowColor =
          stats.priceChange > 0 ? palette.upStrong : stats.priceChange < 0 ? palette.downStrong : palette.textMuted;

        ctx.save();
        ctx.lineWidth = arrowWidth;
        ctx.strokeStyle = arrowColor;
        ctx.lineCap = 'round';
        if (stats.normalizedEfficiency < 0.3 && moveStrength < 0.3) {
          ctx.setLineDash([Math.max(4, 4 * sscale), Math.max(3, 3 * sscale)]);
        }
        ctx.beginPath();
        ctx.moveTo(arrowX1, arrowY1);
        ctx.lineTo(arrowX2, arrowY2);
        ctx.stroke();
        ctx.setLineDash([]);

        const headLength = Math.max(6 * sscale, arrowWidth * 2.4);
        const headWidth = Math.max(3 * sscale, arrowWidth * 1.2);
        ctx.fillStyle = arrowColor;
        ctx.beginPath();
        ctx.ArrowHead(arrowX1, arrowY1, arrowX2, arrowY2, headLength, headWidth);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }

      const noteText = this.getNoteText(stats);
      if (noteText) {
        const lineHeight = Math.round(noteFont + 2 * sscale);
        const noteTop = innerTop + pad;
        const noteMaxLines = 3;
        const maxNoteHeight = noteMaxLines * lineHeight;
        if (noteTop + maxNoteHeight <= innerBottom + pad) {
          ctx.font = `${noteFont}px Verdana`;
          ctx.fillStyle = palette.text;
          ctx.textBaseline = 'top';
          ctx.textAlign = 'left';
          this.drawWrappedText(
            ctx,
            noteText,
            innerLeft,
            noteTop,
            innerWidth,
            lineHeight,
            noteMaxLines
          );
        }
      }
    }

    ctx.textBaseline = 'bottom';
    ctx.textAlign = 'left';
    ctx.font = `${footerFont}px Verdana`;
    ctx.fillStyle = palette.text;
    const deltaText = this.formatShort(stats.deltaTotal);
    const effText = this.formatNumber(stats.normalizedEfficiency, 2);
    const absText = `Abs: Bulls ${stats.bullAbsCount} / Bears ${stats.bearAbsCount}`;
    const imbText = `ImbStacks: ${stats.buyStackCount + stats.sellStackCount}`;
    const metrics = `Delta: ${deltaText}   Eff: ${effText}   ${absText}   ${imbText}`;
    ctx.fillText(this.fitText(ctx, metrics, rect.width - pad * 2), rect.left + pad, rect.bottom - pad);

    ctx.restore();
  }

  private getScreenRect() {
    const pt1 = this.baseToScreen(this.vPoints[0]);
    const pt2 = this.baseToScreen(this.vPoints[2]);
    const left = Math.min(pt1.x, pt2.x);
    const right = Math.max(pt1.x, pt2.x);
    const top = Math.min(pt1.y, pt2.y);
    const bottom = Math.max(pt1.y, pt2.y);
    return {
      left,
      right,
      top,
      bottom,
      width: right - left,
      height: bottom - top,
    };
  }

  private buildStats(col1: number, col2: number, pMin: number, pMax: number): StrengthStats | null {
    const data = this.footprint.data;
    if (!data) return null;
    const bars = data.clusterData.slice(col1, col2) as ColumnEx[];
    if (!bars.length) return null;

    const eps = 1e-9;
    const priceStart = bars[0].o;
    const priceEnd = bars[bars.length - 1].c;
    const priceChange = priceEnd - priceStart;

    let deltaTotal = 0;
    let absDeltaTotal = 0;
    let volumeTotal = 0;
    let buyPressure = 0;
    let sellPressure = 0;
    let buyMove = 0;
    let sellMove = 0;
    let maxHigh = bars[0].h;
    let minLow = bars[0].l;

    const deltaBars: number[] = [];
    const moveBars: number[] = [];
    const absDeltas: number[] = [];

    for (const bar of bars) {
      const deltaBar = typeof bar.deltaTotal === 'number' ? bar.deltaTotal : 2 * bar.bq - bar.q;
      const absDelta = Math.abs(deltaBar);
      const moveBar = bar.c - bar.o;

      deltaBars.push(deltaBar);
      moveBars.push(moveBar);
      absDeltas.push(absDelta);

      deltaTotal += deltaBar;
      absDeltaTotal += absDelta;
      volumeTotal += bar.v ?? 0;

      if (deltaBar > 0) {
        buyPressure += deltaBar;
        if (moveBar > 0) buyMove += moveBar;
      } else if (deltaBar < 0) {
        sellPressure += -deltaBar;
        if (moveBar < 0) sellMove += -moveBar;
      }

      if (bar.h > maxHigh) maxHigh = bar.h;
      if (bar.l < minLow) minLow = bar.l;
    }

    const deltaAvailable = absDeltaTotal > 0;
    const effortTotal = deltaAvailable ? absDeltaTotal : volumeTotal;

    const effortBars: number[] = [];
    const effBars: number[] = [];
    for (let i = 0; i < bars.length; i++) {
      const effort = deltaAvailable ? Math.abs(deltaBars[i]) : Math.abs(bars[i].v ?? 0);
      effortBars.push(effort);
      if (effort > 0) {
        effBars.push(Math.abs(moveBars[i]) / effort);
      }
    }

    const effortThreshold = this.percentile(effortBars, 0.7);
    const avgEffort = effortTotal / Math.max(1, bars.length);
    const effortHigh = effortThreshold > 0 && avgEffort >= effortThreshold;

    const efficiency = Math.abs(priceChange) / Math.max(effortTotal, eps);
    const efficiencyRef = this.percentile(effBars, 0.7);
    const normalizedEfficiency = efficiencyRef > 0 ? Math.min(1, efficiency / efficiencyRef) : 0;

    const buyResponse = buyPressure > 0 ? buyMove / buyPressure : 0;
    const sellResponse = sellPressure > 0 ? sellMove / sellPressure : 0;
    const responseDenom = buyResponse + sellResponse;
    const responseAsym = responseDenom > eps ? (buyResponse - sellResponse) / responseDenom : 0;

    let bullAbsCount = 0;
    let bearAbsCount = 0;
    if (deltaAvailable) {
      const minAbsDelta = this.percentile(absDeltas, 0.6);
      if (minAbsDelta > 0) {
        for (let i = 0; i < bars.length; i++) {
          const bar = bars[i];
          const range = bar.h - bar.l;
          const closePos = range > 0 ? (bar.c - bar.l) / range : 0.5;
          if (deltaBars[i] < -minAbsDelta && closePos >= 0.7) bullAbsCount++;
          if (deltaBars[i] > minAbsDelta && closePos <= 0.3) bearAbsCount++;
        }
      }
    }

    const levels = data.ableCluster() ? this.buildLevels(bars, pMin, pMax) : [];
    const stacks = levels.length ? this.countStacks(levels, 3, 3) : { buy: 0, sell: 0 };
    const stackTotal = stacks.buy + stacks.sell;
    const s1 = this.clamp(responseAsym, -1, 1);
    const s2 = Math.sign(priceChange) * normalizedEfficiency;
    const s3 = (bullAbsCount - bearAbsCount) / Math.max(1, bars.length);
    const s4 = stackTotal > 0 ? (stacks.buy - stacks.sell) / stackTotal : 0;
    const strength = 0.45 * s1 + 0.25 * s2 + 0.2 * s3 + 0.1 * s4;
    const score = Math.max(-100, Math.min(100, Math.round(strength * 100)));

    const verdict = this.getVerdict(score);
    const verdictLabel = this.getVerdictLabel(score);

    const reason = this.getReason(responseAsym, normalizedEfficiency, effortHigh);
    const zones = levels.length
      ? this.buildAbsorptionZones(levels, maxHigh, minLow, data.priceScale)
      : [];

    return {
      score,
      verdict,
      verdictLabel,
      reason,
      priceStart,
      priceEnd,
      priceChange,
      deltaTotal,
      absDeltaTotal: effortTotal,
      efficiency,
      normalizedEfficiency,
      responseAsym,
      bullAbsCount,
      bearAbsCount,
      buyStackCount: stacks.buy,
      sellStackCount: stacks.sell,
      levels,
      zones,
      effortHigh,
    };
  }

  private buildLevels(bars: ColumnEx[], pMin: number, pMax: number): StrengthLevel[] {
    const levelMap = new Map<number, StrengthLevel>();
    for (const bar of bars) {
      if (!bar.cl) continue;
      for (const level of bar.cl) {
        if (level.p < pMin || level.p > pMax) continue;
        const ask = level.bq;
        const bid = level.q - level.bq;
        const existing = levelMap.get(level.p);
        if (existing) {
          existing.ask += ask;
          existing.bid += bid;
          existing.total += level.q;
          existing.delta = existing.ask - existing.bid;
        } else {
          levelMap.set(level.p, {
            price: level.p,
            ask,
            bid,
            total: level.q,
            delta: ask - bid,
          });
        }
      }
    }
    const levels = Array.from(levelMap.values());
    levels.sort((a, b) => a.price - b.price);
    return levels;
  }

  private buildAbsorptionZones(
    levels: StrengthLevel[],
    maxHigh: number,
    minLow: number,
    priceScale: number
  ): AbsorptionZone[] {
    if (!levels.length || !isFinite(maxHigh) || !isFinite(minLow)) return [];
    const totals = levels.map((level) => level.total);
    const hotThreshold = this.percentile(totals, 0.9);
    const maxAbsDelta = Math.max(...levels.map((level) => Math.abs(level.delta)));
    if (maxAbsDelta <= 0) return [];

    const zones: AbsorptionZone[] = [];
    const strongThreshold = 0.6;
    const passMargin = priceScale;
    for (const level of levels) {
      if (level.total < hotThreshold) continue;
      const deltaNorm = level.delta / maxAbsDelta;
      if (deltaNorm >= strongThreshold && maxHigh <= level.price + passMargin) {
        zones.push({ price: level.price, type: 'buy', weight: level.total });
      } else if (deltaNorm <= -strongThreshold && minLow >= level.price - passMargin) {
        zones.push({ price: level.price, type: 'sell', weight: level.total });
      }
    }
    zones.sort((a, b) => b.weight - a.weight);
    return zones.slice(0, 3);
  }

  private buildHeatBuckets(
    levels: StrengthLevel[],
    pMin: number,
    pMax: number,
    bucketCount: number
  ): { buckets: HeatBucket[]; maxAbsDelta: number } {
    const range = Math.max(pMax - pMin, 1e-9);
    const buckets: HeatBucket[] = [];
    for (let i = 0; i < bucketCount; i++) {
      buckets.push({
        p1: pMin + (range * i) / bucketCount,
        p2: pMin + (range * (i + 1)) / bucketCount,
        delta: 0,
      });
    }
    for (const level of levels) {
      const idx = this.clamp(
        Math.floor(((level.price - pMin) / range) * bucketCount),
        0,
        bucketCount - 1
      );
      buckets[idx].delta += level.delta;
    }
    let maxAbsDelta = 0;
    for (const bucket of buckets) {
      maxAbsDelta = Math.max(maxAbsDelta, Math.abs(bucket.delta));
    }
    return { buckets, maxAbsDelta };
  }

  private countStacks(
    levels: StrengthLevel[],
    imbalanceThreshold: number,
    minRun: number
  ): { buy: number; sell: number } {
    let buyRun = 0;
    let sellRun = 0;
    let buyStacks = 0;
    let sellStacks = 0;
    for (const level of levels) {
      const bid = Math.max(level.bid, 1);
      const ask = level.ask;
      const imb = ask / bid;
      const isBuy = imb >= imbalanceThreshold;
      const isSell = imb <= 1 / imbalanceThreshold;
      if (isBuy) {
        buyRun += 1;
        sellRun = 0;
        if (buyRun === minRun) buyStacks += 1;
      } else if (isSell) {
        sellRun += 1;
        buyRun = 0;
        if (sellRun === minRun) sellStacks += 1;
      } else {
        buyRun = 0;
        sellRun = 0;
      }
    }
    return { buy: buyStacks, sell: sellStacks };
  }

  private getVerdict(score: number): string {
    if (score >= 60) return 'STRONG BULL';
    if (score >= 20) return 'BULL / BUY PRESSURE';
    if (score <= -60) return 'STRONG BEAR';
    if (score <= -20) return 'BEAR / SELL PRESSURE';
    return 'NEUTRAL / BALANCE';
  }

  private getVerdictLabel(score: number): string {
    if (score >= 60) return 'Strong Bull';
    if (score >= 20) return 'Bull / Buy Pressure';
    if (score <= -60) return 'Strong Bear';
    if (score <= -20) return 'Bear / Sell Pressure';
    return 'Neutral / Balance';
  }

  private getReason(responseAsym: number, normalizedEfficiency: number, effortHigh: boolean): string {
    if (responseAsym > 0.25) return 'Buys drive, sells absorbed';
    if (responseAsym < -0.25) return 'Sells drive, buys trapped';
    if (normalizedEfficiency < 0.35 && effortHigh) return 'Effort high, result weak -> absorption';
    if (normalizedEfficiency > 0.65) return 'Clean drive';
    return 'Balance / rotation';
  }

  private getNoteText(stats: StrengthStats): string {
    const note = typeof this.params?.text === 'string' ? this.params.text.trim() : '';
    if (note) return note;
    if (!stats.reason) return '';
    return `${stats.verdictLabel}: ${stats.reason}`;
  }

  private formatNumber(value: number, digits: number): string {
    if (!isFinite(value)) return '0';
    return Number(value.toFixed(digits)).toString();
  }

  private formatShort(value: number): string {
    if (!isFinite(value) || value === 0) return '0';
    const abs = Math.abs(value);
    if (abs >= 1e9) return `${this.formatSigned(value / 1e9, 1)}b`;
    if (abs >= 1e6) return `${this.formatSigned(value / 1e6, 1)}m`;
    if (abs >= 1e3) return `${this.formatSigned(value / 1e3, 1)}k`;
    return this.formatSigned(value, 0);
  }

  private formatSigned(value: number, digits: number): string {
    const sign = value > 0 ? '+' : value < 0 ? '-' : '';
    return `${sign}${this.formatNumber(Math.abs(value), digits)}`;
  }

  private percentile(values: number[], p: number): number {
    if (!values.length) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const idx = Math.min(sorted.length - 1, Math.max(0, Math.floor(p * (sorted.length - 1))));
    return sorted[idx];
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
  }

  private rgba(color: string, alpha: number): string {
    const rgb = hexToRgb(color);
    return `rgba(${rgb.r},${rgb.g},${rgb.b},${alpha})`;
  }

  private fitText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
    if (maxWidth <= 0) return '';
    if (ctx.measureText(text).width <= maxWidth) return text;
    const suffix = '...';
    let trimmed = text;
    while (trimmed.length > 0 && ctx.measureText(trimmed + suffix).width > maxWidth) {
      trimmed = trimmed.slice(0, -1);
    }
    return trimmed ? trimmed + suffix : '';
  }

  private drawWrappedText(
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    maxWidth: number,
    lineHeight: number,
    maxLines: number
  ): void {
    if (!text || maxWidth <= 0 || maxLines <= 0) return;
    const paragraphs = text.split(/\r?\n/);
    let lineCount = 0;
    for (const paragraph of paragraphs) {
      const words = paragraph.split(/\s+/).filter(Boolean);
      let line = '';
      for (let i = 0; i < words.length; i++) {
        const testLine = line ? `${line} ${words[i]}` : words[i];
        if (ctx.measureText(testLine).width > maxWidth && line) {
          ctx.fillText(line, x, y);
          lineCount += 1;
          if (lineCount >= maxLines) return;
          line = words[i];
          y += lineHeight;
        } else {
          line = testLine;
        }
      }
      if (line) {
        ctx.fillText(line, x, y);
        lineCount += 1;
        if (lineCount >= maxLines) return;
        y += lineHeight;
      }
    }
  }
}


