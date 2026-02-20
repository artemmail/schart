import { Injectable } from '@angular/core';
import { marked } from 'marked';
import * as katex from 'katex';

export type McpChartType = 'bar' | 'pie' | 'candlestick';
export type McpCandlestickRperiod = 'day' | 'week' | 'month';
const MCP_CANDLESTICK_PERIOD_MAX = 180000;

export interface McpChartDataPoint {
  name: string;
  value: number;
}

export interface McpBaseChartSpec {
  title?: string;
  subtitle?: string;
  unit?: string;
  source?: string;
}

export interface McpBarChartSpec extends McpBaseChartSpec {
  type: 'bar';
  palette?: string[];
  horizontal: boolean;
  sort: 'none' | 'asc' | 'desc';
  data: McpChartDataPoint[];
}

export interface McpPieChartSpec extends McpBaseChartSpec {
  type: 'pie';
  palette?: string[];
  donut: boolean;
  showPercent: boolean;
  roseType: 'none' | 'radius' | 'area';
  data: McpChartDataPoint[];
}

export interface McpCandlestickChartSpec extends McpBaseChartSpec {
  type: 'candlestick';
  ticker: string;
  period: number;
  rperiod: McpCandlestickRperiod;
  startDate?: string;
  endDate?: string;
  mode: 'candles';
  linkLabel?: string;
}

export interface McpMarkdownParsedBlock {
  type: 'markdown';
  markdown: string;
}

export interface McpChartParsedBlock {
  type: 'chart';
  spec: McpBarChartSpec | McpPieChartSpec;
  rawBlock: string;
}

export interface McpChartLinkParsedBlock {
  type: 'chart_link';
  spec: McpCandlestickChartSpec;
  rawBlock: string;
}

export interface McpChartErrorParsedBlock {
  type: 'chart_error';
  reason: string;
  rawBlock: string;
  language: string;
}

export type McpParsedBlock =
  | McpMarkdownParsedBlock
  | McpChartParsedBlock
  | McpChartLinkParsedBlock
  | McpChartErrorParsedBlock;

interface ParseResult {
  ok: boolean;
  value?: unknown;
  reason?: string;
}

interface ParsedCandlestickPeriod {
  period: number;
  inferredRperiod?: McpCandlestickRperiod;
}

