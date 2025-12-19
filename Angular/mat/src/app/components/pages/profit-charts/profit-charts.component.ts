import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { Chart } from 'chart.js';
import { PaymentTableData, ProfitData, UserService } from 'src/app/service/users.service';


@Component({
  standalone: false,
  selector: 'app-profit-charts',
  templateUrl: './profit-charts.component.html',
  styleUrls: ['./profit-charts.component.css'],
})
export class ProfitChartsComponent implements OnInit {
  @ViewChild('monthlyProfitChart', { static: true })
  monthlyProfitChartRef: ElementRef;
  @ViewChild('monthlyTotalProfitChart', { static: true })
  monthlyTotalProfitChartRef: ElementRef;
  @ViewChild('yearlyProfitChart', { static: true })
  yearlyProfitChartRef: ElementRef;
  @ViewChild('yearlyTotalProfitChart', { static: true })
  yearlyTotalProfitChartRef: ElementRef;

  // Data for tables
  monthlyProfitData: ProfitData[];
  paymentTableData: PaymentTableData[] = [];

  displayedColumns: string[] = ['comment', 'info'];

  monthlyProfitChart: Chart;
  monthlyTotalProfitChart: Chart;
  yearlyProfitChart: Chart;
  yearlyTotalProfitChart: Chart;

  constructor(private userService: UserService) {}

  ngOnInit(): void {
    this.loadCharts();
    this.loadPaymentTableData(); // Fetch the payment table data
  }

  loadPaymentTableData(): void {
    this.userService.getPaymentTable().subscribe((data) => {
      this.paymentTableData = data;
    });
  }

  loadCharts(): void {
    this.userService.getShowProfit().subscribe((monthlyData) => {
      // Store the data for the table, sorted in reverse order
      this.monthlyProfitData = [...monthlyData].sort((a, b) => {
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      });

      this.createMonthlyProfitChart(monthlyData);

      const yearlyData = this.groupDataByYear(monthlyData);
      this.createYearlyProfitChart(yearlyData);
    });

    this.userService.getShowProfitTotal().subscribe((monthlyTotalData) => {
      this.createMonthlyTotalProfitChart(monthlyTotalData);

      const yearlyTotalData = this.calculateCumulativeProfitByYear(
        monthlyTotalData
      );
      this.createYearlyTotalProfitChart(yearlyTotalData);
    });
  }

  groupDataByYear(data: ProfitData[]): ProfitData[] {
    const grouped = data.reduce((acc, curr) => {
      const year = new Date(curr.date).getFullYear();
      if (!acc[year]) {
        acc[year] = { date: new Date(year, 0, 1).toISOString(), profit: 0 };
      }
      acc[year].profit += curr.profit;
      return acc;
    }, {});

    return Object.values(grouped);
  }

  calculateCumulativeProfitByYear(data: ProfitData[]): ProfitData[] {
    // First, sort the data by date
    const sortedData = data.sort((a, b) => {
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    });

    const cumulativeByYear = [];
    let cumulativeSum = 0;
    let lastYear = 0;

    sortedData.forEach((item) => {
      const date = new Date(item.date);
      const year = date.getFullYear();
      cumulativeSum = item.profit; // The cumulative profit up to this month

      if (year !== lastYear) {
        cumulativeByYear.push({
          date: new Date(year, 11, 31).toISOString(), // End of the year
          profit: item.profit,
        });
      } else {
        // Update the last entry
        cumulativeByYear[cumulativeByYear.length - 1].profit = item.profit;
      }

      lastYear = year;
    });

    return cumulativeByYear;
  }

  createMonthlyProfitChart(data: ProfitData[]): void {
    const labels = data.map((item) => {
      const date = new Date(item.date);
      return `${date.getFullYear()}-${('0' + (date.getMonth() + 1)).slice(
        -2
      )}`;
    });
    const profits = data.map((item) => item.profit);

    if (this.monthlyProfitChart) {
      this.monthlyProfitChart.destroy();
    }

    this.monthlyProfitChart = new Chart(
      this.monthlyProfitChartRef.nativeElement,
      {
        type: 'bar',
        data: {
          labels: labels,
          datasets: [
            {
              label: 'Доход за месяц',
              data: profits,
              backgroundColor: 'rgba(75, 192, 192, 0.5)',
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
        },
      }
    );
  }

  createMonthlyTotalProfitChart(data: ProfitData[]): void {
    const labels = data.map((item) => {
      const date = new Date(item.date);
      return `${date.getFullYear()}-${('0' + (date.getMonth() + 1)).slice(
        -2
      )}`;
    });
    const profits = data.map((item) => item.profit);

    if (this.monthlyTotalProfitChart) {
      this.monthlyTotalProfitChart.destroy();
    }

    this.monthlyTotalProfitChart = new Chart(
      this.monthlyTotalProfitChartRef.nativeElement,
      {
        type: 'line',
        data: {
          labels: labels,
          datasets: [
            {
              label: 'Общий доход',
              data: profits,
              borderColor: 'rgba(153, 102, 255, 1)',
              fill: false,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
        },
      }
    );
  }

  createYearlyProfitChart(data: ProfitData[]): void {
    const labels = data.map((item) =>
      new Date(item.date).getFullYear().toString()
    );
    const profits = data.map((item) => item.profit);

    if (this.yearlyProfitChart) {
      this.yearlyProfitChart.destroy();
    }

    this.yearlyProfitChart = new Chart(
      this.yearlyProfitChartRef.nativeElement,
      {
        type: 'bar',
        data: {
          labels: labels,
          datasets: [
            {
              label: 'Доход за год',
              data: profits,
              backgroundColor: 'rgba(255, 159, 64, 0.5)',
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
        },
      }
    );
  }

  createYearlyTotalProfitChart(data: ProfitData[]): void {
    const labels = data.map((item) =>
      new Date(item.date).getFullYear().toString()
    );
    const profits = data.map((item) => item.profit);

    if (this.yearlyTotalProfitChart) {
      this.yearlyTotalProfitChart.destroy();
    }

    this.yearlyTotalProfitChart = new Chart(
      this.yearlyTotalProfitChartRef.nativeElement,
      {
        type: 'line',
        data: {
          labels: labels,
          datasets: [
            {
              label: 'Общий доход на конец года',
              data: profits,
              borderColor: 'rgba(255, 99, 132, 1)',
              fill: false,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
        },
      }
    );
  }
}
