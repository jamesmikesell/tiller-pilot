import { Component, Input } from '@angular/core';
import { ChartConfiguration, ChartData, ChartDataset, ChartOptions, Color, ScatterDataPoint } from 'chart.js';

@Component({
  selector: 'app-chart',
  templateUrl: './chart.component.html',
  styleUrls: ['./chart.component.css']
})
export class ChartComponent {

  @Input()
  set data(val: AppChartData[]) { this.configureData(val); }

  lineChartData: ChartConfiguration<'scatter'>['data'];

  lineChartOptions: ChartOptions<'scatter'> = {
    responsive: true,
    animation: false,
  };

  constructor() { }


  configureData(val: AppChartData[]) {
    let data: ChartDataset<"scatter", (number | ScatterDataPoint)[]>[] = [];
    for (let i = 0; i < val.length; i++) {
      const singleChart = val[i];
      let color = `hsla(${100 * (i + 2)}, 100%, 50%, 1)`;

      data.push(
        {
          data: singleChart.data,
          backgroundColor: color,
          pointRadius: 2,
          label: singleChart.title,
        }
      );
    }

    this.lineChartData = {
      datasets: data,
    };

  }
}

export class AppChartData {
  constructor(
    public title: string,
    public data: ScatterDataPoint[],
  ) { }
}
