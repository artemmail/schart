import { Directive, HostListener } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { SupportDialogComponent } from '../components/Dialogs/support-dialog/support-dialog.component';


@Directive({
  selector: '[appOpenSupportDialog]',
  standalone: true
})
export class OpenSupportDialogDirective {
  constructor(private dialog: MatDialog) {}

  @HostListener('click')
  openDialog(): void {
    this.dialog.open(SupportDialogComponent);
  }
}