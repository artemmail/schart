import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { Chart } from 'chart.js/auto';
import { formatDate } from '@angular/common';
import { NpmStatService } from 'src/app/service/npmstat.service';

@Component({
  selector: 'app-npm-stat-chart',
  templateUrl: './npm-stat-chart.component.html',
  styleUrls: ['./npm-stat-chart.component.css']
})
export class NpmStatChartComponent implements OnInit {
  @ViewChild('chartCanvas', { static: true }) chartCanvas: ElementRef<HTMLCanvasElement>;
  private chart: Chart;
  packageName: string;
  timeRange: string = 'year';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private downloadService: NpmStatService
  ) { }

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.packageName = params['packageName'];
      this.loadChartData(this.packageName);
    });
  }

  updatePackageName(): void {
    this.router.navigate(['/npm-stat-chart', this.packageName]);
  }

  updateTimeRange(): void {
    this.loadChartData(this.packageName);
  }

  private loadChartData(packageName: string): void {
    const endDate = new Date();
    const startDate = this.getStartDate(endDate, this.timeRange);

    this.downloadService.getDownloadStats(startDate, endDate, packageName).subscribe(data => {
      const labels = data.map(item => formatDate(new Date(item.day), 'dd-MM-yyyy', 'en'));
      const downloads = data.map(item => item.downloads);

      if (this.chart) {
        this.chart.destroy();
      }

      this.chart = new Chart(this.chartCanvas.nativeElement, {
        type: 'bar',
        data: {
          labels: labels,
          datasets: [
            {
              label: 'Downloads',
              data: downloads,
              backgroundColor: 'rgba(75, 192, 192, 0.2)',
              borderColor: 'rgba(75, 192, 192, 1)',
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
              text: `Downloads for ${packageName} in the last ${this.getTimeRangeText(this.timeRange)}`,
            },
          },
        },
      });
    });
  }

  private getStartDate(endDate: Date, range: string): Date {
    const startDate = new Date(endDate);
    switch (range) {
      case 'week':
        startDate.setDate(endDate.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(endDate.getMonth() - 1);
        break;
      case 'year':
        startDate.setFullYear(endDate.getFullYear() - 1);
        break;
      case '3years':
        startDate.setFullYear(endDate.getFullYear() - 3);
        break;
    }
    return startDate;
  }

  private getTimeRangeText(range: string): string {
    switch (range) {
      case 'week': return 'week';
      case 'month': return 'month';
      case 'year': return 'year';
      case '3years': return '3 years';
      default: return 'year';
    }
  }
}
