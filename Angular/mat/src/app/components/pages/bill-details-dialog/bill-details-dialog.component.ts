import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { BillDto, BillingService } from 'src/app/service/subscription.service';

@Component({
  standalone: true,
  selector: 'app-bill-details-dialog',
  imports: [CommonModule, MatDialogModule, MatButtonModule],
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
