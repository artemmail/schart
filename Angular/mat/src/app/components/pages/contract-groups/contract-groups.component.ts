import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Title } from '@angular/platform-browser';
import { contractGroups } from 'src/app/models/option-data.model';
import { MaterialModule } from 'src/app/material.module';


@Component({
  standalone: true,
  selector: 'app-contract-groups',
  imports: [CommonModule, MaterialModule],
  templateUrl: './contract-groups.component.html',
  styleUrls: ['./contract-groups.component.css']
})
export class ContractGroupsComponent {
  contractGroups = contractGroups;
  displayedColumns: string[] = ['code_base', 'code_futures', 'name'];

  constructor(

    private titleService: Title
  ) {

    this.titleService.setTitle(`Список фьючерсов Московской Биржи`);
  }

}
