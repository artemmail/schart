import {
  AfterViewInit,
  Component,
  ComponentRef,
  ElementRef,
  HostListener,
  Injector,
  OnDestroy,
  OnInit,
  Renderer2,
  ViewChild,
  ViewContainerRef,
} from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Title } from '@angular/platform-browser';
import { MaterialModule } from 'src/app/material.module';
import { FootprintWidgetComponent } from '../../footprint/components/footprint-widget/footprint-widget.component';
import {
  FootprintFavorite,
  FootprintFavoritesService,
} from 'src/app/service/FootPrint/Favorites/footprint-favorites.service';
import {
  FootprintFavoritesBoardConfig,
  FootprintFavoritesBoardLayout,
  FootprintFavoritesBoardService,
} from 'src/app/service/FootPrint/Favorites/footprint-favorites-board.service';
import {
  FavoritesBoardSettingsDialogComponent,
  FavoritesBoardSettingsDialogResult,
} from 'src/app/components/Dialogs/favorites-board-settings-dialog/favorites-board-settings-dialog.component';
import {
  FavoritesBoardLayoutDialogComponent,
  FavoritesBoardLayoutDialogResult,
  FavoritesBoardLayoutEntry,
} from 'src/app/components/Dialogs/favorites-board-layout-dialog/favorites-board-layout-dialog.component';

