// support-dialog.component.ts
import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ApplicationUser } from 'src/app/models/UserTopic';
import { AuthService } from 'src/app/service/auth.service';
import { SelectListItemText } from 'src/app/models/preserts';
import { MatDialogRef } from '@angular/material/dialog';
import { DialogService } from 'src/app/service/DialogService.service';

@Component({
  selector: 'app-support-dialog',
  templateUrl: './support-dialog.component.html',
  styleUrls: ['./support-dialog.component.css'],
})
export class SupportDialogComponent implements OnInit {
  title = 'Отправить сообщение поддержке';
  
  // Поля формы
  messageType: string = 'Второстепенная проблема'; // Инициализация значением по умолчанию
  header: string = '';
  text: string = '';
  uploadedFile: File | null = null;

  // Список типов сообщений
  messageTypes: SelectListItemText[] = [];

  // Состояние авторизации пользователя
  isSignedIn: boolean = false;
  user: ApplicationUser | null = null;

  // Типы проблем
  problems: string[] = [
    'Второстепенная проблема',
    'Котировки не поступают',
    'Проблемы в мобильном приложении',
    'Ошибки в футпринте',
    'Вопросы по оплате',
    'Предложение по работе сайта',
    'Услуги разработчиков',
  ];

  constructor(
    private authService: AuthService,
    private http: HttpClient,
    private dialogRef: MatDialogRef<SupportDialogComponent>,
    private dialogService: DialogService
  ) {
    // Инициализация типов сообщений
    this.messageTypes = this.problems.map((text) => ({
      Text: text,
      Value: text,
    }));
  }

  ngOnInit(): void {
    // Проверка состояния авторизации
    this.isSignedIn = this.authService.isAuthenticated();

    if (this.isSignedIn) {
      this.authService.getLoggedUser().subscribe((user) => (this.user = user));
    }
  }

  // Обработчик отправки формы
  onSubmit(): void {
    if (!this.isSignedIn || !this.header.trim() || !this.text.trim() || !this.messageType) {
      // Можно добавить дополнительные проверки или уведомления
      return;
    }

    const formData = new FormData();
    formData.append('Header', this.header.trim());
    formData.append('Text', this.text.trim());
    formData.append('MessageType', this.messageType);
    if (this.uploadedFile) {
      formData.append('UploadedFile', this.uploadedFile, this.uploadedFile.name);
    }

    this.http.post('/api/support', formData).subscribe(
      () => {
        this.dialogRef.close(true); // Закрыть диалог с успехом
        this.dialogService.info('Сообщение отправлено');
      },
      (error) => {
        console.error('Error sending message:', error);
        this.dialogRef.close(false); // Закрыть диалог с ошибкой
        this.dialogService.info('Ошибка! Пишите на почту ruticker@gmail.com');
      }
    );
  }

  // Обработчик изменения файла
  onFileChange(event: Event): void {
    const inputElement = event.target as HTMLInputElement;
    if (inputElement.files && inputElement.files.length > 0) {
      this.uploadedFile = inputElement.files[0];
    }
  }

  // Обработчик кнопки Отмена
  onCancelClick(): void {
    this.dialogRef.close();
  }
}
