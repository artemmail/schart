import { Component, OnInit, AfterViewInit } from '@angular/core';
import { NewsService } from 'src/app/service/news.service';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { MaterialModule } from 'src/app/material.module';
import { InfiniteScrollModule } from 'ngx-infinite-scroll';
import { AuthService } from 'src/app/service/auth.service';

@Component({
  standalone: true,
  selector: 'app-topic-list',
  imports: [MaterialModule, InfiniteScrollModule],
  templateUrl: './topic-list.component.html',
  styleUrls: ['./topic-list.component.css'],
})
export class TopicListComponent implements OnInit, AfterViewInit {
  topics: Array<{
    id: number,
    header: string, 
    text: SafeHtml, 
    user: any, 
    date: Date, 
    slug: string, 
    CommentCount: number,
    likeCount: number,
    isLikedByCurrentUser: boolean,
    likeLoading: boolean,
    collapsed: boolean, // текст свернут или нет
    textIsTooLong: boolean // флаг для проверки длины текста
  }> = [];
  signed: boolean = false;
  loading: boolean = false;
  page: number = 1; // текущая страница
  pageSize: number = 5; // количество тем за один запрос
  scrollWindow = true;
  scrollContainer: string | null = null;
  fromRoot = false;

  constructor(
    private newsService: NewsService,
    private sanitizer: DomSanitizer,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.signed = this.authService.isAuthenticated();
    this.configureScrollContainer();
    this.loadTopics();
  }
  
  ngAfterViewInit(): void {
    this.configureScrollContainer();
  }

  loadTopics(): void {
    this.loading = true;
    this.newsService.getUserTopics2(this.page, this.pageSize).subscribe((data) => {
      data.Items.forEach(topic => {
        const safeText = this.sanitizer.bypassSecurityTrustHtml(
          "<style> .content img {max-width:100%} </style>" + topic.Text
        );
        const textIsTooLong = this.checkIfTextIsTooLong(topic.Text);
  
        this.topics.push({
          id: topic.Id,
          header: topic.Header,
          text: safeText,
          user: topic.Author,
          date: new Date(topic.Date),
          slug: topic.Slug,
          CommentCount: topic.CommentCount,
          likeCount: topic.LikeCount ?? 0,
          isLikedByCurrentUser: topic.IsLikedByCurrentUser ?? false,
          likeLoading: false,
          collapsed: textIsTooLong, // если текст длинный – по умолчанию свернут
          textIsTooLong: textIsTooLong
        });
      });
      // Сортировка: самые новые темы в начале
      this.topics.sort((a, b) => b.date.getTime() - a.date.getTime());
      this.loading = false;
    });
  }

  checkIfTextIsTooLong(text: string): boolean {
    // Простейшая проверка длины текста – можно доработать логику при необходимости
    return text.length > 300;
  }

  toggleCollapse(topic: any): void {
    topic.collapsed = !topic.collapsed;
  }

  toggleLike(topic: {
    id: number;
    likeCount: number;
    isLikedByCurrentUser: boolean;
    likeLoading: boolean;
  }): void {
    if (!this.signed || topic.likeLoading) {
      return;
    }

    topic.likeLoading = true;
    this.newsService.toggleTopicLike(topic.id).subscribe({
      next: (result) => {
        topic.likeCount = result.LikeCount;
        topic.isLikedByCurrentUser = result.IsLikedByCurrentUser;
        topic.likeLoading = false;
      },
      error: () => {
        topic.likeLoading = false;
      },
    });
  }

  // Метод для загрузки дополнительных тем (для десктопа)
  onLoadMore(): void {
    this.page++;
    this.loadTopics();
  }

  // Метод для infinite scroll (для мобильной версии)
  onScrollDown(): void {
    this.page++;
    this.loadTopics();
  }

  private configureScrollContainer(): void {
    if (typeof document === 'undefined') {
      return;
    }

    const mainContent = document.querySelector('.main-content');
    if (mainContent) {
      this.scrollWindow = false;
      this.scrollContainer = '.main-content';
      this.fromRoot = true;
      return;
    }

    this.scrollWindow = true;
    this.scrollContainer = null;
    this.fromRoot = false;
  }
}
