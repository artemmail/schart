// user-table.component.ts

import { Component, OnInit, ViewChild } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator, PageEvent } from '@angular/material/paginator'; // Импортируйте PageEvent
import { MatSort, Sort } from '@angular/material/sort'; // Импортируйте Sort
import { MatDialog } from '@angular/material/dialog';
import { UserService } from 'src/app/service/users.service';
import { DialogService } from 'src/app/service/DialogService.service';
import { Title } from '@angular/platform-browser';
import { ApplicationUserModel } from 'src/app/models/UsersTable.model';
import { MaterialModule } from 'src/app/material.module';

@Component({
  standalone: true,
  selector: 'app-user-table',
  imports: [MaterialModule],
  templateUrl: './user-table.component.html',
  styleUrls: ['./user-table.component.css']
})
export class UserTableComponent implements OnInit {
  displayedColumns: string[] = ['UserName', 'Email', 'EmailConfirmed', 'RegistrationDate', 'actions'];
  dataSource: MatTableDataSource<ApplicationUserModel> = new MatTableDataSource();

  totalItems: number = 0; // Общее количество элементов
  pageSize: number = 20; // Размер страницы
  pageIndex: number = 0; // Текущая страница (индекс начинается с 0)
  sortField: string = ''; // Поле сортировки
  sortOrder: string = ''; // Порядок сортировки ('asc' или 'desc')
  filterValue: string = ''; // Значение фильтра

  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;

  constructor(
    private userService: UserService,
    public dialog: MatDialog,
    private dialogService: DialogService,
    private titleService: Title
  ) {
    titleService.setTitle('Пользователи системы');
  }

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers(): void {
    const page = this.pageIndex + 1; // Индексация страниц на сервере начинается с 1
    this.userService
      .getUsers(page, this.pageSize, this.sortField, this.sortOrder, this.filterValue)
      .subscribe(
        (response) => {
          this.dataSource.data = response.items;
          this.totalItems = response.totalCount;
          // Обновляем настройки пагинатора после получения данных
          this.paginator.length = this.totalItems;
        },
        (error) => {
          console.error('Ошибка при загрузке пользователей:', error);
        }
      );
  }

  applyFilter(event: Event): void {
    this.filterValue = (event.target as HTMLInputElement).value.trim().toLowerCase();
    this.pageIndex = 0; // Сбрасываем на первую страницу при изменении фильтра
    this.loadUsers();
  }

  // Обработчик изменения пагинации
  onPaginateChange(event: PageEvent): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.loadUsers();
  }

  // Обработчик изменения сортировки
  onSortChange(sortState: Sort): void {
    this.sortField = sortState.active;
    this.sortOrder = sortState.direction;
    this.loadUsers();
  }

  deleteUser(id: string): void {
    this.dialogService.confirm('Вы уверены, что хотите удалить этого пользователя?')
      .subscribe((result) => {
        if (result) {
          this.userService.deleteUser(id).subscribe(
            () => {
              this.loadUsers();
            },
            (error) => {
              this.dialogService.info(`Ошибка при удалении пользователя: ${error.error}`);
            }
          );
        }
      });
  }
}
