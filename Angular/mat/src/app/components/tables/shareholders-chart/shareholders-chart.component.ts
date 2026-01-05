import { AfterViewInit, Component, ElementRef, Input, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { Chart, ChartConfiguration, ChartType } from 'chart.js/auto';
import { Observable } from 'rxjs';
import { ShareholdersStructure } from 'src/app/models/fundamental.model';
import { DataService } from 'src/app/service/companydata.service';



@Component({
  standalone: true,
  selector: 'app-shareholders-chart',
  imports: [CommonModule, MatCardModule, MatTableModule],
  templateUrl: './shareholders-chart.component.html',
  styleUrls: ['./shareholders-chart.component.css']
})
export class ShareholdersChartComponent implements OnInit, AfterViewInit, OnDestroy {
  @Input() ticker: string = '';
  @ViewChild('chartCanvas', { static: true }) chartCanvas: ElementRef<HTMLCanvasElement>;
  private chart: Chart<'pie'>;

  displayedColumns: string[] = ['name', 'sharePercentage'];
  dataSource$: Observable<ShareholdersStructure | undefined>;
  data: ShareholdersStructure;

  constructor(private DataService: DataService) {}

  async ngOnInit(): Promise<void> {
    if (this.ticker) {
      this.dataSource$ = this.DataService.getShareholdersStructure(this.ticker);
      this.data = await this.DataService.getShareholdersStructure(this.ticker).toPromise();
    }
  }

  ngAfterViewInit(): void {
    if (this.ticker) {
      this.setupChart();
    }
  }

  ngOnDestroy(): void {
    if (this.chart) {
      this.chart.destroy();
    }
  }

  
  private setupChart(): void {
    this.dataSource$.subscribe(structure => {
      if (!structure) return;
  
      const labels = structure.Shareholders.map(sh => sh.Name);
      const data = structure.Shareholders.map(sh => sh.SharePercentage);
  
      if (this.chart) {
        this.chart.destroy();
      }
  
      const chartConfig: ChartConfiguration<'pie', number[], string> = {
        type: 'pie', // Указываем, что диаграмма типа 'pie'
        data: {
          labels: labels,
          datasets: [
            {
              label: 'Доли акционеров',
              data: data,
              backgroundColor: [
                'rgba(75, 192, 192, 0.2)',
                'rgba(255, 99, 132, 0.2)',
                'rgba(255, 206, 86, 0.2)',
                'rgba(54, 162, 235, 0.2)',
                'rgba(153, 102, 255, 0.2)',
                'rgba(255, 159, 64, 0.2)',
              ],
              borderColor: [
                'rgba(75, 192, 192, 1)',
                'rgba(255, 99, 132, 1)',
                'rgba(255, 206, 86, 1)',
                'rgba(54, 162, 235, 1)',
                'rgba(153, 102, 255, 1)',
                'rgba(255, 159, 64, 1)',
              ],
              borderWidth: 1,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            title: {
              display: true,
              text: `Доли акционеров для ${this.ticker}`,
            },
          },
        },
      };
  
      this.chart = new Chart(this.chartCanvas.nativeElement, chartConfig);
    });
  }
}
