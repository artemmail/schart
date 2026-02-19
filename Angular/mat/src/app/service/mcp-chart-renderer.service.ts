import { Injectable } from '@angular/core';
import { EChartsOption } from 'echarts';
import { McpBarChartSpec, McpPieChartSpec } from './markdown-renderer.service';

@Injectable({
  providedIn: 'root',
})
export class McpChartRendererService {
  build(spec: McpBarChartSpec | McpPieChartSpec): EChartsOption {
    return spec.type === 'bar'
      ? this.buildBar(spec)
      : this.buildPie(spec);
  }

  private buildBar(spec: McpBarChartSpec): EChartsOption {
    const categories = spec.data.map((item) => item.name);
    const values = spec.data.map((item) => item.value);
    const horizontal = spec.horizontal !== false;
    const colors = spec.palette && spec.palette.length > 0
      ? spec.palette
      : ['#3b82f6', '#1d4ed8', '#0ea5e9', '#0f766e', '#22c55e', '#9333ea', '#f59e0b'];
    const unitSuffix = spec.unit ? ` ${spec.unit}` : '';

    return {
      animation: true,
      color: colors,
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'shadow',
        },
        valueFormatter: (value: unknown) =>
          typeof value === 'number'
            ? `${value.toLocaleString('ru-RU')}${unitSuffix}`
            : `${String(value ?? '')}${unitSuffix}`,
      },
      grid: {
        left: 56,
        right: 20,
        top: spec.title ? 54 : 20,
        bottom: 46,
        containLabel: true,
      },
      xAxis: horizontal
        ? {
            type: 'value',
          }
        : {
            type: 'category',
            data: categories,
            axisLabel: {
              interval: 0,
              rotate: categories.length > 8 ? 22 : 0,
            },
          },
      yAxis: horizontal
        ? {
            type: 'category',
            data: categories,
            axisLabel: {
              interval: 0,
              width: 140,
              overflow: 'truncate',
            },
          }
        : {
            type: 'value',
          },
      series: [
        {
          type: 'bar',
          data: values,
          barMaxWidth: 26,
          itemStyle: {
            borderRadius: horizontal ? [0, 6, 6, 0] : [6, 6, 0, 0],
          },
          label: {
            show: values.length <= 12,
            position: horizontal ? 'right' : 'top',
            formatter: (params: { value: unknown }) => {
              const value = typeof params.value === 'number'
                ? params.value.toLocaleString('ru-RU')
                : String(params.value ?? '');
              return `${value}${unitSuffix}`;
            },
          },
        },
      ],
    };
  }

  private buildPie(spec: McpPieChartSpec): EChartsOption {
    const colors = spec.palette && spec.palette.length > 0
      ? spec.palette
      : ['#3b82f6', '#0ea5e9', '#10b981', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6'];
    const unitSuffix = spec.unit ? ` ${spec.unit}` : '';

    return {
      animation: true,
      color: colors,
      tooltip: {
        trigger: 'item',
        formatter: (params: any) => {
          const name = params.name ?? '';
          const value =
            typeof params.value === 'number'
              ? params.value.toLocaleString('ru-RU')
              : String(params.value ?? '');
          const percent = typeof params.percent === 'number' ? `${params.percent}%` : '';
          return `${name}<br/>${value}${unitSuffix}${percent ? ` (${percent})` : ''}`;
        },
      },
      legend: {
        type: 'scroll',
        bottom: 0,
      },
      series: [
        {
          type: 'pie',
          radius: spec.donut ? ['46%', '72%'] : ['0%', '72%'],
          center: ['50%', '44%'],
          roseType: spec.roseType === 'none' ? undefined : spec.roseType,
          avoidLabelOverlap: true,
          itemStyle: {
            borderColor: '#fff',
            borderWidth: 1,
          },
          label: {
            show: true,
            formatter: spec.showPercent
              ? '{b}: {d}%'
              : `{b}: {c}${unitSuffix}`,
          },
          data: spec.data.map((item) => ({
            name: item.name,
            value: item.value,
          })),
        },
      ],
    };
  }
}
