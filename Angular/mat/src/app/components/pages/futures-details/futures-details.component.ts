import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute } from '@angular/router';
import { CommonService, FutInfo } from 'src/app/service/common.service';
import { OptionCodeService } from 'src/app/service/OptionCodeParserService.service';
import { MaterialModule } from 'src/app/material.module';

@Component({
  standalone: true,
  selector: 'app-futures-details',
  imports: [CommonModule, MaterialModule],
  templateUrl: './futures-details.component.html',
  styleUrls: ['./futures-details.component.css']
})
export class FuturesDetailsComponent implements OnInit {
  futInfo: FutInfo | null = null;
  errorMessage: string = '';
  group: string = '';
  name: string = '';
  isLoading: boolean = false;

  constructor(
    private route: ActivatedRoute,
    private futInfoService: CommonService,
    private parser: OptionCodeService,
    private titleService: Title
  ) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const ticker = params.get('ticker')?.trim() ?? '';
      this.futInfo = null;
      this.errorMessage = '';
      this.group = '';
      this.name = '';
      this.isLoading = false;
      if (!ticker) {
        this.errorMessage = 'Тикер фьючерса не указан в URL.';
        return;
      }

      const baseInfo = this.parser.searchByCodeBase(ticker.substring(0, 2));
      const futuresInfo = this.parser.searchByCodeFutures(ticker);
      const infoToShow = baseInfo.group !== 'не найдено' ? baseInfo : futuresInfo;

      this.group = infoToShow.group;
      this.name = infoToShow.name;
      this.titleService.setTitle(`Фьючерс ${ticker} - информация и график`);
      this.loadFuturesInfo(ticker);
    });
  }

  loadFuturesInfo(ticker: string): void {
    this.isLoading = true;
    this.futInfoService.getFutInfo(ticker).subscribe({
      next: (data) => {
        this.futInfo = data;
        this.isLoading = false;
      },
      error: (error) => {
        const fallbackTicker = this.getFallbackTicker(ticker);
        if (fallbackTicker && fallbackTicker !== ticker) {
          this.futInfoService.getFutInfo(fallbackTicker).subscribe({
            next: (data) => {
              this.futInfo = data;
              this.isLoading = false;
            },
            error: (fallbackError) => {
              this.errorMessage = `Ошибка при загрузке информации о фьючерсе (${ticker}, ${fallbackTicker}).`;
              this.isLoading = false;
              console.error(fallbackError);
            }
          });
        } else {
          this.errorMessage = `Ошибка при загрузке информации о фьючерсе (${ticker}).`;
          this.isLoading = false;
        }
        console.error(error);
      }
    });
  }

  private getFallbackTicker(ticker: string): string | null {
    const baseInfo = this.parser.searchByCodeBase(ticker.substring(0, 2));
    if (
      baseInfo.group !== 'не найдено' &&
      ticker.toLowerCase() === baseInfo.code_base.toLowerCase() &&
      baseInfo.code_futures !== 'не найдено'
    ) {
      return baseInfo.code_futures;
    }

    const futuresInfo = this.parser.searchByCodeFutures(ticker);
    if (
      futuresInfo.group !== 'не найдено' &&
      ticker.toLowerCase() === futuresInfo.code_futures.toLowerCase() &&
      futuresInfo.code_base !== 'не найдено'
    ) {
      return futuresInfo.code_base;
    }

    return null;
  }
}