@Injectable({
  providedIn: 'root',
})
export class MarkdownRendererService {
  private readonly chartFenceRegex = /```([^\r\n`]*)\r?\n([\s\S]*?)```/g;
  private readonly chartLanguages = new Set([
    'chart',
    'bar',
    'pie',
    'candlestick',
    'candle',
  ]);

  extractBlocks(content: string): McpParsedBlock[] {
    if (!content) {
      return [];
    }

    const blocks: McpParsedBlock[] = [];
    let lastIndex = 0;
    this.chartFenceRegex.lastIndex = 0;

    let match: RegExpExecArray | null;
    while ((match = this.chartFenceRegex.exec(content)) !== null) {
      const rawBlock = match[0] ?? '';
      const languageRaw = match[1] ?? '';
      const body = match[2] ?? '';
      const language = this.normalizeLanguage(languageRaw);

      if (!this.chartLanguages.has(language)) {
        continue;
      }

      const before = content.slice(lastIndex, match.index);
      if (before) {
        blocks.push({
          type: 'markdown',
          markdown: before,
        });
      }

      blocks.push(this.parseChartBlock(language, body, rawBlock));
      lastIndex = match.index + rawBlock.length;
    }

    const tail = content.slice(lastIndex);
    if (tail || blocks.length === 0) {
      blocks.push({
        type: 'markdown',
        markdown: tail,
      });
    }

    return this.mergeMarkdownBlocks(blocks);
  }

  renderMath(content: string): string {
    if (!content) {
      return '';
    }

    let source = content.replace(/\\\$/g, '$$$$$$');

    source = source.replace(/\$\$([\s\S]+?)\$\$/g, (_, equation) => {
      try {
        return `<div class="katex-block">${katex.renderToString(equation, {
          throwOnError: false,
          displayMode: true,
        })}</div>`;
      } catch {
        return `<div class="katex-error">${equation}</div>`;
      }
    });

    source = source.replace(/\\\[([\s\S]+?)\\\]/g, (_, equation) => {
      try {
        return `<div class="katex-block">${katex.renderToString(equation, {
          throwOnError: false,
          displayMode: true,
        })}</div>`;
      } catch {
        return `<div class="katex-error">${equation}</div>`;
      }
    });

    source = source.replace(
      /(?<!\\)\$(?!\$)([\s\S]+?)(?<!\\)\$(?!\$)/g,
      (_, equation) => {
        const trimmedEquation = equation.trim();
        if (
          /^\d/.test(trimmedEquation) ||
          /^[0-9.,+\-*/^() ]+$/.test(trimmedEquation)
        ) {
          return `$${equation}$`;
        }

        try {
          return `<span class="katex-inline">${katex.renderToString(equation, {
            throwOnError: false,
            displayMode: false,
          })}</span>`;
        } catch {
          return `<span class="katex-error">${equation}</span>`;
        }
      }
    );

    source = source.replace(/\\\(([\s\S]+?)\\\)/g, (_, equation) => {
      try {
        return `<span class="katex-inline">${katex.renderToString(equation, {
          throwOnError: false,
          displayMode: false,
        })}</span>`;
      } catch {
        return `<span class="katex-error">${equation}</span>`;
      }
    });

    source = source.replace(/\$\$\$\$\$\$/g, '\\$');

    const parsed = marked.parse(source);
    return typeof parsed === 'string' ? parsed : '';
  }

  private parseChartBlock(
    language: string,
    body: string,
    rawBlock: string
  ): McpParsedBlock {
    const payloadResult = this.parseChartPayload(body);
    if (!payloadResult.ok) {
      return {
        type: 'chart_error',
        reason: payloadResult.reason ?? 'Невалидный JSON в chart-блоке.',
        rawBlock,
        language,
      };
    }

    const source = payloadResult.value as Record<string, unknown>;
    const typeResult = this.resolveChartType(language, source);
    if (!typeResult.ok) {
      return {
        type: 'chart_error',
        reason: typeResult.reason ?? 'Не удалось определить chart type.',
        rawBlock,
        language,
      };
    }

    const chartType = typeResult.value as McpChartType;
    if (chartType === 'bar') {
      const parsedBar = this.parseBarSpec(source);
      if (!parsedBar.ok) {
        return {
          type: 'chart_error',
          reason: parsedBar.reason ?? 'Ошибка в bar chart-блоке.',
          rawBlock,
          language,
        };
      }

      return {
        type: 'chart',
        spec: parsedBar.value as McpBarChartSpec,
        rawBlock,
      };
    }

    if (chartType === 'pie') {
      const parsedPie = this.parsePieSpec(source);
      if (!parsedPie.ok) {
        return {
          type: 'chart_error',
          reason: parsedPie.reason ?? 'Ошибка в pie chart-блоке.',
          rawBlock,
          language,
        };
      }

      return {
        type: 'chart',
        spec: parsedPie.value as McpPieChartSpec,
        rawBlock,
      };
    }

    const parsedCandlestick = this.parseCandlestickSpec(source);
    if (!parsedCandlestick.ok) {
      return {
        type: 'chart_error',
        reason: parsedCandlestick.reason ?? 'Ошибка в candlestick chart-блоке.',
        rawBlock,
        language,
      };
    }

    return {
      type: 'chart_link',
      spec: parsedCandlestick.value as McpCandlestickChartSpec,
      rawBlock,
    };
  }

  private parseChartPayload(body: string): ParseResult {
    const trimmed = (body ?? '').trim();
    if (!trimmed) {
      return {
        ok: false,
        reason: 'Chart-блок пустой.',
      };
    }

    try {
      const parsed = JSON.parse(trimmed);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        return {
          ok: false,
          reason: 'Chart-блок должен содержать JSON-объект.',
        };
      }

      return {
        ok: true,
        value: parsed as Record<string, unknown>,
      };
    } catch {
      const looseParsed = this.tryParseLooseChartPayload(trimmed);
      if (!looseParsed) {
        return {
          ok: false,
          reason: 'Невалидный JSON в chart-блоке.',
        };
      }

      return {
        ok: true,
        value: looseParsed,
      };
    }
  }

  private tryParseLooseChartPayload(body: string): Record<string, unknown> | null {
    const lines = body
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
    if (lines.length < 1) {
      return null;
    }

    const payload: Record<string, unknown> = {};
    let index = 0;

    const firstLine = lines[0];
    if (!firstLine.includes(':')) {
      const normalizedType = this.normalizeChartType(firstLine);
      if (!normalizedType) {
        return null;
      }
      payload['type'] = normalizedType;
      index = 1;

      // Support legacy style:
      // ```chart
      // candlestick
      // { ...json... }
      // ```
      if (index < lines.length) {
        const restRaw = lines.slice(index).join('\n');
        try {
          const parsedRest = JSON.parse(restRaw);
          if (parsedRest && typeof parsedRest === 'object' && !Array.isArray(parsedRest)) {
            const merged = parsedRest as Record<string, unknown>;
            if (merged['type'] === undefined) {
              merged['type'] = normalizedType;
            }
            return merged;
          }
        } catch {
          // Not a full JSON object after type line, continue with key:value parsing below.
        }
      }
    }

    for (; index < lines.length; index += 1) {
      const line = lines[index];
      const separatorIndex = line.indexOf(':');
      if (separatorIndex <= 0) {
        return null;
      }

      const key = line.slice(0, separatorIndex).trim();
      if (!key) {
        return null;
      }

      const rawValue = line.slice(separatorIndex + 1).trim();
      payload[key] = this.parseLooseChartValue(rawValue);
    }

    return Object.keys(payload).length > 0 ? payload : null;
  }

  private parseLooseChartValue(rawValue: string): unknown {
    if (!rawValue) {
      return '';
    }

    if (rawValue.startsWith('{') || rawValue.startsWith('[') || rawValue.startsWith('"')) {
      try {
        return JSON.parse(rawValue);
      } catch {
        return rawValue;
      }
    }

    if (rawValue.startsWith("'") && rawValue.endsWith("'") && rawValue.length >= 2) {
      return rawValue.slice(1, -1);
    }

    const lowered = rawValue.toLowerCase();
    if (lowered === 'true') {
      return true;
    }
    if (lowered === 'false') {
      return false;
    }
    if (lowered === 'null') {
      return null;
    }

    if (/^[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?$/.test(rawValue)) {
      const numeric = Number(rawValue);
      if (Number.isFinite(numeric)) {
        return numeric;
      }
    }

    return rawValue;
  }

  private resolveChartType(
    language: string,
    source: Record<string, unknown>
  ): ParseResult {
    const payloadTypeRaw = source['type'];
    const payloadType = this.normalizeChartType(payloadTypeRaw);

    if (language === 'chart') {
      if (!payloadTypeRaw) {
        return {
          ok: false,
          reason: 'Для блока `chart` требуется поле `type`.',
        };
      }

      if (!payloadType) {
        return {
          ok: false,
          reason: 'Поле `type` должно быть `bar`, `pie` или `candlestick`.',
        };
      }

      return {
        ok: true,
        value: payloadType,
      };
    }

    const languageType = this.normalizeChartType(language);
    if (!languageType) {
      return {
        ok: false,
        reason: `Неподдерживаемый chart-язык: ${language}.`,
      };
    }

    if (payloadTypeRaw !== undefined) {
      if (!payloadType) {
        return {
          ok: false,
          reason: 'Поле `type` должно быть `bar`, `pie` или `candlestick`.',
        };
      }

      if (payloadType !== languageType) {
        return {
          ok: false,
          reason: `Тип блока конфликтует с языком fence: ${languageType} != ${payloadType}.`,
        };
      }
    }

    return {
      ok: true,
      value: languageType,
    };
  }

  private parseBarSpec(source: Record<string, unknown>): ParseResult {
    const meta = this.readCommonMeta(source);
    if (!meta.ok) {
      return meta;
    }
    const metaValue = (meta.value ?? {}) as McpBaseChartSpec;

    const horizontal = source['horizontal'];
    const parsedHorizontal =
      typeof horizontal === 'boolean' ? horizontal : horizontal === undefined ? true : null;
    if (parsedHorizontal === null) {
      return {
        ok: false,
        reason: 'Поле `horizontal` должно быть boolean.',
      };
    }

    const sortRaw = source['sort'];
    let sort: 'none' | 'asc' | 'desc' = 'none';
    if (typeof sortRaw === 'string' && sortRaw.trim()) {
      const normalized = sortRaw.trim().toLowerCase();
      if (normalized !== 'none' && normalized !== 'asc' && normalized !== 'desc') {
        return {
          ok: false,
          reason: 'Поле `sort` должно быть `none`, `asc` или `desc`.',
        };
      }
      sort = normalized as 'none' | 'asc' | 'desc';
    } else if (sortRaw !== undefined) {
      return {
        ok: false,
        reason: 'Поле `sort` должно быть строкой.',
      };
    }

    const maxItemsRaw = source['maxItems'];
    let maxItems = 30;
    if (maxItemsRaw !== undefined) {
      if (typeof maxItemsRaw !== 'number' || !Number.isFinite(maxItemsRaw)) {
        return {
          ok: false,
          reason: 'Поле `maxItems` должно быть числом.',
        };
      }

      const rounded = Math.trunc(maxItemsRaw);
      if (rounded < 1) {
        return {
          ok: false,
          reason: 'Поле `maxItems` должно быть >= 1.',
        };
      }
      maxItems = Math.min(rounded, 30);
    }

    const parsedData = this.parseNamedValueData(source, true);
    if (!parsedData.ok) {
      return parsedData;
    }

    let data = (parsedData.value ?? []) as McpChartDataPoint[];
    if (sort === 'asc') {
      data = [...data].sort((a, b) => a.value - b.value);
    } else if (sort === 'desc') {
      data = [...data].sort((a, b) => b.value - a.value);
    }

    data = data.slice(0, maxItems);
    if (data.length < 1) {
      return {
        ok: false,
        reason: 'В bar-блоке нет данных после применения ограничений.',
      };
    }

    const paletteResult = this.readPalette(source['palette']);
    if (!paletteResult.ok) {
      return paletteResult;
    }
    const paletteValue = paletteResult.value as string[] | undefined;

    return {
      ok: true,
      value: {
        type: 'bar',
        ...metaValue,
        palette: paletteValue,
        horizontal: parsedHorizontal,
        sort,
        data,
      },
    };
  }

  private parsePieSpec(source: Record<string, unknown>): ParseResult {
    const meta = this.readCommonMeta(source);
    if (!meta.ok) {
      return meta;
    }
    const metaValue = (meta.value ?? {}) as McpBaseChartSpec;

    const parsedData = this.parseNamedValueData(source, false);
    if (!parsedData.ok) {
      return parsedData;
    }

    const data = (parsedData.value ?? []) as McpChartDataPoint[];
    if (data.length > 20) {
      return {
        ok: false,
        reason: 'Для pie поддерживается не более 20 элементов.',
      };
    }

    for (const item of data) {
      if (item.value < 0) {
        return {
          ok: false,
          reason: 'Для pie все значения должны быть >= 0.',
        };
      }
    }

    const sum = data.reduce((acc, item) => acc + item.value, 0);
    if (sum <= 0) {
      return {
        ok: false,
        reason: 'Сумма значений pie должна быть > 0.',
      };
    }

    const donut = this.parseBooleanWithDefault(source['donut'], false, 'donut');
    if (!donut.ok) {
      return donut;
    }
    const donutValue = Boolean(donut.value);

    const showPercent = this.parseBooleanWithDefault(
      source['showPercent'],
      true,
      'showPercent'
    );
    if (!showPercent.ok) {
      return showPercent;
    }
    const showPercentValue = Boolean(showPercent.value);

    const roseTypeRaw = source['roseType'];
    let roseType: 'none' | 'radius' | 'area' = 'none';
    if (roseTypeRaw !== undefined) {
      if (typeof roseTypeRaw !== 'string') {
        return {
          ok: false,
          reason: 'Поле `roseType` должно быть строкой.',
        };
      }

      const normalized = roseTypeRaw.trim().toLowerCase();
      if (normalized !== 'none' && normalized !== 'radius' && normalized !== 'area') {
        return {
          ok: false,
          reason: 'Поле `roseType` должно быть `none`, `radius` или `area`.',
        };
      }

      roseType = normalized as 'none' | 'radius' | 'area';
    }

    const paletteResult = this.readPalette(source['palette']);
    if (!paletteResult.ok) {
      return paletteResult;
    }
    const paletteValue = paletteResult.value as string[] | undefined;

    return {
      ok: true,
      value: {
        type: 'pie',
        ...metaValue,
        palette: paletteValue,
        donut: donutValue,
        showPercent: showPercentValue,
        roseType,
        data,
      },
    };
  }

  private parseCandlestickSpec(
    source: Record<string, unknown>
  ): ParseResult {
    const meta = this.readCommonMeta(source);
    if (!meta.ok) {
      return meta;
    }
    const metaValue = (meta.value ?? {}) as McpBaseChartSpec;

    const tickerRaw = source['ticker'];
    if (typeof tickerRaw !== 'string' || !tickerRaw.trim()) {
      return {
        ok: false,
        reason: 'Для candlestick требуется поле `ticker`.',
      };
    }

    const tickerResult = this.parseCandlestickTicker(tickerRaw);
    if (!tickerResult.ok) {
      return tickerResult;
    }
    const ticker = tickerResult.value as string;

    let period = 1;
    let inferredRperiod: McpCandlestickRperiod | undefined;
    const periodResult = this.parseCandlestickPeriod(source['period']);
    if (!periodResult.ok) {
      return periodResult;
    }
    const parsedPeriod = periodResult.value as ParsedCandlestickPeriod | undefined;
    if (parsedPeriod) {
      period = parsedPeriod.period;
      inferredRperiod = parsedPeriod.inferredRperiod;
    }

    let rperiod: McpCandlestickRperiod = inferredRperiod ?? 'day';
    const rperiodRaw = source['rperiod'];
    if (rperiodRaw !== undefined) {
      if (typeof rperiodRaw !== 'string') {
        return {
          ok: false,
          reason: 'Поле `rperiod` должно быть строкой.',
        };
      }

      const normalized = rperiodRaw.trim().toLowerCase();
      if (normalized !== 'day' && normalized !== 'week' && normalized !== 'month') {
        return {
          ok: false,
          reason: 'Поле `rperiod` должно быть `day`, `week` или `month`.',
        };
      }

      rperiod = normalized as McpCandlestickRperiod;
    }

    const startDateResult = this.parseOptionalIsoDate(source['startDate'], 'startDate');
    if (!startDateResult.ok) {
      return startDateResult;
    }
    const startDateValue = startDateResult.value as string | undefined;

    const endDateResult = this.parseOptionalIsoDate(source['endDate'], 'endDate');
    if (!endDateResult.ok) {
      return endDateResult;
    }
    const endDateValue = endDateResult.value as string | undefined;

    const modeRaw = source['mode'];
    let mode: 'candles' = 'candles';
    if (modeRaw !== undefined) {
      if (typeof modeRaw !== 'string' || !modeRaw.trim()) {
        return {
          ok: false,
          reason: 'Поле `mode` должно быть строкой.',
        };
      }

      if (modeRaw.trim().toLowerCase() !== 'candles') {
        return {
          ok: false,
          reason: 'Для candlestick поле `mode` может быть только `candles`.',
        };
      }
      mode = 'candles';
    }

    const linkLabelResult = this.readOptionalString(source, 'linkLabel', 80);
    if (!linkLabelResult.ok) {
      return linkLabelResult;
    }
    const linkLabelValue = linkLabelResult.value as string | undefined;

    return {
      ok: true,
      value: {
        type: 'candlestick',
        ...metaValue,
        ticker,
        period,
        rperiod,
        startDate: startDateValue,
        endDate: endDateValue,
        mode,
        linkLabel: linkLabelValue,
      },
    };
  }

  private parseCandlestickTicker(value: string): ParseResult {
    const normalized = value.trim().toUpperCase();
    if (!normalized) {
      return {
        ok: false,
        reason: 'Для candlestick требуется поле `ticker`.',
      };
    }

    const prefixedMatch = normalized.match(
      /^([A-Z0-9][A-Z0-9._-]{0,15}):([A-Z0-9._-]{1,32})$/
    );
    const candidate = prefixedMatch ? prefixedMatch[2] : normalized;

    if (!/^[A-Z0-9._-]{1,32}$/.test(candidate)) {
      return {
        ok: false,
        reason:
          'Поле `ticker` содержит недопустимые символы. Используйте, например, `GAZP` или `MOEX:GAZP`.',
      };
    }

    return {
      ok: true,
      value: candidate,
    };
  }

  private parseCandlestickPeriod(value: unknown): ParseResult {
    if (value === undefined || value === null || value === '') {
      return {
        ok: true,
        value: undefined,
      };
    }

    if (typeof value === 'number') {
      return this.normalizeCandlestickPeriodNumber(value);
    }

    if (typeof value !== 'string') {
      return {
        ok: false,
        reason:
          'Поле `period` должно быть числом или строкой таймфрейма (например `1d`, `4h`, `15m`).',
      };
    }

    const normalized = value.trim().toLowerCase();
    if (!normalized) {
      return {
        ok: false,
        reason:
          'Поле `period` должно быть числом или строкой таймфрейма (например `1d`, `4h`, `15m`).',
      };
    }

    if (/^[-+]?(?:\d+\.?\d*|\.\d+)$/.test(normalized)) {
      const numeric = Number(normalized);
      return this.normalizeCandlestickPeriodNumber(numeric);
    }

    const timeframeMatch = normalized.match(/^([-+]?(?:\d+\.?\d*|\.\d+))\s*([a-z]+)$/);
    if (!timeframeMatch) {
      return {
        ok: false,
        reason:
          'Неверный формат `period`. Используйте число или таймфрейм вида `15m`, `4h`, `1d`, `1w`, `1mo`.',
      };
    }

    const valueRaw = timeframeMatch[1];
    const unitRaw = timeframeMatch[2];
    const numeric = Number(valueRaw);
    if (!Number.isFinite(numeric)) {
      return {
        ok: false,
        reason:
          'Поле `period` должно быть числом или строкой таймфрейма (например `1d`, `4h`, `15m`).',
      };
    }

    const unit = this.normalizeCandlestickTimeframeUnit(unitRaw);
    if (!unit) {
      return {
        ok: false,
        reason:
          'Неподдерживаемая единица `period`. Поддерживаются: `m`, `h`, `d`, `w`, `mo`.',
      };
    }

    const period = Math.trunc(numeric * unit.multiplier);
    if (!Number.isFinite(period)) {
      return {
        ok: false,
        reason:
          'Поле `period` должно быть числом или строкой таймфрейма (например `1d`, `4h`, `15m`).',
      };
    }

    if (period < 0 || period > MCP_CANDLESTICK_PERIOD_MAX) {
      return {
        ok: false,
        reason: `Поле \`period\` должно быть в диапазоне 0..${MCP_CANDLESTICK_PERIOD_MAX}.`,
      };
    }

    return {
      ok: true,
      value: {
        period,
        inferredRperiod: unit.inferredRperiod,
      } as ParsedCandlestickPeriod,
    };
  }

  private normalizeCandlestickPeriodNumber(value: number): ParseResult {
    if (!Number.isFinite(value)) {
      return {
        ok: false,
        reason:
          'Поле `period` должно быть числом или строкой таймфрейма (например `1d`, `4h`, `15m`).',
      };
    }

    const period = Math.trunc(value);
    if (period < 0 || period > MCP_CANDLESTICK_PERIOD_MAX) {
      return {
        ok: false,
        reason: `Поле \`period\` должно быть в диапазоне 0..${MCP_CANDLESTICK_PERIOD_MAX}.`,
      };
    }

    return {
      ok: true,
      value: {
        period,
      } as ParsedCandlestickPeriod,
    };
  }

  private normalizeCandlestickTimeframeUnit(
    unit: string
  ): { multiplier: number; inferredRperiod?: McpCandlestickRperiod } | null {
    switch (unit) {
      case 'm':
      case 'min':
      case 'mins':
      case 'minute':
      case 'minutes':
        return { multiplier: 1 };
      case 'h':
      case 'hr':
      case 'hrs':
      case 'hour':
      case 'hours':
        return { multiplier: 60 };
      case 'd':
      case 'day':
      case 'days':
        return { multiplier: 1440, inferredRperiod: 'day' };
      case 'w':
      case 'wk':
      case 'wks':
      case 'week':
      case 'weeks':
        return { multiplier: 10080, inferredRperiod: 'week' };
      case 'mo':
      case 'mon':
      case 'month':
      case 'months':
        return { multiplier: 30000, inferredRperiod: 'month' };
      case 'q':
      case 'qtr':
      case 'quarter':
      case 'quarters':
        return { multiplier: 90000 };
      default:
        return null;
    }
  }

  private parseNamedValueData(
    source: Record<string, unknown>,
    allowLabelsValues: boolean
  ): ParseResult {
    if (allowLabelsValues) {
      const labelsRaw = source['labels'];
      const valuesRaw = source['values'];
      if (Array.isArray(labelsRaw) || Array.isArray(valuesRaw)) {
        if (!Array.isArray(labelsRaw) || !Array.isArray(valuesRaw)) {
          return {
            ok: false,
            reason: 'Для формата labels/values оба поля должны быть массивами.',
          };
        }

        if (labelsRaw.length !== valuesRaw.length) {
          return {
            ok: false,
            reason: 'Длины массивов labels и values должны совпадать.',
          };
        }

        const pairs: McpChartDataPoint[] = [];
        for (let i = 0; i < labelsRaw.length; i += 1) {
          const nameRaw = labelsRaw[i];
          const valueRaw = valuesRaw[i];

          if (typeof nameRaw !== 'string' || !nameRaw.trim()) {
            return {
              ok: false,
              reason: `labels[${i}] должен быть непустой строкой.`,
            };
          }

          if (typeof valueRaw !== 'number' || !Number.isFinite(valueRaw)) {
            return {
              ok: false,
              reason: `values[${i}] должен быть конечным числом.`,
            };
          }

          pairs.push({
            name: nameRaw.trim(),
            value: valueRaw,
          });
        }

        if (pairs.length < 1) {
          return {
            ok: false,
            reason: 'В chart-блоке нет данных.',
          };
        }

        return {
          ok: true,
          value: pairs,
        };
      }
    }

    const dataRaw = source['data'];
    if (!Array.isArray(dataRaw)) {
      return {
        ok: false,
        reason: 'Ожидается массив `data` (или `labels/values` для bar).',
      };
    }

    const pairs: McpChartDataPoint[] = [];
    for (let i = 0; i < dataRaw.length; i += 1) {
      const row = dataRaw[i];
      if (!row || typeof row !== 'object' || Array.isArray(row)) {
        return {
          ok: false,
          reason: `data[${i}] должен быть объектом {name,value}.`,
        };
      }

      const sourceRow = row as Record<string, unknown>;
      const nameRaw = sourceRow['name'];
      const valueRaw = sourceRow['value'];
      if (typeof nameRaw !== 'string' || !nameRaw.trim()) {
        return {
          ok: false,
          reason: `data[${i}].name должен быть непустой строкой.`,
        };
      }

      if (typeof valueRaw !== 'number' || !Number.isFinite(valueRaw)) {
        return {
          ok: false,
          reason: `data[${i}].value должен быть конечным числом.`,
        };
      }

      pairs.push({
        name: nameRaw.trim(),
        value: valueRaw,
      });
    }

    if (pairs.length < 1) {
      return {
        ok: false,
        reason: 'В chart-блоке нет данных.',
      };
    }

    return {
      ok: true,
      value: pairs,
    };
  }

  private readCommonMeta(source: Record<string, unknown>): ParseResult {
    const title = this.readOptionalString(source, 'title', 120);
    if (!title.ok) {
      return title;
    }

    const subtitle = this.readOptionalString(source, 'subtitle', 180);
    if (!subtitle.ok) {
      return subtitle;
    }

    const unit = this.readOptionalString(source, 'unit', 24);
    if (!unit.ok) {
      return unit;
    }

    const sourceText = this.readOptionalString(source, 'source', 120);
    if (!sourceText.ok) {
      return sourceText;
    }

    return {
      ok: true,
      value: {
        title: title.value as string | undefined,
        subtitle: subtitle.value as string | undefined,
        unit: unit.value as string | undefined,
        source: sourceText.value as string | undefined,
      },
    };
  }

  private readPalette(value: unknown): ParseResult {
    if (value === undefined || value === null) {
      return {
        ok: true,
        value: undefined,
      };
    }

    if (!Array.isArray(value)) {
      return {
        ok: false,
        reason: 'Поле `palette` должно быть массивом строк.',
      };
    }

    if (value.length > 20) {
      return {
        ok: false,
        reason: 'Поле `palette` поддерживает до 20 цветов.',
      };
    }

    const palette: string[] = [];
    for (let i = 0; i < value.length; i += 1) {
      const item = value[i];
      if (typeof item !== 'string' || !item.trim()) {
        return {
          ok: false,
          reason: `palette[${i}] должен быть непустой строкой.`,
        };
      }

      const color = item.trim();
      if (color.length > 32) {
        return {
          ok: false,
          reason: `palette[${i}] слишком длинный.`,
        };
      }
      palette.push(color);
    }

    return {
      ok: true,
      value: palette,
    };
  }

  private parseOptionalIsoDate(value: unknown, field: string): ParseResult {
    if (value === undefined || value === null || value === '') {
      return {
        ok: true,
        value: undefined,
      };
    }

    if (typeof value !== 'string') {
      return {
        ok: false,
        reason: `Поле \`${field}\` должно быть строкой ISO даты.`,
      };
    }

    const trimmed = value.trim();
    if (!trimmed) {
      return {
        ok: true,
        value: undefined,
      };
    }

    const date = new Date(trimmed);
    if (Number.isNaN(date.getTime())) {
      return {
        ok: false,
        reason: `Поле \`${field}\` содержит невалидную дату.`,
      };
    }

    return {
      ok: true,
      value: date.toISOString(),
    };
  }

  private parseBooleanWithDefault(
    value: unknown,
    defaultValue: boolean,
    field: string
  ): ParseResult {
    if (value === undefined || value === null) {
      return {
        ok: true,
        value: defaultValue,
      };
    }

    if (typeof value !== 'boolean') {
      return {
        ok: false,
        reason: `Поле \`${field}\` должно быть boolean.`,
      };
    }

    return {
      ok: true,
      value,
    };
  }

  private readOptionalString(
    source: Record<string, unknown>,
    field: string,
    maxLength: number
  ): ParseResult {
    const value = source[field];
    if (value === undefined || value === null || value === '') {
      return {
        ok: true,
        value: undefined,
      };
    }

    if (typeof value !== 'string') {
      return {
        ok: false,
        reason: `Поле \`${field}\` должно быть строкой.`,
      };
    }

    const trimmed = value.trim();
    if (!trimmed) {
      return {
        ok: true,
        value: undefined,
      };
    }

    if (trimmed.length > maxLength) {
      return {
        ok: false,
        reason: `Поле \`${field}\` превышает лимит ${maxLength} символов.`,
      };
    }

    return {
      ok: true,
      value: trimmed,
    };
  }

  private normalizeLanguage(raw: string): string {
    if (!raw) {
      return '';
    }

    const token = raw.trim().split(/\s+/)[0] ?? '';
    return token.toLowerCase();
  }

  private normalizeChartType(raw: unknown): McpChartType | null {
    if (typeof raw !== 'string') {
      return null;
    }

    const normalized = raw.trim().toLowerCase();
    if (normalized === 'bar' || normalized === 'pie' || normalized === 'candlestick') {
      return normalized;
    }

    if (normalized === 'candle') {
      return 'candlestick';
    }

    return null;
  }

  private mergeMarkdownBlocks(blocks: McpParsedBlock[]): McpParsedBlock[] {
    if (blocks.length <= 1) {
      return blocks;
    }

    const merged: McpParsedBlock[] = [];
    for (const block of blocks) {
      if (block.type !== 'markdown') {
        merged.push(block);
        continue;
      }

      const prev = merged[merged.length - 1];
      if (prev && prev.type === 'markdown') {
        prev.markdown = `${prev.markdown}${block.markdown}`;
        continue;
      }

      merged.push({
        type: 'markdown',
        markdown: block.markdown,
      });
    }

    return merged;
  }
}
