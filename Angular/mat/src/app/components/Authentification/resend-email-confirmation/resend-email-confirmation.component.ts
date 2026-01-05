import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { AuthService } from 'src/app/service/auth.service';
import { DialogService } from 'src/app/service/DialogService.service';
import { MaterialModule } from 'src/app/material.module';

@Component({
  standalone: true,
  selector: 'app-resend-email-confirmation',
  imports: [MaterialModule],
  templateUrl: './resend-email-confirmation.component.html',
  styleUrls: ['./resend-email-confirmation.component.css'],
})
export class ResendEmailConfirmationComponent implements OnInit {
  resendEmailForm: FormGroup;
  submitted = false;
  done: any;

  constructor(
    private formBuilder: FormBuilder,
    private authService: AuthService,
    private snackBar: MatSnackBar,
    private router: Router,
    private dialog: DialogService
  ) {}

  ngOnInit(): void {
    this.resendEmailForm = this.formBuilder.group({
      email: ['', [Validators.required, Validators.email]],
    });
  }

  get f() {
    return this.resendEmailForm.controls;
  }

  onSubmit(): void {
    this.submitted = true;

    if (this.resendEmailForm.invalid) {
      return;
    }

    this.authService
      .resendEmailConfirmation(this.resendEmailForm.value.email)
      .subscribe(
        (response) => {
          this.router.navigate(['/']);
          this.dialog.info_async(response.message);
        },
        (error) => {
          this.router.navigate(['/']);
          this.dialog.info_async(
            error.error.message ||
              error.error ||
              'An error occurred during sending the email.'
          );        
        }
      );
  }
}
