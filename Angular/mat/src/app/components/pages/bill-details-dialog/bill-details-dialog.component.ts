import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { BillDto, BillingService } from 'src/app/service/subscription.service';

@Component({
  standalone: false,
  selector: 'app-bill-details-dialog',
  templateUrl: './bill-details-dialog.component.html',
  styleUrls: ['./bill-details-dialog.component.css']
})
export class BillDetailsDialogComponent implements OnInit {
  billDetails: BillDto;
  isLoading: boolean = true;
  error: string;

  constructor(
    private billingService: BillingService,
    @Inject(MAT_DIALOG_DATA) public data: { billId: string }
  ) { }

  ngOnInit(): void {
    this.billingService.getBill(this.data.billId).subscribe(
      (details) => {        
        this.billDetails = details;
        this.isLoading = false;
      },
      (error) => {
        this.error = 'Ошибка при загрузке деталей счета.';
        this.isLoading = false;
      }
    );
  }
}
