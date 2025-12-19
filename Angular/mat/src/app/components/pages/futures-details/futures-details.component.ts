import { Component, OnInit } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute } from '@angular/router';
import { CommonService, FutInfo } from 'src/app/service/common.service';
import { OptionCodeService } from 'src/app/service/OptionCodeParserService.service';

@Component({
  standalone: false,
  selector: 'app-futures-details',
  templateUrl: './futures-details.component.html',
  styleUrls: ['./futures-details.component.css']
})
export class FuturesDetailsComponent implements OnInit {
  futInfo: FutInfo | null = null;
  errorMessage: string = '';
  group: string = '';
  name: string = '';

  constructor(
    private route: ActivatedRoute,
    private futInfoService: CommonService,
    private parser: OptionCodeService,
    private titleService: Title
  ) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const ticker = params.get('ticker');
      if (ticker) {
        var xxx = this.parser.searchByCodeBase(ticker.substring(0,2));
        this.group =  xxx.group;
        this.name = xxx.name;
        this.titleService.setTitle(`Фьючерс ${ticker} - информация и график`);
        this.loadFuturesInfo(ticker);
      } else {
        this.errorMessage = 'Тикер фьючерса не указан в URL.';
      }
    });
  }

  loadFuturesInfo(ticker: string): void {
    this.futInfoService.getFutInfo(ticker).subscribe(
      (data) => {
        this.futInfo = data;
      },
      (error) => {
        this.errorMessage = 'Ошибка при загрузке информации о фьючерсе.';
        console.error(error);
      }
    );
  }
}
