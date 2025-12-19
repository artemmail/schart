import { Component, OnInit, ViewChild, OnDestroy } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator, PageEvent } from '@angular/material/paginator';
import { MatSort, Sort } from '@angular/material/sort';
import { MatDialog } from '@angular/material/dialog';
import { PaymentModel, PaymentsService } from 'src/app/service/payments.service';
import { PaymentDialogComponent } from '../../Dialogs/payments-dialog/payments-dialog.component';
import { Subject } from 'rxjs';
import { debounceTime } from 'rxjs/operators';

@Component({
  selector: 'app-payments-table',
  templateUrl: './payments-table.component.html',
  styleUrls: ['./payments-table.component.css']
})
export class PaymentsTableComponent implements OnInit, OnDestroy {
  displayedColumns: string[] = ['UserName', 'Email', 'PayDate', 'ExpireDate', 'PayAmount', 'Service', 'actions'];
  dataSource = new MatTableDataSource<PaymentModel>();
  totalItems = 0;
  pageSize = 20;
  pageIndex = 0;
  sortField = '';
  sortOrder = '';

  isLoading = false;
  filterValue: string = '';
  private filterSubject: Subject<string> = new Subject<string>();

  @ViewChild(MatPaginator) paginator: MatPaginator;

  constructor(
    private paymentsService: PaymentsService,
    private dialog: MatDialog
  ) { }

  ngOnInit(): void {
    this.loadPayments();

    // Подписываемся на изменения фильтра с задержкой
    this.filterSubject.pipe(
      debounceTime(300)
    ).subscribe(value => {
      this.filterValue = value;
      this.pageIndex = 0; // Сбрасываем на первую страницу
      this.loadPayments();
    });
  }

  ngOnDestroy(): void {
    this.filterSubject.unsubscribe();
  }

  loadPayments(): void {
    this.isLoading = true;
    const page = this.pageIndex + 1;

    this.paymentsService.getPayments(page, this.pageSize, this.sortField, this.sortOrder, this.filterValue)
      .subscribe(result => {
        this.dataSource.data = result.items;
        this.totalItems = result.totalCount;
        this.isLoading = false;
      });
  }

  onPageChange(event: PageEvent): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.loadPayments();
  }

  onSortChange(sort: Sort): void {
    this.sortField = sort.active;
    this.sortOrder = sort.direction;
    this.loadPayments();
  }

  applyFilter(event: Event): void {
    const filterValue = (event.target as HTMLInputElement).value;
    this.filterSubject.next(filterValue.trim().toLowerCase());
  }

  editPayment(payment: PaymentModel): void {
    const dialogRef = this.dialog.open(PaymentDialogComponent, {
      width: '400px',
      data: { ...payment }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.paymentsService.updatePayment(result).subscribe(() => {
          this.loadPayments();
        });
      }
    });
  }

  deletePayment(payment: PaymentModel): void {
    if (confirm('Вы уверены, что хотите удалить этот платеж?')) {
      this.paymentsService.deletePayment(payment.Id).subscribe(() => {
        this.loadPayments();
      });
    }
  }

  addPayment(): void {
    const dialogRef = this.dialog.open(PaymentDialogComponent, {
      width: '400px',
      data: {} as PaymentModel
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.paymentsService.createPayment(result).subscribe(() => {
          this.loadPayments();
        });
      }
    });
  }
}
