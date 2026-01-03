import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthEventService } from 'src/app/service/AuthEventService';
import { AuthService } from 'src/app/service/auth.service';

@Component({
  standalone: true,
  selector: 'app-logout',
  imports: [CommonModule],
  templateUrl: './logout.component.html',
  styleUrls: ['./logout.component.css']
})
export class LogoutComponent implements OnInit {
  constructor(public authService: AuthService, private router: Router, private authEventService: AuthEventService) {}

  ngOnInit(): void {
    this.authService.isSignedIn().subscribe(isSignedIn => {
      if (isSignedIn) {
        this.authService.logout().subscribe(() => {
          this.authEventService.emitAuthStateChange(false);
          this.router.navigate(['/']);
        });
      }
    });
  }
}
