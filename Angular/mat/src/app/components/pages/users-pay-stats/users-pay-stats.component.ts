import { Component, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';

import { UserService } from 'src/app/service/users.service';
import { MatSort } from '@angular/material/sort';
import { trigger, state, style, transition, animate } from '@angular/animations';
import { ReturnedUser } from 'src/app/models/UsersTable.model';

@Component({
  standalone: false,
  selector: 'app-user-payments',
  templateUrl: './users-pay-stats.component.html',
  styleUrls: ['./users-pay-stats.component.css'],
  animations: [
    trigger('detailExpand', [
      state('collapsed', style({ height: '0px', minHeight: '0', visibility: 'hidden' })),
      state('expanded', style({ height: '*', visibility: 'visible' })),
      transition('expanded <=> collapsed', animate('225ms cubic-bezier(0.4, 0.0, 0.2, 1)')),
    ]),
  ],
})
export class UserPaymentsStatComponent implements OnInit, AfterViewInit {
  displayedColumns: string[] = [
    'expand',
    'username',
    'Email',
    'total',
    'cnt',
    'max',
    'min',
    'lastdate',
    'expdate',
  ];
  dataSource = new MatTableDataSource<ReturnedUser>();
  expandedElement: ReturnedUser | null = null;

  @ViewChild(MatSort) sort!: MatSort;

  constructor(private userPaymentService: UserService) {}

  ngOnInit(): void {
    this.userPaymentService.getReturnedUsers().subscribe((users) => {
      this.dataSource.data = users;
    });
  }

  ngAfterViewInit() {
    this.dataSource.sort = this.sort;
  }

  toggleRow(element: ReturnedUser) {
    this.expandedElement = this.expandedElement === element ? null : element;
    if (this.expandedElement && !this.expandedElement.totalPays) {
      this.userPaymentService.getTotalPays(element.username).subscribe((totalPays) => {
        element.totalPays = totalPays;
      });
    }
  }
}
