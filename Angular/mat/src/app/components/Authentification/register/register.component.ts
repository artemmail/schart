import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { AuthService, ExternalAuthProvider } from 'src/app/service/auth.service';
import { DialogService } from 'src/app/service/DialogService.service';

@Component({
  standalone: true,
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css'],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
  ],
})
export class RegisterComponent implements OnInit {
  registerForm: FormGroup;
  submitted = false;
  done = false;
  errorMessage: string = '';
  errorMessages: any[] = [];
  externalProviders: ExternalAuthProvider[] = [];
  returnUrl: string = '/';

  constructor(
    private formBuilder: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private dialog: DialogService
  ) {}

  ngOnInit(): void {
    this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/';
    this.errorMessage = this.route.snapshot.queryParams['externalError'] || '';

    this.registerForm = this.formBuilder.group(
      {
        UserName: ['', Validators.required],
        Email: ['', [Validators.required, Validators.email]],
        Password: ['', [Validators.required, Validators.minLength(6)]],
        ConfirmPassword: ['', Validators.required],
      },
      {
        validator: this.MustMatch('Password', 'ConfirmPassword'),
      }
    );

    this.authService.getExternalProviders().subscribe({
      next: (providers) => {
        this.externalProviders = providers;
      },
      error: () => {
        this.externalProviders = [];
      }
    });
  }

  get f() {
    return this.registerForm.controls;
  }

  onSubmit(): void {
    this.submitted = true;

    if (this.registerForm.invalid) {
      return;
    }

    this.authService.register(this.registerForm.value).subscribe(
      (response) => {
        this.router.navigate(['/']);
        this.dialog.info_async(response.message);
      },
      (error) => {
        this.errorMessages = [];

        // Проверка, есть ли в ответе сервера массив ошибок
        if (error.error instanceof Array) {
          error.error.forEach((err) => {
            this.errorMessages.push(err.Description);
          });
        } else {
          // Если структура ошибки отличается, вывод общего сообщения
          this.errorMessage =
            error.error.message || 'An error occurred during registration';
        }
      }
    );
  }

  loginWithProvider(providerName: string): void {
    this.authService.beginExternalLogin(providerName, this.returnUrl);
  }

  MustMatch(controlName: string, matchingControlName: string) {
    return (formGroup: FormGroup) => {
      const control = formGroup.controls[controlName];
      const matchingControl = formGroup.controls[matchingControlName];

      if (matchingControl.errors && !matchingControl.errors['mustMatch']) {
        return;
      }

      if (control.value !== matchingControl.value) {
        matchingControl.setErrors({ mustMatch: true });
      } else {
        matchingControl.setErrors(null);
      }
    };
  }
}
