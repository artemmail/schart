import type { Column } from 'src/app/models/Column';
import type { StockChartPalette } from 'src/app/services/theme/theme.model';

export function getVolumeCandleColor(
  column: Column,
  totalVolume: number,
  buyVolume: number,
  palette: StockChartPalette,
  selected: boolean,
  soft: boolean = false
): string {
  const isDown = column.o === column.c
    ? buyVolume < totalVolume - buyVolume
    : column.o > column.c;

  if (isDown) {
    if (soft) return selected ? palette.downStrongSoft : palette.downSoft;
    return selected ? palette.downStrong : palette.down;
  }

  if (soft) return selected ? palette.upStrongSoft : palette.upSoft;
  return selected ? palette.upStrong : palette.up;
}