@Component({
  standalone: true,
  selector: 'app-favorites-board',
  imports: [MaterialModule],
  templateUrl: './favorites-board.component.html',
  styleUrls: ['./favorites-board.component.css'],
})
export class FavoritesBoardComponent
  implements OnInit, AfterViewInit, OnDestroy
{
  @ViewChild('container', { read: ViewContainerRef, static: true })
  container!: ViewContainerRef;
  @ViewChild('topPanel', { static: true }) topPanel!: ElementRef;

  favorites: FootprintFavorite[] = [];
  selectedFavorites: FootprintFavorite[] = [];

  components: ComponentRef<FootprintWidgetComponent>[] = [];

  private boardConfig: FootprintFavoritesBoardConfig = {};
  private layoutMap: Record<string, FootprintFavoritesBoardLayout> = {};
  private oldOverflow = '';
  private readonly maxLayoutCount = 16;

  constructor(
    private renderer: Renderer2,
    private injector: Injector,
    private favoritesService: FootprintFavoritesService,
    private boardService: FootprintFavoritesBoardService,
    private dialog: MatDialog,
    title: Title
  ) {
    title.setTitle('Избранные графики');
  }

  ngOnInit(): void {
    this.boardService.getConfig().subscribe({
      next: (config) => this.applyBoardConfig(config),
      error: (err) => {
        console.error('Failed to load favorites board config', err);
        this.applyBoardConfig({});
      },
    });

    this.favoritesService.favorites$.subscribe((favorites) => {
      this.favorites = favorites;
      this.syncSelectionAndBuild();
    });
  }

  ngAfterViewInit(): void {
    this.adjustHeight();
    this.oldOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
  }

  ngOnDestroy(): void {
    document.documentElement.style.overflow = this.oldOverflow;
    this.components.forEach((component) => component.destroy());
  }

  @HostListener('window:resize')
  onResize() {
    this.adjustHeight();
  }

  openFavoritesBoardSettings(): void {
    const dialogRef = this.dialog.open<
      FavoritesBoardSettingsDialogComponent,
      any,
      FavoritesBoardSettingsDialogResult
    >(FavoritesBoardSettingsDialogComponent, {
      width: '640px',
      data: {
        favorites: this.favorites,
        selectedIds: this.getSelectedIdsForDialog(),
      },
      autoFocus: false,
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (!result) {
        return;
      }

      const nextConfig: FootprintFavoritesBoardConfig = {
        favoriteIds: result.selectedIds ?? [],
        layout: this.boardConfig.layout ?? {},
      };

      this.applyBoardConfig(nextConfig);

      this.boardService.saveConfig(nextConfig).subscribe({
        error: (err) =>
          console.error('Failed to save favorites board config', err),
      });
    });
  }

  openFavoritesBoardLayoutSettings(): void {
    const dialogRef = this.dialog.open<
      FavoritesBoardLayoutDialogComponent,
      any,
      FavoritesBoardLayoutDialogResult
    >(FavoritesBoardLayoutDialogComponent, {
      width: '520px',
      data: {
        layoutEntries: this.buildLayoutEntries(),
      },
      autoFocus: false,
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (!result) {
        return;
      }

      const layout: Record<string, FootprintFavoritesBoardLayout> = {};
      (result.layoutEntries ?? []).forEach((entry) => {
        layout[entry.count.toString()] = {
          columns: Math.max(1, Number(entry.columns) || 1),
          rows: Math.max(1, Number(entry.rows) || 1),
        };
      });

      const nextConfig: FootprintFavoritesBoardConfig = {
        favoriteIds: this.boardConfig.favoriteIds ?? [],
        layout,
      };

      this.applyBoardConfig(nextConfig);

      this.boardService.saveConfig(nextConfig).subscribe({
        error: (err) =>
          console.error('Failed to save favorites board config', err),
      });
    });
  }

  private applyBoardConfig(config: FootprintFavoritesBoardConfig): void {
    this.boardConfig = config ?? {};
    this.layoutMap = this.normalizeLayout(this.boardConfig.layout);
    this.syncSelectionAndBuild();
  }

  private getSelectedIdsForDialog(): string[] {
    if (Array.isArray(this.boardConfig.favoriteIds)) {
      return this.boardConfig.favoriteIds;
    }
    return this.favorites.map((favorite) => favorite.id);
  }

  private buildLayoutEntries(): FavoritesBoardLayoutEntry[] {
    const maxCount = Math.max(
      this.maxLayoutCount,
      this.selectedFavorites.length || 0
    );
    const counts = this.getSmoothCounts(maxCount);
    const entries: FavoritesBoardLayoutEntry[] = [];
    counts.forEach((count) => {
      const layout = this.getLayoutForCount(count);
      entries.push({
        count,
        columns: layout.columns,
        rows: layout.rows,
      });
    });
    return entries;
  }

  private normalizeLayout(
    layout?: Record<string, FootprintFavoritesBoardLayout>
  ): Record<string, FootprintFavoritesBoardLayout> {
    const normalized: Record<string, FootprintFavoritesBoardLayout> = {};
    if (!layout) {
      return normalized;
    }

    Object.entries(layout).forEach(([key, value]) => {
      const columns = Math.max(1, Number(value?.columns) || 1);
      const rows = Math.max(1, Number(value?.rows) || 1);
      normalized[key] = { columns, rows };
    });

    return normalized;
  }

  private syncSelectionAndBuild(): void {
    if (!this.container) {
      return;
    }

    const hasExplicitSelection = Array.isArray(this.boardConfig.favoriteIds);
    const selectedIds = hasExplicitSelection
      ? this.boardConfig.favoriteIds ?? []
      : this.favorites.map((favorite) => favorite.id);

    const selectedSet = new Set(selectedIds);
    this.selectedFavorites = this.favorites.filter((favorite) =>
      selectedSet.has(favorite.id)
    );

    this.buildCharts(this.selectedFavorites);
  }

  private buildCharts(favorites: FootprintFavorite[]): void {
    this.components.forEach((component) => component.destroy());
    this.container.clear();

    const host = this.container.element.nativeElement as HTMLElement;
    while (host.firstChild) {
      host.removeChild(host.firstChild);
    }

    favorites.forEach((favorite) => {
      const ref = this.addFootprintComponent(favorite);
      this.components.push(ref);
    });

    this.adjustGrid(favorites.length);
    this.adjustHeight();
  }

  private addFootprintComponent(favorite: FootprintFavorite) {
    const wrap = this.renderer.createElement('div');
    this.renderer.addClass(wrap, 'footprint-item');
    this.renderer.appendChild(this.container.element.nativeElement, wrap);

    const ref = this.container.createComponent(FootprintWidgetComponent, {
      injector: this.injector,
    });
    this.renderer.appendChild(wrap, ref.location.nativeElement);

    ref.instance.caption = favorite.name;
    ref.instance.minimode = false;
    ref.instance.deltamode = false;
    if (favorite.presetIndex !== undefined && favorite.presetIndex !== null) {
      ref.instance.presetIndex = favorite.presetIndex;
    }
    ref.instance.params = { ...favorite.params };

    return ref;
  }

  private adjustHeight() {
    const top = this.topPanel.nativeElement.getBoundingClientRect();
    const host = this.container.element.nativeElement as HTMLElement;
    this.renderer.setStyle(host, 'height', `${window.innerHeight - top.bottom}px`);
  }

  private adjustGrid(count: number) {
    const host = this.container.element.nativeElement as HTMLElement;
    const layout = this.getLayoutForCount(count);
    host.style.setProperty('--columns', layout.columns.toString());
    host.style.setProperty('--rows', layout.rows.toString());
  }

  private getLayoutForCount(count: number): FootprintFavoritesBoardLayout {
    const normalizedCount = this.normalizeCount(count);
    if (normalizedCount <= 0) {
      return { columns: 1, rows: 1 };
    }

    const key = normalizedCount.toString();
    if (this.layoutMap[key]) {
      return this.layoutMap[key];
    }
    return this.getDefaultLayoutForCount(normalizedCount);
  }

  private getDefaultLayoutForCount(
    count: number
  ): FootprintFavoritesBoardLayout {
    const pairs = this.buildFactorPairs(count);
    if (!pairs.length) {
      return { columns: 1, rows: 1 };
    }

    let best = pairs[0];
    let bestDiff = Math.abs(best[0] - best[1]);
    pairs.forEach(([columns, rows]) => {
      const diff = Math.abs(columns - rows);
      const isBetter =
        diff < bestDiff ||
        (diff === bestDiff && columns >= rows && best[0] < best[1]);
      if (isBetter) {
        best = [columns, rows];
        bestDiff = diff;
      }
    });

    return { columns: best[0], rows: best[1] };
  }

  private buildFactorPairs(count: number): [number, number][] {
    const pairs: [number, number][] = [];
    if (count <= 0) {
      return pairs;
    }

    for (let i = 1; i <= count; i += 1) {
      if (count % i === 0) {
        pairs.push([i, count / i]);
      }
    }
    return pairs;
  }

  private normalizeCount(count: number): number {
    if (count <= 1) {
      return 1;
    }

    let limit = Math.max(count, this.maxLayoutCount);
    let smooth = this.getSmoothCounts(limit);
    while (smooth.length && smooth[smooth.length - 1] < count) {
      limit *= 2;
      smooth = this.getSmoothCounts(limit);
    }

    for (const value of smooth) {
      if (value >= count) {
        return value;
      }
    }

    return smooth[smooth.length - 1] ?? count;
  }

  private getSmoothCounts(maxCount: number): number[] {
    const values = new Set<number>();
    values.add(1);
    for (let pow2 = 1; pow2 <= maxCount; pow2 *= 2) {
      for (let value = pow2; value <= maxCount; value *= 3) {
        values.add(value);
      }
    }

    return Array.from(values).sort((a, b) => a - b);
  }
}
