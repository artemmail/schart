import { projectColorByValue, TreeMapColorScale } from 'stockchart-treemap';

export interface MockTreemapNode {
  name: string;
  value: number;
  change?: number;
  ticker?: string;
  items?: MockTreemapNode[];
  color?: string;
}

const defaultScale: TreeMapColorScale = {
  min: '#EB5757',
  center: '#F2F2F2',
  max: '#27AE60'
};

function randomBetween(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

export function createMockMarketMap(sectors = 6, tickersPerSector = 8): MockTreemapNode[] {
  const data: MockTreemapNode[] = [];

  for (let i = 0; i < sectors; i++) {
    const tickers: MockTreemapNode[] = [];
    let sectorChangeSum = 0;
    let sectorVolume = 0;

    for (let j = 0; j < tickersPerSector; j++) {
      const change = randomBetween(-6, 6);
      const volume = Math.round(randomBetween(5, 60));
      sectorVolume += volume;
      sectorChangeSum += change;

      tickers.push({
        name: `Ticker ${i + 1}-${j + 1}`,
        ticker: `T${i + 1}${j + 1}`,
        value: volume,
        change,
        color: projectColorByValue(change, -6, 6, defaultScale)
      });
    }

    const sectorChange = sectorChangeSum / tickersPerSector;
    data.push({
      name: `Sector ${i + 1}`,
      value: Math.round(sectorVolume),
      change: sectorChange,
      color: projectColorByValue(sectorChange, -6, 6, defaultScale),
      items: tickers
    });
  }

  return data;
}

export function createPerformanceTreemap(groups = 3, instrumentsPerGroup = 6): MockTreemapNode[] {
  const data: MockTreemapNode[] = [];

  for (let g = 0; g < groups; g++) {
    const items: MockTreemapNode[] = [];
    for (let i = 0; i < instrumentsPerGroup; i++) {
      const performance = randomBetween(-12, 12);
      const weight = randomBetween(8, 40);
      items.push({
        name: `Asset ${g + 1}-${i + 1}`,
        value: Math.round(weight),
        change: performance
      });
    }

    data.push({
      name: `Portfolio ${g + 1}`,
      value: Math.round(items.reduce((sum, item) => sum + item.value, 0)),
      change: items.reduce((sum, item) => sum + (item.change ?? 0), 0) / items.length,
      items
    });
  }

  return data;
}

export const performanceColorScale: TreeMapColorScale = {
  min: '#E53935',
  center: '#F5F5F5',
  max: '#2E7D32'
};
