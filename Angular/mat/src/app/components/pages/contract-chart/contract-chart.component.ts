import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { Title } from '@angular/platform-browser';
import { Chart } from 'chart.js';
import { OpenPosition } from 'src/app/models/fundamental.model';
import { DataService } from 'src/app/service/companydata.service';
import { DialogService } from 'src/app/service/DialogService.service';
import { ColorsService } from 'src/app/service/FootPrint/Colors/color.service';
import { MaterialModule } from 'src/app/material.module';
import { OpenPositionsTableComponent } from '../../tables/open-positions-table/open-positions-table.component';

@Component({
  standalone: true,
  selector: 'app-contract-chart',
  imports: [MaterialModule, OpenPositionsTableComponent],
  templateUrl: './contract-chart.component.html',
  styleUrls: ['./contract-chart.component.css']
})
export class ContractChartComponent implements OnInit {

  contracts: string[] = [];
  selectedContract: string = 'Si'; // Устанавливаем контракт по умолчанию
  openPositions: OpenPosition[] = [];
  openPosition: OpenPosition;
  
  selectedDate: Date | null = null; // Переменная для выбранной даты

  showPositions: boolean = true;
  showJuridicalLong: boolean = true;
  showJuridicalShort: boolean = true;
  showPhysicalLong: boolean = true;
  showPhysicalShort: boolean = true;

  displayedColumns: string[] = ['label', 'juridicalLong', 'juridicalShort', 'physicalLong', 'physicalShort', 'total'];
  dataSource = new MatTableDataSource([]);

  chart: any;

  constructor(
    private dataService: DataService,
    public dialogService: DialogService,
    private titleService: Title
  ) {
    titleService.setTitle("Открытые позиции юридических и физических лиц");
  }

  ngOnInit(): void {
    this.dataService.getAllContracts().subscribe((contracts) => {
      this.contracts = contracts;

      if (this.contracts.includes(this.selectedContract)) {
        this.onContractChange();
      }
    });

    // Добавляем слушатель на изменение размеров окна
    window.addEventListener('resize', () => {
      this.updateChart(); // Обновляем график при изменении размеров окна
    });
  }

  get juridicalLongLabel(): string {
    return this.showPositions ? 'Длинные позиции юридических лиц' : 'Юридические лица в длинных позициях';
  }

  get juridicalShortLabel(): string {
    return this.showPositions ? 'Короткие позиции юридических лиц' : 'Юридические лица в коротких позициях';
  }

  get physicalLongLabel(): string {
    return this.showPositions ? 'Длинные позиции физических лиц' : 'Физические лица в длинных позициях';
  }

  get physicalShortLabel(): string {
    return this.showPositions ? 'Короткие позиции физических лиц' : 'Физические лица в коротких позициях';
  }

  async onContractChange(): Promise<void> {
    if (this.selectedContract) {
      try {
        const positions = await this.dataService.getOpenPositionsByContract(this.selectedContract).toPromise();
        this.openPositions = positions;
        
        // Инициализируем selectedDate последней датой
        if (this.openPositions.length > 0) {
          this.selectedDate = new Date(this.openPositions[this.openPositions.length - 1].Date);
        }

        this.onDateChange();
        this.updateChart();
      } catch (err) {
        console.error('Ошибка при выполнении запроса к серверу', err);
        if (err instanceof HttpErrorResponse) {
          await this.dialogService.info_async(err.error);
        } else {
          await this.dialogService.info_async(err);
        }
      }
    }
  }

  onToggleChange(): void {
    this.updateChart();
  }

  async onDateChange(): Promise<void> {
    if (this.selectedDate) {
      const selectedTimestamp = this.selectedDate.getTime();
      const closestPosition = this.openPositions.reduce((prev, curr) => {
        const currDate = new Date(curr.Date).getTime();
        return (Math.abs(currDate - selectedTimestamp) < Math.abs(new Date(prev.Date).getTime() - selectedTimestamp)) ? curr : prev;
      });

      this.openPosition = closestPosition; // Обновляем выбранную позицию по дате
    }
  }

  updateChart(): void {
    const labels = this.openPositions.map(pos =>
      new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(pos.Date))
    );

    const dataJuridicalLong = this.openPositions.map(pos => this.showPositions ? pos.JuridicalLong : pos.JuridicalLongCount);
    const dataJuridicalShort = this.openPositions.map(pos => this.showPositions ? pos.JuridicalShort : pos.JuridicalShortCount);
    const dataPhysicalLong = this.openPositions.map(pos => this.showPositions ? pos.PhysicalLong : pos.PhysicalLongCount);
    const dataPhysicalShort = this.openPositions.map(pos => this.showPositions ? pos.PhysicalShort : pos.PhysicalShortCount);

    const datasets = [];

    if (this.showJuridicalLong) {
      datasets.push({
        label: this.juridicalLongLabel,
        data: dataJuridicalLong,
        borderColor: 'blue',
        fill: false
      });
    }
    if (this.showJuridicalShort) {
      datasets.push({
        label: this.juridicalShortLabel,
        data: dataJuridicalShort,
        borderColor: 'yellow',
        fill: false
      });
    }
    if (this.showPhysicalLong) {
      datasets.push({
        label: this.physicalLongLabel,
        data: dataPhysicalLong,
        borderColor: ColorsService.greencandlesat,
        fill: false
      });
    }
    if (this.showPhysicalShort) {
      datasets.push({
        label: this.physicalShortLabel,
        data: dataPhysicalShort,
        borderColor: ColorsService.redcandlesat,
        fill: false
      });
    }

    if (this.chart) {
      this.chart.destroy(); // Уничтожаем предыдущий график
    }

    this.chart = new Chart('chart', {
      type: 'line',
      data: {
        labels,
        datasets
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        aspectRatio: 2,
        scales: {
          x: { title: { display: true, text: 'Дата' } },
          y: { title: { display: true, text: this.showPositions ? 'Позиции' : 'Количество людей' } }
        },
        onClick: (event: any, elements: any) => {
          if (elements.length > 0) {
            const clickedIndex = elements[0].index;
            const clickedDate = this.openPositions[clickedIndex].Date;
        
            // Обновляем выбранную дату и таблицу
            this.selectedDate = new Date(clickedDate);
            this.onDateChange();
          }
        }
      }
    });
  }
}
