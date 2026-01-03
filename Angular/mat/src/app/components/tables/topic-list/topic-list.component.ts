import { Component, OnInit } from '@angular/core';
import { NewsService } from 'src/app/service/news.service';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { MaterialModule } from 'src/app/material.module';
import { InfiniteScrollModule } from 'ngx-infinite-scroll';

@Component({
  standalone: true,
  selector: 'app-topic-list',
  imports: [MaterialModule, InfiniteScrollModule],
  templateUrl: './topic-list.component.html',
  styleUrls: ['./topic-list.component.css'],
})
export class TopicListComponent implements OnInit {
  topics: Array<{
    header: string, 
    text: SafeHtml, 
    user: any, 
    date: Date, 
    slug: string, 
    CommentCount: number,
    collapsed: boolean, // текст свернут или нет
    textIsTooLong: boolean // флаг для проверки длины текста
  }> = [];
  loading: boolean = false;
  page: number = 1; // текущая страница
  pageSize: number = 5; // количество тем за один запрос

  constructor(
    private newsService: NewsService,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit(): void {
    this.loadTopics();
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
          header: topic.Header,
          text: safeText,
          user: topic.Author,
          date: new Date(topic.Date),
          slug: topic.Slug,
          CommentCount: topic.CommentCount,
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
}
