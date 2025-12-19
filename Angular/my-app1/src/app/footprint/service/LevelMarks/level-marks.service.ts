import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class LevelMarksService {
  constructor() {
    this.init();
  }

  public getLevelsFromStorage(): Record<string, object> {
    let m = window.localStorage.getItem('levels11');
    if (m != null) return JSON.parse(m);
    return { levels: {}, dates: {}, filters: {} };
  }

  public putLevelsToStorage(data: any) {
    window.localStorage.setItem('levels11', JSON.stringify(data));
  }

  public saveParamsHistory(params: any) {
    var hisDic: Record<string, any> = {};
    try {
      let tt = window.localStorage.getItem('footPrintHistory');
      if (tt == null) return;
      hisDic = JSON.parse(tt);
    } catch (e) {}
    if (hisDic == null) hisDic = {};
    var key = JSON.stringify(params); /// to &&&&&&
    var count = 1;
    if (key in hisDic) count = hisDic[key].count + 1;
    hisDic[key] = { count: count, params: params, date: new Date() };
    window.localStorage.setItem('footPrintHistory', JSON.stringify(hisDic));
    this.updateHistory();
  }

  public paramToStr(param: any) {
    if ('startDate' in param)
      return `${param.ticker},${param.startDate}-${param.endDate},таймфрейм:${param.period} мин,шаг:${param.priceStep}`;
    else
      return `${param.ticker},период:${param.rperiod},таймфрейм:${param.period} мин,шаг:${param.priceStep}`;
  }

  public updateHistory() {
    try {
      let t = window.localStorage.getItem('footPrintHistory');
      if (t == null) return;

      let hisDic = JSON.parse(t);

      if (hisDic == null) return;
      /*

      clenupClusterHistory();


      var values = Object.keys(hisDic);
      values.sort(function (a, b) {
        return Date.parse(hisDic[b].date) - Date.parse(hisDic[a].date);
      });
      for (let i = 0; i < Math.min(values.length, 15); i++) {
        var v = values[i];
        var p = hisDic[v].params;
        var tt =
          'UpdateControls(viewModel,' + JSON.stringify(p) + ', ApplyTicker)';
        tt = tt.replaceAll('"', "'");
        menu.append(
          ConvertMenuItem({
            text: paramToStr(p),
            onclick: tt,
          }),
          historyItem()
        );
      }*/
    } catch (e) {}
  }
  markset: any = { levels: {}, dates: {}, filters: {} };

  public init() {
    this.markset = this.getLevelsFromStorage();
  }

  public toggleDate(params: any, date: string) {
    var key = this.getMarksKey(params);
    if (typeof this.markset[key] == 'undefined')
      this.markset[key] = { levels: {}, dates: {}, filters: {} };

    var mset = this.markset[key].dates;
    if (typeof mset[date] == 'undefined')
      mset[date] = { color: '#F0E68C', comment: '' };
    else delete mset[date];
    this.putLevelsToStorage(this.markset);
  }

  public togglePrice(params: any, price: string) {
    var key = this.getMarksKey(params);
    if (typeof this.markset[key] == 'undefined')
      this.markset[key] = { levels: {}, dates: {}, filters: {} };

    var mset = this.markset[key].levels;
    if (typeof mset[price] == 'undefined')
      mset[price] = { color: '#F0E68C', comment: '' };
    else delete mset[price];
    this.putLevelsToStorage(this.markset);
  }

  public getMarks(params: any):any {
    var k = this.getMarksKey(params);
    if(typeof this.markset[k] != 'undefined')
      return this.markset[k];
    return null;
  }

  public getMarksKey(params: any) {
    return params.ticker + '_' + params.period + '_' + params.priceStep;
  }
}
