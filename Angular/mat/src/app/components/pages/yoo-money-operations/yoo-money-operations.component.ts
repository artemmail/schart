import { Component, OnInit, ViewChild } from '@angular/core';
import { MatPaginator, PageEvent } from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table';
import { OperationHistory } from 'src/app/models/YooMoneyModels';
import { YooMoneyService } from 'src/app/service/yoomoney.service';
import { MatDialog } from '@angular/material/dialog';
import { OperationDetailsDialogComponent } from '../operation-details-dialog/operation-details-dialog.component';
import { BillDetailsDialogComponent } from '../bill-details-dialog/bill-details-dialog.component';
import { MaterialModule } from 'src/app/material.module';


@Component({
  standalone: true,
  selector: 'app-yoo-money-operations',
  imports: [MaterialModule],
  templateUrl: './yoo-money-operations.component.html',
  styleUrls: ['./yoo-money-operations.component.css']
})
export class YooMoneyOperationsComponent implements OnInit {
  dataSource: MatTableDataSource<OperationHistory> = new MatTableDataSource<OperationHistory>();
  displayedColumns: string[] = [
    'operation_id', 'datetime', 'title', 'amount',  'type', 'direction',
    'label',  'group_id', 
    'is_sbp_operation', 'spendingCategories'
  ];
  totalItems: number = 1000;
  pageSize: number = 20;
  pageIndex: number = 0;

  @ViewChild(MatPaginator) paginator: MatPaginator;

  constructor(private yooMoneyService: YooMoneyService, private dialog: MatDialog) { }

  ngOnInit() {
    this.loadOperations();
  }

  loadOperations() {
    this.yooMoneyService.getOperationHistory(this.pageIndex*this.pageSize, this.pageSize).subscribe((operations: OperationHistory[]) => {
      this.dataSource.data = operations;
      this.totalItems = this.pageSize * this.pageIndex + 100;
    });
  }

  onPageChange(event: PageEvent) {
    this.pageSize = event.pageSize;
    this.pageIndex = event.pageIndex;
  //  this.totalItems = event.pageSize + event.pageIndex + 100;
    this.loadOperations();
  }

  openOperationDetails(operationId: string): void {
    const dialogRef = this.dialog.open(OperationDetailsDialogComponent, {
      width: '600px',
      data: { operationId: operationId },
    });
  }
  openBillDetails(billId: string): void {
    const dialogRef = this.dialog.open(BillDetailsDialogComponent, {
      width: '600px',
      data: { billId: billId },
    });
  }
}
