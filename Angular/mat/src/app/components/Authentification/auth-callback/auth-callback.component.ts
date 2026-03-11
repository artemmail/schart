import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthEventService } from 'src/app/service/AuthEventService';
import { AuthService } from 'src/app/service/auth.service';

@Component({
  standalone: true,
  selector: 'app-auth-callback',
  imports: [CommonModule],
  template: `<p class="auth-callback-message">Выполняется вход...</p>`,
  styles: [`
    .auth-callback-message {
      margin: 48px auto;
      text-align: center;
    }
  `]
})
export class AuthCallbackComponent implements OnInit {
  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly authService: AuthService,
    private readonly authEventService: AuthEventService
  ) {}

  ngOnInit(): void {
    const returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/';

    this.authService.getLoggedUser().subscribe({
      next: () => {
        this.authEventService.emitAuthStateChange(true);
        this.router.navigateByUrl(returnUrl);
      },
      error: () => {
        this.router.navigate(['/Identity/Account/Login'], {
          queryParams: {
            returnUrl,
            externalError: 'Не удалось завершить внешний вход.'
          }
        });
      }
    });
  }
}
