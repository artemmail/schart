import { Component } from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MaterialModule } from '../../../material.module';
import { FootprintFavorite, FootprintFavoritesService } from '../../../service/FootPrint/Favorites/footprint-favorites.service';
import { FavoriteRenameDialogComponent } from '../favorite-rename-dialog/favorite-rename-dialog.component';

@Component({
  standalone: true, selector: 'app-saved-views-dialog', imports: [MaterialModule],
  template: `
    <h2 mat-dialog-title>Мои сохранённые виды</h2>
    <mat-dialog-content>
      <p>Выберите вид, чтобы восстановить график. Расположение панелей доступно на устройстве, где вы его сохранили.</p>
      <div *ngFor="let favorite of service.favorites$ | async" class="saved-row">
        <button mat-button class="view-name" (click)="ref.close(favorite)">{{ favorite.name }}</button>
        <button mat-icon-button (click)="rename(favorite)" [attr.aria-label]="'Переименовать ' + favorite.name" matTooltip="Переименовать"><mat-icon>edit</mat-icon></button>
        <button mat-icon-button (click)="remove(favorite)" [attr.aria-label]="'Удалить ' + favorite.name" matTooltip="Удалить"><mat-icon>delete_outline</mat-icon></button>
      </div>
      <p *ngIf="!(service.favorites$ | async)?.length">Сохранённых видов пока нет. Настройте график и нажмите «Сохранить вид».</p>
      <p *ngIf="pendingDelete">Удалить «{{ pendingDelete.name }}»? <button mat-button (click)="confirmDelete()">Удалить</button><button mat-button (click)="pendingDelete = null">Оставить</button></p>
    </mat-dialog-content>
    <mat-dialog-actions align="end"><a mat-button routerLink="/FavoritesBoard" (click)="ref.close()">Доска избранного</a><button mat-button (click)="ref.close()">Закрыть</button></mat-dialog-actions>
  `,
  styles: [`p{font-size:14px;line-height:1.5}.saved-row{display:flex;gap:4px;align-items:center;border-bottom:1px solid var(--mat-sys-outline-variant);padding:8px 0}.view-name{flex:1;justify-content:flex-start;white-space:normal;height:auto;min-height:44px;text-align:left}.saved-row>.mat-mdc-icon-button{flex-shrink:0}`]
})
export class SavedViewsDialogComponent {
  pendingDelete: FootprintFavorite | null = null;
  constructor(public service: FootprintFavoritesService, public ref: MatDialogRef<SavedViewsDialogComponent>, private dialog: MatDialog) {}
  rename(favorite: FootprintFavorite): void {
    this.dialog.open(FavoriteRenameDialogComponent, { width: '380px', data: { name: favorite.name, title: 'Переименовать вид' } }).afterClosed().subscribe(name => {
      if (name) this.service.renameFavorite(favorite.id, name);
    });
  }
  remove(favorite: FootprintFavorite): void { this.pendingDelete = favorite; }
  confirmDelete(): void { if (this.pendingDelete) this.service.deleteFavorite(this.pendingDelete.id); this.pendingDelete = null; }
}
