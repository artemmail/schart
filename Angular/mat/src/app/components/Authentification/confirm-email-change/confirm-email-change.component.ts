import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from 'src/app/service/auth.service';
import { DialogService } from 'src/app/service/DialogService.service';

@Component({
  standalone: false,
  selector: 'app-confirm-email-change',
  templateUrl: './confirm-email-change.component.html',
  styleUrls: ['./confirm-email-change.component.css']
})
export class ConfirmEmailChangeComponent implements OnInit {
  statusMessage: string;

  constructor(
    private authService: AuthService,
    private route: ActivatedRoute,
    private router: Router,
    private dialog: DialogService
  ) {}

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      const userId = params['userId'];
      const email = params['email'];
      const code = params['code'];
      if (userId && email && code) {
        this.authService.confirmEmailChange(userId, email, code).subscribe(
          response => {
            this.router.navigate(['/']);
            this.dialog.info_async(response.message);
          },
          error => {
            this.statusMessage = 'Error changing your email.';
          }
        );
      } else {
        this.router.navigate(['/']);
      }
    });
  }
}
