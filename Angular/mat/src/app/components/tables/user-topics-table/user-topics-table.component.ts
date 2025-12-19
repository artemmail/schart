import { Component, OnInit, ViewChild } from '@angular/core';
import { MatPaginator, PageEvent } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { UserTopic, PaginatedResult } from 'src/app/models/UserTopic';
import { NewsService } from 'src/app/service/news.service';

@Component({
  selector: 'app-user-topics-table',
  templateUrl: './user-topics-table.component.html',
  styleUrls: ['./user-topics-table.component.css'],
})
export class UserTopicsTableComponent implements OnInit {
  dataSource: MatTableDataSource<UserTopic> = new MatTableDataSource<UserTopic>();
  displayedColumns: string[] = ['Header'];//, 'Date', 'Author'];
  totalItems: number = 0; // Общее количество элементов
  pageSize: number = 10; // Размер страницы по умолчанию
  pageIndex: number = 0; // Индекс текущей страницы

  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;

  constructor(private userTopicsService: NewsService) {}

  ngOnInit() {
    this.loadInitialUserTopics(); // Инициализация при первой загрузке
  }

  loadInitialUserTopics() {
    this.userTopicsService.getUserTopics(this.pageIndex + 1, this.pageSize).subscribe((result: PaginatedResult<UserTopic>) => {
      this.dataSource.data = result.Items;
      this.totalItems = result.TotalCount;
      this.pageSize = result.PageSize;
      this.pageIndex = result.Page - 1;
    });
  }

  loadUserTopics(page: number, pageSize: number) {
    this.userTopicsService.getUserTopics(page, pageSize).subscribe((result: PaginatedResult<UserTopic>) => {
      this.dataSource.data = result.Items;
      this.totalItems = result.TotalCount; // Обновляем общее количество элементов
      this.pageIndex = result.Page - 1; // Обновляем текущий индекс страницы
      this.pageSize = result.PageSize; // Обновляем размер страницы
    });
  }

  onPageChange(event: PageEvent) {
    this.pageSize = event.pageSize;
    this.pageIndex = event.pageIndex;
    this.loadUserTopics(this.pageIndex + 1, this.pageSize);
  }
}
