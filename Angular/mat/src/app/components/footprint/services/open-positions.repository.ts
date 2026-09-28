import { Injectable, OnDestroy } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom, Observable, Subject, takeUntil } from 'rxjs';
import { DataService } from 'src/app/service/companydata.service';
import { CommonService } from 'src/app/service/common.service';
import { OpenPositionsLoadResult, OpenPositionsSnapshot } from '../indicators/indicator-api';

/** Per-renderer repository: deduplicates requests and owns their cancellation. */
@Injectable()
export class OpenPositionsRepository implements OnDestroy {
  private destroyed = false;
  private readonly destroy$ = new Subject<void>();
  private readonly openPositionsLoadCache = new Map<string, Promise<OpenPositionsLoadResult>>();
  private contractsCache: string[] | null = null;

  constructor(private dataService: DataService, private commonService: CommonService) {}

  async load(ticker: string): Promise<OpenPositionsLoadResult> {
    if (this.destroyed) return { status: 'error', message: 'График закрыт.' };
    const normalizedTicker = (ticker ?? '').trim().toUpperCase();
    if (!normalizedTicker) {
      return { status: 'error', message: 'Тикер не задан.' };
    }

    const cached = this.openPositionsLoadCache.get(normalizedTicker);
    if (cached) {
      return cached;
    }

    const task = this.loadCore(normalizedTicker)
      .then((result) => {
        if (result.status === 'error') {
          this.openPositionsLoadCache.delete(normalizedTicker);
        }
        return result;
      })
      .catch((err) => {
        this.openPositionsLoadCache.delete(normalizedTicker);
        const fallback = err instanceof Error ? err.message : 'Не удалось загрузить открытые позиции.';
        return { status: 'error', message: fallback } as OpenPositionsLoadResult;
      });

    this.openPositionsLoadCache.set(normalizedTicker, task);
    return task;
  }

  private async loadCore(ticker: string): Promise<OpenPositionsLoadResult> {
    let futureInfoAssetCode: string | null = null;
    let futureInfoShortName: string | null = null;

    try {
      const futInfo = await this.readResource(() => this.commonService.getFutInfo(ticker));
      futureInfoAssetCode = (futInfo?.assetCode ?? '').trim().toUpperCase() || null;
      futureInfoShortName = (futInfo?.shortName ?? '').trim().toUpperCase() || null;
    } catch (err) {
      if (err instanceof HttpErrorResponse) {
        if (err.status === 404) {
          return {
            status: 'notFuture',
            message: 'Инструмент не является фьючерсом.',
          };
        }
        if (err.status === 401 || err.status === 403) {
          return {
            status: 'forbidden',
            message:
              this.extractHttpErrorMessage(err) ??
              'Данные по открытому интересу доступны по активной подписке.',
          };
        }
      }

      return {
        status: 'error',
        message: 'Не удалось определить фьючерс для индикатора открытых позиций.',
      };
    }

    const contracts = await this.loadContracts();
    if (this.destroyed) return { status: 'error', message: 'График закрыт.' };
    const candidates = this.resolveContractCandidates(
      ticker,
      futureInfoAssetCode,
      futureInfoShortName,
      contracts
    );

    if (!candidates.length) {
      return {
        status: 'notFuture',
        message: 'Инструмент не является фьючерсом.',
      };
    }

    let hadNotFound = false;
    let lastErrorMessage: string | null = null;

    for (const contract of candidates) {
      try {
        const positions = await this.readResource(
          () => this.dataService.getOpenPositionsByContract(contract)
        );

        if (!positions?.length) {
          hadNotFound = true;
          continue;
        }

        const normalized = this.normalizeOpenPositions(positions);
        if (!normalized.length) {
          hadNotFound = true;
          continue;
        }

        return {
          status: 'ok',
          contractName: contract,
          positions: normalized,
        };
      } catch (err) {
        if (this.destroyed) return { status: 'error', message: 'График закрыт.' };
        if (err instanceof HttpErrorResponse) {
          if (err.status === 404) {
            hadNotFound = true;
            continue;
          }
          if (err.status === 401 || err.status === 403) {
            return {
              status: 'forbidden',
              message:
                this.extractHttpErrorMessage(err) ??
                'Данные по открытому интересу доступны по активной подписке.',
            };
          }
          lastErrorMessage = this.extractHttpErrorMessage(err) ?? err.message;
          continue;
        }

        lastErrorMessage = err instanceof Error ? err.message : 'Не удалось загрузить открытые позиции.';
      }
    }

    if (hadNotFound && !lastErrorMessage) {
      return {
        status: 'noData',
        message: 'Нет информации по открытым позициям.',
      };
    }

    return {
      status: 'error',
      message: lastErrorMessage ?? 'Не удалось загрузить открытые позиции.',
    };
  }

