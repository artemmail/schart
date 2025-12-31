import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { LoginModel } from 'src/app/models/login';
import { AuthEventService } from 'src/app/service/AuthEventService';
import { AuthService } from 'src/app/service/auth.service';

@Component({
  standalone: true,
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
  ],
})
export class LoginComponent implements OnInit {
  username: string;
  password: string;
  errorMessage: string;
  returnUrl: string; // Переменная для хранения returnUrl

  constructor(
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private authEventService: AuthEventService
  ) {}

  ngOnInit(): void {
    // Извлекаем returnUrl из queryParams, если он был передан
    this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/';
  }

  login() {
    const loginPayload: LoginModel = { userName: this.username, password: this.password, rememberMe: true };
    
    this.authService.login(loginPayload).subscribe(
      data => {
        this.authEventService.emitAuthStateChange(true);
        // Перенаправление на returnUrl или на главную страницу, если returnUrl не передан
        this.router.navigate([this.returnUrl]); 

      },
      err => {
        this.errorMessage = 'Invalid login attempt';
      }
    );
  }
}
