import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { ApplicationUser, Topic, Comment } from 'src/app/models/UserTopic';
import { AuthService } from 'src/app/service/auth.service';
import { NewsService } from 'src/app/service/news.service';
import { ConfirmDialogComponent } from '../../Dialogs/confirm-dialog/confirm-dialog.component';
import { DialogService } from 'src/app/service/DialogService.service';
import { DomSanitizer, SafeHtml, Title } from '@angular/platform-browser';

@Component({
  standalone: false,
  selector: 'app-service-news-details',
  templateUrl: './service-news-details.component.html',
  styleUrls: ['./service-news-details.component.css'],
})
export class ServiceNewsDetailsComponent implements OnInit {
  id: number;
  slug: string;
  header: string;
  text: SafeHtml;
  date: Date;
  topicUser: ApplicationUser;
  loggedUser: ApplicationUser;
  signed: boolean;
  userComments: Comment[];
  comment: string;

  errorMessage: string | null = null;
  errorCode: number | null = null;

  constructor(
    private route: ActivatedRoute,
    private authService: AuthService,
    private newsService: NewsService,
    private router: Router,
    private dialogService: DialogService,
    private sanitizer: DomSanitizer,
    private titleService: Title
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe((params) => {
      this.slug = params['id'];
      this.loadData();
    });
  }

  loadData(): void {
    this.signed = this.authService.isAuthenticated();

    if (this.signed) {
      this.authService.getLoggedUser().subscribe((user) => (this.loggedUser = user));
    }

    this.newsService.getTopicBySlug(this.slug).subscribe(
      (topic: Topic) => {
        this.titleService.setTitle(topic.Header);
        this.header = topic.Header;

        // Устанавливаем HTML-текст в безопасном формате:
        this.text = this.sanitizer.bypassSecurityTrustHtml(
          "<style>.content img {max-width:100%}</style>" + topic.Text
        );
        this.date = topic.Date;
        this.topicUser = topic.TopicUser;
        this.id = topic.Id;
        this.userComments = topic.UserComments;
        this.errorMessage = null;
        this.errorCode = null;

        // Попробуем найти ссылку, где домен (в любом регистре) заканчивается на youscriptor.com/recognized/
        // и далее идут любые символы до пробела, кавычек, угловых скобок и т.д.
        // Флаг "i" делает поиск регистронезависимым.
        const recognizedLinkRegex = /https?:\/\/(?:www\.)?[a-z0-9.-]*youscriptor\.com\/recognized\/[^"\s<]+/i;
        const recognizedLinkMatch = topic.Text.match(recognizedLinkRegex);

        if (recognizedLinkMatch) {
          // Берём первую найденную ссылку
          let finalLink = recognizedLinkMatch[0];

          // Удаляем возможные символы " или >, если они вдруг «прилипли»
          finalLink = finalLink.replace(/["'>]+$/, '');

          // Переходим по ссылке
          window.location.href = finalLink;
          return;
        }
      },
      (error) => {
        this.errorCode = error.status;
        this.errorMessage = `Ошибка ${error.status}: ${error.message || 'Неизвестная ошибка'}`;
      }
    );
  }

  goBack(event: MouseEvent): void {
    event.preventDefault();
    window.history.back();
  }

  onSubmit(): void {
    if (this.comment && this.comment.trim()) {
      let c = this.comment;
      this.comment = '';
      this.newsService.addComment(this.id, c).subscribe(() => {
        this.loadData();
      });
    }
  }

  deleteTopic(event: MouseEvent): void {
    event.preventDefault();

    this.dialogService
      .confirm('Are you sure you want to delete this topic?')
      .subscribe((result) => {
        if (result) {
          this.newsService.deleteTopic(this.id).subscribe(
            () => {
              this.router.navigate(['/']);
            },
            (error) => {
              this.dialogService.info(`Error deleting topic: ${error.error}`);
            }
          );
        }
      });
  }

  deleteComment(event: MouseEvent, commentId: number): void {
    event.preventDefault();

    this.dialogService
      .confirm('Are you sure you want to delete this comment?')
      .subscribe((result) => {
        if (result) {
          this.newsService.deleteComment(commentId).subscribe(
            () => {
              this.loadData();
            },
            (error) => {
              this.dialogService.info(`Error deleting comment: ${error.error}`);
            }
          );
        }
      });
  }
}
