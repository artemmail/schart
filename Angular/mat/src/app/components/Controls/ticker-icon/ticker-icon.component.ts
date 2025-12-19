
import { Component, Input, OnInit } from '@angular/core';

@Component({
  standalone: false,
  selector: 'app-ticker-icon',
  templateUrl: './ticker-icon.component.html',
  styleUrls: ['./ticker-icon.component.scss']
})
export class TickerIconComponent implements OnInit {
  @Input() ticker: string = '';
  @Input() radius: number = 14;  // Радиус по умолчанию
  
  public logoPath: string = '';
  public showLetter: boolean = false;
  private formattedTicker: string = '';

  ngOnInit(): void {
    this.formattedTicker = this.formatTicker(this.ticker);
    this.logoPath = `assets/images/logos/${this.formattedTicker}.webp`;
    this.checkImageExists(this.logoPath, (exists: boolean) => {
      this.showLetter = !exists;  // Если логотип не найден, показываем букву
    });
  }


  stockDictionary: { [key: string]: string } =  {
    "AF": "AFLT",
    "AK": "AFKS",
    "AL": "ALRS",
   // "BB": "ALIBABA",
    "AS": "ASTR",
  //  "BD": "BAIDU",
    "BN": "BANE",
    "BS": "BSPB",
    "CM": "CBOM",
    "CH": "CHMF",
    "FE": "FESH",
    "FL": "FLOT",
    "FS": "FEES",
    "GK": "GMKN",
    "GZ": "GAZP",
    "HY": "HYDR",
    "IR": "IRAO",
    "IS": "ISKJ",
    "KM": "KMAZ",
    "LE": "LEAS",
    "LK": "LKOH",
    "MC": "MTLR",
    "ME": "MOEX",
    "MG": "MAGN",
    "MN": "MGNT",
    "MT": "MTSI",
    "MV": "MVID",
    "NK": "NVTK",
    "NM": "NLMK",
    "PH": "PHOR",
    "PI": "PIKK",
    "PS": "POSI",
    "PZ": "PLZL",
    "RA": "RASP",
    "RL": "RUAL",
    "RN": "ROSN",
    "RU": "RNFT",
    "RT": "RTKM",
    "SE": "SPBE",
    "SG": "SNGS",
    
    "SZ": "SGZH",
    "SN": "SNGS",
    "SO": "SIBN",
    "SF": "SOFL",
    "SV": "SVAV",
    "SR": "SBER",
    "SP": "SBER",
    "SS": "SMLT",
    "TT": "TATN",
    "TP": "TATN",
    "TI": "TCSG",
    "TN": "TRNF",
    "UP": "UPRO",
    "YD": "YDEX",
    "YZ": "YDEX",
    "YN": "YDEX",
    "VK":"VKCO",    
    "VB":"VTBR",    
    "WU": "WUSH",   
    "S0" : "SOFL"
  };


  // Функция для обработки тикера: убираем последний символ, если он "P" и тикер длиной 5 символов
  private formatTicker(ticker: string): string {
    // Проверяем, что длина строки 4 символа, третий символ — буква, четвёртый — цифра
    
     
    
    const regex = /^[A-Z]{2}[A-Z][0-9]$/;
  
    if (ticker.length === 5 && ticker.endsWith('P')) {
      // Если тикер состоит из 5 символов и заканчивается на 'P', убираем последний символ
      return ticker.slice(0, -1);
    } else if (regex.test(ticker)) {
      // Если тикер соответствует условию, проверяем наличие первых двух символов в словаре
      const key = ticker.slice(0, 2);
      if (this.stockDictionary[key]) {
        return this.stockDictionary[key];  // Возвращаем значение из словаря
      }
    }
  
    // Возвращаем оригинальный тикер, если условия не выполнены
    return ticker;
  }

  // Проверка существования изображения
  private checkImageExists(url: string, callback: (exists: boolean) => void): void {
    const img = new Image();
    img.onload = () => callback(true);
    img.onerror = () => callback(false);
    img.src = url;
  }
}


