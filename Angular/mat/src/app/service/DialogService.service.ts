import { Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { ConfirmDialogComponent } from '../components/Dialogs/confirm-dialog/confirm-dialog.component';
import { InformationDialogComponent } from '../components/Dialogs/information-dialog/information-dialog.component';
import { Observable } from 'rxjs';
import { SaveImageDialogComponent } from '../components/Dialogs/save-image-dialog/save-image-dialog.component';
import { SupportDialogComponent } from '../components/Dialogs/support-dialog/support-dialog.component';
import { MarkLineLevel } from './FootPrint/LevelMarks/level-marks.service';
import { LevelSettingsDialogComponent } from '../components/Dialogs/level-settings-dialog/level-settings-dialog.component';

@Injectable({
  providedIn: 'root',
})
export class DialogService {
  constructor(private dialog: MatDialog) {}

  confirm(message: string): Observable<boolean> {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '250px',
      data: { message: message },
    });
    return dialogRef.afterClosed();
  }

  info(message: string): Observable<void> {
    debugger
    const dialogRef = this.dialog.open(InformationDialogComponent, {
      width: '250px',
      data: { message: message },
    });
    return dialogRef.afterClosed();
  }

  confirm_async(message: string): Promise<boolean> {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '250px',
      data: { message: message },
    });
    return dialogRef.afterClosed().toPromise();
  }

  info_async(message: string): Promise<void> {
    const dialogRef = this.dialog.open(InformationDialogComponent, {
      width: '250px',
      data: { message: message },
    });
    return dialogRef.afterClosed().toPromise();
  }
  saveImage(canvas: HTMLCanvasElement): Promise<void> {
    const dialogRef = this.dialog.open(SaveImageDialogComponent, {
      width: '500px',
      data: { canvas: canvas },
    });
    return dialogRef.afterClosed().toPromise();
  }
  
  openSupportDialog(): Observable<boolean> {
    const dialogRef = this.dialog.open(SupportDialogComponent, {
      width: '600px',
    });
    return dialogRef.afterClosed();
  }

  openLevelSettings(level: MarkLineLevel): Observable<MarkLineLevel> {
    const dialogRef = this.dialog.open(LevelSettingsDialogComponent, {
      width: '300px',
      data: level ,
    });
    return dialogRef.afterClosed();
  }
}
