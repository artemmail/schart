import { Component, DestroyRef, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormControl } from '@angular/forms';
import { catchError, debounceTime, of, switchMap } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MaterialModule } from '../../../material.module';
import { TOOL_CATALOG, TOOL_GROUPS } from '../../../data/tool-catalog';
import { TickerService } from '../../../service/FootPrint/AutoComplete/AutoComplete';
import { UiAnalyticsService } from '../../../service/ui-analytics.service';
import { SelectListItemText } from '../../../models/preserts';

@Component({
  standalone: true,
  selector: 'app-tool-catalog',
  imports: [MaterialModule],
  templateUrl: './tool-catalog.component.html',
  styleUrls: ['./tool-catalog.component.css'],
})
export class ToolCatalogComponent {
  readonly groups = TOOL_GROUPS;
  readonly tools = TOOL_CATALOG;
  readonly search = new FormControl('');
  group = '';
  tickers: SelectListItemText[] = [];
  searching = false;
  searchError = false;
  private destroyRef = inject(DestroyRef);

  constructor(private route: ActivatedRoute, private router: Router, tickerService: TickerService, analytics: UiAnalyticsService) {
    analytics.track('catalog_open');
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(params => {
      this.group = this.groups.includes(params.get('group')) ? params.get('group') : '';
      if ((params.get('q') ?? '') !== this.search.value) this.search.setValue(params.get('q') ?? '');
    });
    this.search.valueChanges.pipe(
      debounceTime(250),
      switchMap(query => {
        void this.router.navigate([], { relativeTo: this.route, queryParams: { q: query || null }, queryParamsHandling: 'merge', replaceUrl: true });
        this.searchError = false;
        this.searching = !!query?.trim();
        return query?.trim() ? tickerService.findByMask(query.trim(), 10, true).pipe(catchError(() => {
          this.searchError = true;
          return of([]);
        })) : of([]);
      }), takeUntilDestroyed(this.destroyRef)
    ).subscribe(items => { this.tickers = (items ?? []).slice(0, 10); this.searching = false; });
    if (this.search.value) this.search.setValue(this.search.value);
  }

  get filteredTools() {
    const query = (this.search.value ?? '').trim().toLocaleLowerCase('ru');
    return this.tools.filter(tool => (!this.group || tool.group === this.group) &&
      `${tool.title} ${tool.description} ${tool.keywords ?? ''}`.toLocaleLowerCase('ru').includes(query));
  }

  retrySearch(): void { this.search.setValue(this.search.value); }

  selectGroup(group: string): void {
    void this.router.navigate([], { relativeTo: this.route, queryParams: { group: group || null }, queryParamsHandling: 'merge', replaceUrl: true });
  }
}
