import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import {
  DiscountSettingDto,
  SubscriptionPlanAdminService,
  SubscriptionPlanDto,
  SubscriptionPlanRequest,
} from 'src/app/service/subscription-plan-admin.service';

@Component({
  selector: 'app-subscription-plan-admin',
  templateUrl: './subscription-plan-admin.component.html',
  styleUrls: ['./subscription-plan-admin.component.scss'],
})
export class SubscriptionPlanAdminComponent implements OnInit {
  plans: SubscriptionPlanDto[] = [];
  displayedColumns: string[] = [
    'interval',
    'count',
    'ordinalMoney',
    'discountMoney',
    'code',
    'type',
    'referalInfo',
    'actions',
  ];
  isLoading = false;
  editingId: number | null = null;
  discountControl = new FormControl<Date | null>(null, Validators.required);

  planForm: FormGroup;

  constructor(
    private adminService: SubscriptionPlanAdminService,
    private fb: FormBuilder,
    private snackBar: MatSnackBar
  ) {
    this.planForm = this.fb.group({
      interval: ['m', Validators.required],
      count: [1, [Validators.required, Validators.min(1)]],
      ordinalMoney: [0, [Validators.required, Validators.min(0)]],
      discountMoney: [0, [Validators.required, Validators.min(0)]],
      code: [1, [Validators.required, Validators.min(0)]],
      isReferal: [false],
      referalInterval: ['m'],
      referalCount: [0, [Validators.min(0)]],
    });
  }

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.isLoading = true;
    this.adminService.getSettings().subscribe({
      next: (response) => {
        this.plans = response.plans;
        this.discountControl.setValue(new Date(response.discountBefore));
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
        this.snackBar.open('Не удалось загрузить тарифы', 'Закрыть', {
          duration: 4000,
        });
      },
    });
  }

  saveDiscount(): void {
    if (!this.discountControl.value) {
      this.discountControl.markAsTouched();
      return;
    }

    const isoDate = new Date(this.discountControl.value).toISOString();
    this.adminService.updateDiscount(isoDate).subscribe({
      next: (updated: DiscountSettingDto) => {
        this.discountControl.setValue(new Date(updated.discountBefore));
        this.snackBar.open('Дата скидки обновлена', 'Закрыть', {
          duration: 3000,
        });
      },
      error: () => {
        this.snackBar.open('Не удалось обновить дату скидки', 'Закрыть', {
          duration: 4000,
        });
      },
    });
  }

  savePlan(): void {
    if (this.planForm.invalid) {
      this.planForm.markAllAsTouched();
      return;
    }

    const request = this.buildRequest();
    const save$ = this.editingId
      ? this.adminService.savePlan(request, this.editingId)
      : this.adminService.savePlan(request);

    this.isLoading = true;
    save$.subscribe({
      next: () => {
        this.snackBar.open('Тариф сохранён', 'Закрыть', { duration: 3000 });
        this.resetForm();
        this.loadData();
      },
      error: () => {
        this.isLoading = false;
        this.snackBar.open('Не удалось сохранить тариф', 'Закрыть', {
          duration: 4000,
        });
      },
    });
  }

  editPlan(plan: SubscriptionPlanDto): void {
    this.editingId = plan.id;
    this.planForm.patchValue({
      interval: plan.interval,
      count: plan.count,
      ordinalMoney: plan.ordinalMoney,
      discountMoney: plan.discountMoney,
      code: plan.code,
      isReferal: plan.isReferal,
      referalInterval: plan.referalInterval || 'm',
      referalCount: plan.referalCount ?? 0,
    });
  }

  deletePlan(plan: SubscriptionPlanDto): void {
    const confirmed = confirm(
      `Удалить тариф ${plan.interval}${plan.count} для кода ${plan.code}?`
    );
    if (!confirmed) {
      return;
    }

    this.isLoading = true;
    this.adminService.deletePlan(plan.id).subscribe({
      next: () => {
        this.snackBar.open('Тариф удалён', 'Закрыть', { duration: 3000 });
        this.loadData();
      },
      error: () => {
        this.isLoading = false;
        this.snackBar.open('Не удалось удалить тариф', 'Закрыть', {
          duration: 4000,
        });
      },
    });
  }

  resetForm(): void {
    this.editingId = null;
    this.isLoading = false;
    this.planForm.reset({
      interval: 'm',
      count: 1,
      ordinalMoney: 0,
      discountMoney: 0,
      code: 1,
      isReferal: false,
      referalInterval: 'm',
      referalCount: 0,
    });
  }

  displayReferal(plan: SubscriptionPlanDto): string {
    if (!plan.isReferal) {
      return '—';
    }

    const interval = plan.referalInterval || '';
    const count = plan.referalCount ?? 0;
    return `${interval}${count}`;
  }

  private buildRequest(): SubscriptionPlanRequest {
    const formValue = this.planForm.value;
    return {
      interval: formValue.interval,
      count: formValue.count,
      ordinalMoney: formValue.ordinalMoney,
      discountMoney: formValue.discountMoney,
      code: formValue.code,
      isReferal: formValue.isReferal,
      referalInterval: formValue.isReferal ? formValue.referalInterval : null,
      referalCount: formValue.isReferal ? formValue.referalCount : null,
    };
  }
}
