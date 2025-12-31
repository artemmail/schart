import {
  Component,
  OnInit,
  OnDestroy,
  Input,
  ElementRef,
  ChangeDetectorRef,
  ViewChild,
  AfterViewInit,
  DestroyRef,
  inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatTable, MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { BehaviorSubject, interval, Observable, of } from 'rxjs';
import { startWith, switchMap, distinctUntilChanged, tap } from 'rxjs/operators';
import { Leader } from 'src/app/models/Leaders';
import { environment } from 'src/app/environment';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MoneyToStrPipe } from 'src/app/pipes/money-to-str.pipe';
import { CostToStrPipe } from 'src/app/pipes/cost-to-str.pipe copy';

@Component({
  standalone: true,
  selector: 'app-leaderboard-table',
  templateUrl: './leaderboard-table.component.html',
  styleUrls: ['./leaderboard-table.component.css'],
  imports: [CommonModule, MatTableModule, MatSortModule, RouterModule, MoneyToStrPipe, CostToStrPipe],
})
export class LeaderboardTableComponent implements OnInit, OnDestroy, AfterViewInit {
  @Input() market: number = 0;
  @Input() type: number = 1;
  @Input() instanceId: string = 'leaderboard'; // Уникальный идентификатор для trackBy

  displayedColumns: string[] = ['ticker', 'cls', 'volume', 'percent'];
  dataSource: MatTableDataSource<Leader> = new MatTableDataSource<Leader>([]);
  isLoading = true;

  private intersectionObserver: IntersectionObserver;
  private readonly visibility$ = new BehaviorSubject<boolean>(false);
  private readonly destroyRef = inject(DestroyRef);

  @ViewChild(MatTable) table: MatTable<Leader>;
  @ViewChild(MatSort) sort: MatSort;
  @ViewChild('leaderboardTable', { static: true }) leaderboardTable: ElementRef;

  constructor(private cdr: ChangeDetectorRef, private el: ElementRef) {}

  ngOnInit() {
    // nothing yet
  }

  ngAfterViewInit() {
    this.attachSort();

    this.intersectionObserver = new IntersectionObserver(
      (entries) => {
        const isVisible = entries.some((entry) => entry.isIntersecting);
        this.visibility$.next(isVisible);
      },
      { threshold: 0.1 }
    );

    this.intersectionObserver.observe(this.el.nativeElement);
    this.bindDataStream();
    this.cdr.detectChanges();
  }

  ngOnDestroy() {
    if (this.intersectionObserver) {
      this.intersectionObserver.disconnect();
    }
    this.visibility$.complete();
  }

  private bindDataStream() {
    this.visibility$
      .pipe(
        tap((visible) => {
          if (visible) {
            this.isLoading = true;
          }
        }),
        distinctUntilChanged(),
        switchMap((visible) =>
          visible
            ? interval(2000).pipe(startWith(0), switchMap(() => this.fetchData()))
            : of([] as Leader[])
        ),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(
        (data) => {
          const rows = Array.isArray(data) ? data.filter(Boolean) : [];
          this.dataSource = new MatTableDataSource<Leader>([...rows]);
          this.attachSort();
          this.table?.renderRows();
          this.isLoading = false;
          this.cdr.detectChanges();
        },
        () => {
          this.isLoading = false;
          this.cdr.detectChanges();
        }
      );
  }

  private attachSort() {
    if (this.sort) {
      this.dataSource.sort = this.sort;
    }
  }

  fetchData(): Observable<Leader[]> {
    return new Observable<Leader[]>((observer) => {
      this.getDataFromApi()
        .then((data) => {
          observer.next(data);
          observer.complete();
        })
        .catch((error) => {
          observer.error(error);
        });
    });
  }

  async getDataFromApi(): Promise<Leader[]> {
    const response = await fetch(
      `${environment.apiUrl}/api/reports/Leaders?market=${this.market}&dir=${this.type}`
    );
    return await response.json();
  }

  trackByTicker(index: number, leader: Leader): string {
    return `${this.instanceId}-${this.market}-${this.type}-${leader?.ticker ?? 'row'}-${index}`;
  }
}
