import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from 'src/app/service/auth.service';
import { DialogService } from 'src/app/service/DialogService.service';

@Component({
  standalone: false,
  selector: 'app-forgot-password',
  templateUrl: './forgot-password.component.html',
  styleUrls: ['./forgot-password.component.css'],
})
export class ForgotPasswordComponent implements OnInit {
  forgotPasswordForm: FormGroup;
  submitted = false;
  errorMessage: string = '';
  errorMessages: string[] = [];

  constructor(
    private formBuilder: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private dialog: DialogService
  ) {}

  ngOnInit(): void {
    this.forgotPasswordForm = this.formBuilder.group({
      email: ['', [Validators.required, Validators.email]],
    });
  }

  get f() {
    return this.forgotPasswordForm.controls;
  }

  onSubmit(): void {
    this.submitted = true;

    if (this.forgotPasswordForm.invalid) {
      return;
    }

    this.authService
      .forgotPassword(this.forgotPasswordForm.value.email)
      .subscribe(
        (response) => {
          this.router.navigate(['/']);
          this.dialog.info_async(response.message);
        },
        (error) => {
          this.errorMessages = [];

          if (error.error instanceof Array) {
            error.error.forEach((err) => {
              this.errorMessages.push(err.Description);
            });
          } else {
            this.errorMessage =
              error.error.message || 'An error occurred during the password reset process';
          }
        }
      );
  }
}
