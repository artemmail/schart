import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { YooMoneyService } from 'src/app/service/yoomoney.service';
import { OperationDetails } from 'src/app/models/YooMoneyModels';

@Component({
  standalone: true,
  selector: 'app-operation-details-dialog',
  imports: [CommonModule, MatDialogModule, MatButtonModule],
  templateUrl: './operation-details-dialog.component.html',
  styleUrls: ['./operation-details-dialog.component.css']
})
export class OperationDetailsDialogComponent implements OnInit {
  operationDetails: OperationDetails;
  isLoading: boolean = true;
  error: string;

  constructor(
    private yooMoneyService: YooMoneyService,
    @Inject(MAT_DIALOG_DATA) public data: { operationId: string }
  ) { }

  ngOnInit(): void {
    this.yooMoneyService.getOperationDetails(this.data.operationId).subscribe(
      (details) => {
        this.operationDetails = details;
        this.isLoading = false;
      },
      (error) => {
        this.error = 'Ошибка при загрузке деталей операции.';
        this.isLoading = false;
      }
    );
  }
}
