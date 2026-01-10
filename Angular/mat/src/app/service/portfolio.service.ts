import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Portfolio, PortfolioComparesResult, PortfolioSolution } from '../models/portfolio.model';
import { environment } from '../environment';
import { removeUTC } from './FootPrint/Formating/formatting.service';
import { SelectListItemText } from '../models/preserts';


@Injectable({
  providedIn: 'root'
})
export class PortfolioService {

  private apiUrl = `${environment.apiUrl}/api/Portfolio`; // Замените на фактический URL вашего API

  constructor(private http: HttpClient) { }

  getShares(portfolioNumber: number): Observable<Portfolio[]> {
    return this.http.get<Portfolio[]>(`${this.apiUrl}/getShares`, { params: new HttpParams().set('portfolionumber', portfolioNumber.toString()) });
  }

  makeOrder(ticker: string, quantity: number, portfolioNumber: number): Observable<void> {
    return this.http.get<void>(`${this.apiUrl}/MakeOrder`, { params: new HttpParams()
      .set('ticker', ticker)
      .set('quantity', quantity.toString())
      .set('PortfolioNumber', portfolioNumber.toString())
    });
  }

  makeOrderSpec(ticker: string, quantity: number, price: number, portfolioNumber: number): Observable<void> {
    return this.http.get<void>(`${this.apiUrl}/MakeOrderSpec`, { params: new HttpParams()
      .set('ticker', ticker)
      .set('quantity', quantity.toString())
      .set('price', price.toString())
      .set('PortfolioNumber', portfolioNumber.toString())
    });
  }

  depositPortfolio(amount: number, portfolioNumber: number): Observable<void> {
    return this.http.get<void>(`${this.apiUrl}/DepositPortfolio`, { params: new HttpParams()
      .set('amount', amount.toString())
      .set('portfolioNumber', portfolioNumber.toString())
    });
  }

  portfolioCompares(portfolio1: number, portfolio2: number): Observable<PortfolioComparesResult> {
    return this.http.get<PortfolioComparesResult>(`${this.apiUrl}/PortfolioCompares`, { params: new HttpParams()
      .set('portfolio1', portfolio1.toString())
      .set('portfolio2', portfolio2.toString())
    });
  }

  getRPeriods(): Observable<SelectListItemText[]> {
    return this.http.get<SelectListItemText[]>('/api/Portfolio/RPeriods');
  }

  getPortfolios(): Observable<SelectListItemText[]> {
    return this.http.get<SelectListItemText[]>('/api/Portfolio/Portfolios');
  }
  


  markovitz(tickers: string, rperiod: string, startDate: Date, endDate: Date, portfolioDate: Date, deposit: number, risk: number): Observable<PortfolioSolution> {
    const params = new HttpParams()
      .set('tickers', tickers)
      .set('rperiod', rperiod)
      .set('startDate', removeUTC( startDate))
      .set('endDate', removeUTC(endDate))
      .set('portfolioDate', removeUTC(portfolioDate))
      .set('deposit', deposit.toString())
      .set('risk', risk.toString());
    return this.http.get<PortfolioSolution>('/api/Portfolio/Markovitz', { params });
  }



  copyPortfolio(fromPortfolio: number, toPortfolio: number): Observable<void> {
    return this.http.get<void>(`${this.apiUrl}/CopyPortfolio`, { params: new HttpParams()
      .set('fromportfolio', fromPortfolio.toString())
      .set('toportfolio', toPortfolio.toString())
    });
  }

  cleanUpPortfolio(portfolioNumber: number): Observable<void> {
    return this.http.get<void>(`${this.apiUrl}/CleanUpPortfolio`, { params: new HttpParams().set('PortfolioNumber', portfolioNumber.toString()) });
  }
}
