import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MatCheckboxChange } from '@angular/material/checkbox';
import {
  PaymentResponse1,
  PaymentService,
} from 'src/app/service/payment.service';
import {
  BillingService,
  Subscription,
} from 'src/app/service/subscription.service';
import { MatDialog } from '@angular/material/dialog';
import { PaymentInstructionsDialogComponent } from '../../Controls/payment-instructions-dialog/payment-instructions-dialog.component';
import { Title } from '@angular/platform-browser';
import { DialogService } from 'src/app/service/DialogService.service';
import { MaterialModule } from 'src/app/material.module';

@Component({
  standalone: true,
  selector: 'app-subscription',
  imports: [MaterialModule],
  templateUrl: './subscription.component.html',
  styleUrls: ['./subscription.component.css'],
})
export class SubscriptionPlansComponent implements OnInit {
  paymentInfo: PaymentResponse1 | null = null;
  referal: string | null = null;
  selectedServices: number = 1;
  subscriptions: Subscription[] = [];
  displayedColumns: string[] = ['period', 'price', 'monthPrice', 'actions'];

  micex: boolean = true;
  crypto: boolean = false;

  // Флаг для проверки праздничного периода
  isFestive: boolean = false;

  constructor(
    private paymentService: PaymentService,
    private billingService: BillingService,
    private route: ActivatedRoute,
    private dialogService: DialogService,
    public dialog: MatDialog,
    private titleService: Title
  ) {
    titleService.setTitle("Кластерные графики он-лайн StockChart.ru. Тарифы на подписку");
  }

  ngOnInit(): void {
    // Проверяем дату
    this.isFestive = new Date() < new Date(2025, 0, 1);

    this.referal = this.route.snapshot.paramMap.get('referal');
    this.loadPaymentInfo();
    this.loadTarifs();
  }

  loadPaymentInfo(): void {
    this.paymentService.getPaymentInfo(this.referal).subscribe((data) => {
      this.paymentInfo = data;
    });
  }

  loadTarifs(): void {
    this.billingService.getTarifs(this.selectedServices, this.referal).subscribe((data) => {
      this.subscriptions = data;
    });
  }

  openSupportDialog(event: Event): void {
    event.preventDefault(); // Предотвращаем переход по ссылке
    this.dialogService.openSupportDialog();
  }

  onServiceChange(event: MatCheckboxChange, serviceValue: number): void {
    let res = 0;
    if (this.micex) res += 1;
    if (this.crypto) res += 8;

    this.selectedServices = res;
    this.loadTarifs();
  }

  openPaymentInstructions(): void {
    this.dialog.open(PaymentInstructionsDialogComponent);
  }

  onSubscribe(subscription: Subscription): void {
    if (!this.paymentInfo) {
      this.openPaymentInstructions();
    } else {
      const form = document.createElement('form');
      form.method = 'POST';
      form.action = 'https://yoomoney.ru/quickpay/confirm.xml';

      const inputs = [
        { name: 'receiver', value: '410011635522558' },
        { name: 'label', value: subscription.BillId },
        { name: 'targets', value: subscription.message },
        { name: 'sum', value: subscription.money.toString() },
        { name: 'paymentType', value: 'AC' },
        { name: 'quickpay-form', value: 'donate' },
      ];

      inputs.forEach((inputData) => {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = inputData.name;
        input.value = inputData.value;
        form.appendChild(input);
      });

      document.body.appendChild(form);
      form.submit();
    }
  }
}