  private async loadContracts(): Promise<string[]> {
    if (this.destroyed) return [];
    if (this.contractsCache) {
      return this.contractsCache;
    }

    try {
      const contracts = await this.readResource(() => this.dataService.getAllContracts());
      if (this.destroyed) return [];
      this.contractsCache = (contracts ?? [])
        .map((x) => (x ?? '').trim())
        .filter((x) => x.length > 0);
    } catch {
      if (this.destroyed) return [];
      this.contractsCache = [];
    }

    return this.contractsCache;
  }

  private resolveContractCandidates(
    ticker: string,
    assetCode: string | null,
    shortName: string | null,
    contracts: string[]
  ): string[] {
    const result: string[] = [];
    const seen = new Set<string>();
    const contractsMap = new Map<string, string>();
    for (const c of contracts) {
      const trimmed = (c ?? '').trim();
      if (!trimmed) {
        continue;
      }
      contractsMap.set(trimmed.toUpperCase(), trimmed);
    }

    const addCandidate = (raw: string | null | undefined) => {
      const normalized = (raw ?? '').trim().toUpperCase();
      if (!normalized || seen.has(normalized)) {
        return;
      }
      seen.add(normalized);

      const known = contractsMap.get(normalized);
      if (known) {
        result.push(known);
        return;
      }

      if (!contractsMap.size) {
        result.push(normalized);
      }
    };

    const tickerNormalized = ticker.trim().toUpperCase();
    const tickerNoGlue = tickerNormalized.endsWith('##')
      ? tickerNormalized.slice(0, -2)
      : tickerNormalized;

    addCandidate(assetCode);
    addCandidate(tickerNoGlue);
    addCandidate(shortName);

    const headFromTicker = tickerNoGlue.match(/^[A-Z]+/)?.[0] ?? '';
    if (headFromTicker) {
      addCandidate(headFromTicker);
      if (headFromTicker.length > 2) {
        addCandidate(headFromTicker.slice(0, 2));
      }
    }

    const headFromShort = (shortName ?? '').match(/^[A-Z]+/)?.[0] ?? '';
    if (headFromShort) {
      addCandidate(headFromShort);
      if (headFromShort.length > 2) {
        addCandidate(headFromShort.slice(0, 2));
      }
    }

    if (!result.length && contractsMap.size) {
      const prefix = (headFromTicker || tickerNoGlue).slice(0, 2);
      if (prefix) {
        for (const [upper, original] of contractsMap.entries()) {
          if (upper.startsWith(prefix) && !seen.has(upper)) {
            seen.add(upper);
            result.push(original);
          }
        }
      }
    }

    return result;
  }

  private normalizeOpenPositions(rows: any[]): OpenPositionsSnapshot[] {
    const normalized = (rows ?? [])
      .map((row) => {
        const dateMs = new Date(row?.Date).getTime();
        if (!Number.isFinite(dateMs)) {
          return null;
        }

        return {
          dateMs,
          juridicalLong: Number(row?.JuridicalLong ?? 0),
          juridicalShort: Number(row?.JuridicalShort ?? 0),
          physicalLong: Number(row?.PhysicalLong ?? 0),
          physicalShort: Number(row?.PhysicalShort ?? 0),
          juridicalLongCount: Number(row?.JuridicalLongCount ?? 0),
          juridicalShortCount: Number(row?.JuridicalShortCount ?? 0),
          physicalLongCount: Number(row?.PhysicalLongCount ?? 0),
          physicalShortCount: Number(row?.PhysicalShortCount ?? 0),
        } as OpenPositionsSnapshot;
      })
      .filter((x): x is OpenPositionsSnapshot => !!x)
      .sort((a, b) => a.dateMs - b.dateMs);

    return normalized;
  }

  private extractHttpErrorMessage(err: HttpErrorResponse): string | null {
    if (typeof err.error === 'string') {
      const trimmed = err.error.trim();
      return trimmed.length > 0 ? trimmed : null;
    }

    return err.error?.title || err.error?.message || null;
  }

  private readResource<T>(source: () => Observable<T>): Promise<T> {
    if (this.destroyed) return Promise.reject(new Error('График закрыт.'));
    return firstValueFrom(source().pipe(takeUntil(this.destroy$)));
  }

  ngOnDestroy(): void { this.dispose(); }

  dispose(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.destroy$.next();
    this.destroy$.complete();
    this.openPositionsLoadCache.clear();
    this.contractsCache = null;
  }
}
