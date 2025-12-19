import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService, ResetPasswordInputModel } from 'src/app/service/auth.service';
import { DialogService } from 'src/app/service/DialogService.service';


@Component({
  selector: 'app-reset-password',
  templateUrl: './reset-password.component.html',
  styleUrls: ['./reset-password.component.css']
})
export class ResetPasswordComponent implements OnInit {
  model: ResetPasswordInputModel = {
    Email: '',
    Password: '',
    ConfirmPassword: '',
    Code: ''
  };

  errorMessage: string = '';
  errorMessages: string[] = [];
  done: boolean = false;

  constructor(
    private route: ActivatedRoute,
    private authService: AuthService,
    private router: Router,
    private dialog: DialogService
  ) { }

  ngOnInit(): void {
    
    this.route.queryParams.subscribe(params => {
      if (params['code']) {
        this.model.Code = params['code'];
      }
    });
  }

  private handleServerError(error: string): void {
    try {
      const errorObj = JSON.parse(error);
      this.errorMessages = [];
      for (const key in errorObj) {
        if (errorObj.hasOwnProperty(key)) {
          this.errorMessages.push(`${key}: ${errorObj[key].join(' ')}`);
        }
      }
    } catch (e) {
      this.errorMessages = [error];
    }
  }


  
  onSubmit() {
    this.authService.resetPassword(this.model).subscribe(
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
}