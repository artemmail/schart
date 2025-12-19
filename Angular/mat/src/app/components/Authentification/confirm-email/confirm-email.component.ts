import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from 'src/app/service/auth.service';
import { DialogService } from 'src/app/service/DialogService.service';

@Component({
  standalone: false,
  selector: 'app-confirm-email',
  templateUrl: './confirm-email.component.html',
  styleUrls: ['./confirm-email.component.css'],
})
export class ConfirmEmailComponent implements OnInit {
  statusMessage: string;

  constructor(
    private authService: AuthService,
    private route: ActivatedRoute,
    private router: Router,
    private dialog: DialogService
  ) {}

  message: string;
  error: string;

  ngOnInit(): void {
    this.route.queryParams.subscribe((params) => {
      const userId = params['userId'];
      const code = params['code'];

      if (userId && code) {
        this.authService
          .confirmEmail(userId, code)

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
      } else {
        this.error = 'Отсутствуют необходимые параметры.';
      }
    });
  }

  redirectToHome(): void {
    this.router.navigate(['/']);
  }
}
