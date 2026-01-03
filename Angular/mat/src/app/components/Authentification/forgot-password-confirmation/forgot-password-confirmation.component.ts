import { Component } from '@angular/core';
import { MaterialModule } from 'src/app/material.module';

@Component({
  standalone: true,
  selector: 'app-forgot-password-confirmation',
  imports: [MaterialModule],
  templateUrl: './forgot-password-confirmation.component.html',
  styleUrls: ['./forgot-password-confirmation.component.css']
})
export class ForgotPasswordConfirmationComponent {
}
