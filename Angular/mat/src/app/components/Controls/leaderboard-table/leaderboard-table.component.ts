import {
  Component,
  OnInit,
  OnDestroy,
  Input,
  ElementRef,
  ChangeDetectorRef,
  ViewChild,
  AfterViewInit
} from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatSort } from '@angular/material/sort';
import { Subscription, interval, Observable } from 'rxjs';
import { startWith, switchMap } from 'rxjs/operators';
import { Leader } from 'src/app/models/Leaders';
import { environment } from 'src/app/environment';

@Component({
  selector: 'app-leaderboard-table',
  templateUrl: './leaderboard-table.component.html',
  styleUrls: ['./leaderboard-table.component.css'],
})
export class LeaderboardTableComponent implements OnInit, OnDestroy, AfterViewInit {
  @Input() market: number = 0;
  @Input() type: number = 1;
  @Input() instanceId: string; // Новый Input-параметр для уникального ID

  displayedColumns: string[] = ['ticker', 'cls', 'volume', 'percent'];
  dataSource: MatTableDataSource<Leader>;
  isLoading = true;

  private subscription: Subscription;
  private intersectionObserver: IntersectionObserver;

  @ViewChild(MatSort) sort: MatSort;
  @ViewChild('leaderboardTable', { static: true }) leaderboardTable: ElementRef;

  constructor(private cdr: ChangeDetectorRef, private el: ElementRef) {}

  ngOnInit() {
    // Initialize the dataSource
    this.dataSource = new MatTableDataSource([]);
  
  }

  ngAfterViewInit() {
    this.intersectionObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            this.startDataSubscription();
          } else {
            this.stopDataSubscription();
          }
        });
      },
      { threshold: 0.1 }
    );

    this.intersectionObserver.observe(this.el.nativeElement);
    this.cdr.detectChanges();
  }

  ngOnDestroy() {
    this.stopDataSubscription();
    if (this.intersectionObserver) {
      this.intersectionObserver.disconnect();
    }
  }

  startDataSubscription() {
    if (this.subscription && !this.subscription.closed) {
      return; // If there's already a running subscription, do nothing
    }

    this.isLoading = true;
    this.subscription = interval(2000)
      .pipe(
        startWith(0),
        switchMap(() => this.fetchData())
      )
      .subscribe(
        (data) => {
          this.dataSource.data = data;
          this.dataSource.sort = this.sort;
          this.isLoading = false;
          this.cdr.detectChanges(); // Ensure changes are detected
        },
        () => {
          this.isLoading = false; // Ensure spinner is hidden in case of error
          this.cdr.detectChanges(); // Ensure changes are detected
        }
      );
  }

  stopDataSubscription() {
    if (this.subscription) {
      this.subscription.unsubscribe();
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
}
