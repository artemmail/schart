import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from 'src/app/service/auth.service';
import { DialogService } from 'src/app/service/DialogService.service';

@Component({
  standalone: false,
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css'],
})
export class RegisterComponent implements OnInit {
  registerForm: FormGroup;
  submitted = false;
  done = false;
  errorMessage: string = '';
  errorMessages: any[] = [];

  constructor(
    private formBuilder: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private dialog: DialogService
  ) {}

  ngOnInit(): void {
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
