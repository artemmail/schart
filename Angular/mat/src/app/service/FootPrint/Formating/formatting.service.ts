import { Injectable } from '@angular/core';
import { drob } from '../utils';

@Injectable({
  providedIn: 'root',
})
export class FormattingService {
  constructor() {}





  public monthnames: Array<string> = [
    'янв',
    'фев',
    'мар',
    'апр',
    'май',
    'июн',
    'июл',
    'авг',
    'сен',
    'окт',
    'ноя',
    'дек',
  ];
  public _Periods = [1, 5, 15, 30, 60, 1440, 1440 * 7, 1440 * 30];
  public _ClusterPeriods = [
    15,
    30,
    60,
    120,
    180,
    240,
    360,
    720,
    1440,
    1440 * 2,
    1440 * 3,
    1440 * 7,
    1440 * 30,
  ];
  public second: any = 1000;
  public minute: any = 60000;
  public hour: any = 3600000;
  public day: any = 86400000;
  public week: any = 7 * this.day;
  public month: any = 30 * this.day;
  public halfyear: any = 182 * this.day;
  public year: any = 365 * this.day;

  public MoscowTimeShift(date: Date) {
    var x = new Date();
    var currentTime = (3 * 60 + x.getTimezoneOffset()) * 60 * 1000;
    return new Date(date.getTime() + currentTime);
  }

  public isValid(str: string) {
    if (str) {
      var arr = str.split('.');
      return (
        arr.length == 3 &&
        Number(arr[0]) >= 1 &&
        Number(arr[0]) <= 31 &&
        Number(arr[1]) >= 1 &&
        Number(arr[1]) <= 12 &&
        Number(arr[2]) >= 2000 &&
        Number(arr[2]) <= 2100
      );
    }
    return false;
  }

  public getMondayOfWeek(date: Date) {
    const days = (date.getDay() + 6) % 7; // получаем номер дня недели (0 - воскресенье, 1 - понедельник, ..., 6 - суббота)
    const resultDate = new Date(date); // создаем новый объект даты для избежания изменения исходной даты
    resultDate.setDate(date.getDate() - days); // вычитаем указанное количество дней
    return resultDate;
  }
  public dateDelimeter(prevdate: Date, date: Date, period: number) {
    switch (period) {
      case 1440:
        return (
          this.getMondayOfWeek(date).getTime() !==
          this.getMondayOfWeek(prevdate).getTime()
        );
      case 1440 * 7:
        return date.getMonth() != prevdate.getMonth();
      case 30000:
      case 90000:
      case 180000:
        return date.getFullYear() != prevdate.getFullYear();
      default:
        return date.getDate() != prevdate.getDate();
    }
  }
  public parse(str: string) {
    if (str) {
      var arr = str.split('.');
      if (arr.length == 3) {
        return new Date(Number(arr[2]), Number(arr[1]) - 1, Number(arr[0]));
      }
    }
    return new Date();
  }
  public toStr(date: Date) {
    if (date && date.getDate) {
      var to2dig = function (num: number) {
        return num < 10 ? '0' + num : '' + num;
      };
      return (
        '' +
        to2dig(date.getDate()) +
        '.' +
        to2dig(date.getMonth() + 1) +
        '.' +
        date.getFullYear()
      );
    }

    return '';
  }
  public monthName(date: Date) {
    return this.monthnames[date.getMonth()] + ' ' + date.getFullYear();
  }
  public toShortStr(date: Date) {
    return date.getDate() + ' ' + this.monthnames[date.getMonth()];
  }
  public unixToTimeStr(date: number) {
    var timePart = date - Math.floor(date / this.day()) * this.day();
    var hh = Math.floor(timePart / this.hour());
    var mm = Math.floor((timePart - hh * this.hour()) / this.minute());
    return '' + this.to2DigStr(hh) + ':' + this.to2DigStr(mm);
  }
  public unixMinutesToTimeStr(date: number) {
    var d = new Date(date * 60000);
    return (
      '' + this.to2DigStr(d.getHours()) + ':' + this.to2DigStr(d.getMinutes())
    );
  }
  public to2DigStr(num: number) {
    return num <= 9 ? '0' + num : '' + num;
  }
  public getPreferedPeriod(milliseconds: number) {
    var days = milliseconds / 24 / 3600 / 1000;
    if (days <= 2) return '1'; // 1 min
    else if (days <= 5) return '5'; // 5 min
    else if (days <= 7 + 1) return '15'; // 15 min
    else if (days <= 14 + 1) return '30'; // 30 min
    else if (days <= 30 + 1) return '60'; // 1 hour
    else if (days <= 366) return '1440'; // 1 day
    else if (days <= 366 * 3) return '10080'; // 1 day
    else return '10080'; //30000// 1 month
  }
  public getPreferedCPeriod(milliseconds: number) {
    var hours = milliseconds / 3600 / 1000;
    if (hours <= 2) return '5';
    else if (hours <= 4) return '10';
    else if (hours <= 6) return '15';
    else if (hours <= 24) return '30';
    else if (hours <= 2 * 24) return '60';
    else if (hours <= 4 * 24) return '120';
    else if (hours <= 8 * 24) return '240';
    else return '1440';
  }
  public timeStrToUnix(str: string) {
    // hh:mm
    if (str == '') return 0;
    let arr = str.split(':');
    return (Number(arr[0]) * 60 + Number(arr[1])) * 60 * 1000;
  }
  public timeStrAddUnix(str: string, delta: number) {
    return this.unixToTimeStr(Math.max(0, this.timeStrToUnix(str) + delta));
  }
  public compareTextTime(a: string, b: string) {
    var ta = this.timeStrToUnix(a);
    var tb = this.timeStrToUnix(b);
    if (ta < tb) return -1;
    if (ta > tb) return 1;
    return 0;
  }
  public TimeFormat(d: Date) {
    return this.to2DigStr(d.getHours()) + ':' + this.to2DigStr(d.getMinutes());
  }
  public TimeFormat2(d: Date) {
    return (
      this.to2DigStr(d.getHours()) +
      ':' +
      this.to2DigStr(d.getMinutes()) +
      ':' +
      this.to2DigStr(d.getSeconds())
    );
  }
  public DecodeDate(date: Date) {
    return new Date(date); //(new Date(date.match(/\d+/)[0] * 1));
  }
  public jDateToStr(date: Date) {
    var d = this.DecodeDate(date);
    return this.toStr(d) + ' ' + this.TimeFormat2(d);
  }

  public jDateToStrD(date: Date) {
    return this.toStr(this.DecodeDate(date));
  }
  public jDateToStrT(date: Date) {
    return this.TimeFormat(this.DecodeDate(date));
  }
  
}

export function removeUTC(date:Date):string {
  var a = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(),
      date.getHours(), date.getMinutes(), date.getSeconds()));
  return a.toISOString();
} 

export function removeUTCd(date:Date):Date {
  return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(),
      date.getHours(), date.getMinutes(), date.getSeconds()));
 
} 

export function addUTC(date: Date) {
  return new Date(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
    date.getUTCHours(),
    date.getUTCMinutes(),
    date.getUTCSeconds()
  );
}


export function rounder(num: number) {
  let x = Math.pow(10, Math.round(Math.log10(num)));
  return 2 * x - num < num - x
    ? 2 * x
    : num - 0.5 * x < x - num
    ? x * 0.5
    : x;
}
export function rrounder(x: number, r: number) {
  return Math.floor(x / r) * r;
}
