import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { BarometerComponent } from './components/Reports/barometer/barometer.component';
import { UserTopicsTableComponent } from './components/tables/user-topics-table/user-topics-table.component';
import { SeasonalityComponent } from './components/Reports/seasonality/seasonality.component';

import { FirstComponent } from './components/pages/first/first.component';
import { ImageUploaderComponent } from './components/pages/image-uploader/image-uploader.component';
import { TopOrdersComponent } from './components/Reports/top-orders/top-orders.component';

import { VolumeSplashComponent } from './components/Reports/volume-splash/volume-splash.component';
import { LoginComponent } from './components/Authentification/login/login.component';
import { SubscriptionPlansComponent } from './components/pages/Tarif/subscription.component';
import { SubscriptionPlanAdminComponent } from './components/pages/subscription-plan-admin/subscription-plan-admin.component';
import { MarketMapComponent } from './components/pages/market-map/market-map.component';
import { MainPageComponent } from './components/pages/main-page/main-page.component';
import { ServiceNewsDetailsComponent } from './components/pages/service-news-details/service-news-details.component';
import { MultiComponent } from './components/pages/multi/multi.component';
import { LogoutComponent } from './components/Authentification/logout/logout.component';
import { ConfirmEmailComponent } from './components/Authentification/confirm-email/confirm-email.component';
import { ConfirmEmailChangeComponent } from './components/Authentification/confirm-email-change/confirm-email-change.component';
import { RegisterComponent } from './components/Authentification/register/register.component';
import { ForgotPasswordComponent } from './components/Authentification/forgot-password/forgot-password.component';
import { ForgotPasswordConfirmationComponent } from './components/Authentification/forgot-password-confirmation/forgot-password-confirmation.component';
import { ResendEmailConfirmationComponent } from './components/Authentification/resend-email-confirmation/resend-email-confirmation.component';
import { ResetPasswordComponent } from './components/Authentification/reset-password/reset-password.component';
import { TotalVolumeComponent } from './components/Reports/total-volume/total-volume.component';
import { CandlesStatComponent } from './components/Reports/candles-stat/candles-stat.component';
import { PortfolioComponent } from './components/pages/portfolio/portfolio.component';
import { PortfolioOptimizationComponent } from './components/pages/optimization/optimization.component';

import { LeadersReportComponent } from './components/Reports/leaders-report/leaders-report.component';
import { TreeMapComponent } from './components/Controls/tree-map/tree-map.component';
import { MultiPageComponent } from './components/pages/multicandles/multicandles.component';
import { CreateTopicComponent } from './components/pages/create-topic/create-topic.component';
import { EditTopicComponent } from './components/pages/edit-topic/edit-topic.component';
import { EditCommentComponent } from './components/pages/edit-comment/edit-comment.component';
import { NpmStatChartComponent } from './components/pages/npm-stat-chart/npm-stat-chart.component';
import { UserTableComponent } from './components/tables/users-table/user-table.component';
import { NotFoundComponent } from './components/pages/not-found/not-found.component';
import { StatementsComponent } from './components/Reports/statements/statements.component';
import { DividendsComponent } from './components/Reports/dividends/dividends.component';
import { FinancialComponent } from './components/Reports/financial/financial.component';
import { ShareHoldersComponent } from './components/Reports/shareholders/shareholders.component';
import { FilteredDataChartComponent } from './components/tables/filtered-data-chart/filtered-data-chart.component';
import { AuthGuard } from './service/AuthGurad.service';
import { ContractChartComponent } from './components/pages/contract-chart/contract-chart.component';
import { OptionDetailsComponent } from './components/pages/option-details/option-details.component';
import { FuturesDetailsComponent } from './components/pages/futures-details/futures-details.component';
import { ContractGroupsComponent } from './components/pages/contract-groups/contract-groups.component';
import { YooMoneyOperationsComponent } from './components/pages/yoo-money-operations/yoo-money-operations.component';
import { UserPaymentsStatComponent } from './components/pages/users-pay-stats/users-pay-stats.component';
import { PaymentsTableComponent } from './components/tables/payments-table/payments-table.component';
import { ProfitChartsComponent } from './components/pages/profit-charts/profit-charts.component';
import { VolumeDashboardComponent } from './components/Reports/volume-dashboard/volume-dashboard.component';

const routes: Routes = [
  
  { path: '', component: MainPageComponent, pathMatch: 'full' },


  {
    path: 'fundamental/:standart/:ticker/:filtername',
    component: FilteredDataChartComponent
  },

  { path: 'statements/:ticker', component: StatementsComponent },
  { path: 'Dividends/:ticker', component: DividendsComponent },
  { path: 'ShareHolders/:ticker', component: ShareHoldersComponent },
  { path: 'Financial/:ticker', component: FinancialComponent },
  { path: 'option/:code', component: OptionDetailsComponent },

  { path: 'FuturesList', component: ContractGroupsComponent },


  

  { path: 'futures/:ticker', component: FuturesDetailsComponent },

  { path: 'blogs', component: UserTopicsTableComponent },
  { path: 'Seasonality', component: SeasonalityComponent },
  
  { path: 'FootPrint', component: FirstComponent },
  { path: 'CandlestickChart', component: FirstComponent },

  { path: 'UserPaymentsStat', component: UserPaymentsStatComponent },
  { path: 'ProfitCharts', component: ProfitChartsComponent },
  { path: 'Payments', component: PaymentsTableComponent},
  { path: 'UserTable', component: UserTableComponent },
  { path: 'YooMoney', component: YooMoneyOperationsComponent },
  { path: 'Admin/SubscriptionPlans', component: SubscriptionPlanAdminComponent },

  { path: 'OpenPositions', component: ContractChartComponent 
    //,    canActivate: [AuthGuard] 
  },

  

  

  
  
  { path: 'ServiceNews/Create', component: CreateTopicComponent },
  { path: 'ServiceNews/Details/:id', component: ServiceNewsDetailsComponent },
  { path: 'recognized/:id', component: ServiceNewsDetailsComponent },

  { path: 'ServiceNews/Content/:id', component: ServiceNewsDetailsComponent },
  { path: 'ServiceNews/Edit/:id', component: EditTopicComponent },
  { path: 'ServiceNews/EditComment/:id', component: EditCommentComponent },


  {  path: 'npm-stat-chart/:packageName', component: NpmStatChartComponent },
  
  
  { path: 'ShareImage', component: ImageUploaderComponent },
  { path: 'Payment', component: SubscriptionPlansComponent },
  { path: 'Portfolio', component: PortfolioComponent },
  { path: 'Portfolio/Optimization', component: PortfolioOptimizationComponent },
  { path: 'MultiCandles', 
    component: MultiPageComponent,
    canActivate: [AuthGuard] 
  },

  { path: 'MultiDeltas', 
    component: MultiPageComponent,
    canActivate: [AuthGuard] 
  },

      { path: 'MarketMap', component: MarketMapComponent,
        canActivate: [AuthGuard]  },
      { path: 'Leaders', component: LeadersReportComponent },

  {
    path: 'Report',
    children: [
      { path: 'Seasonality', component: SeasonalityComponent },
      { path: 'Barometer', component: BarometerComponent },
      { path: 'TopOrders', component: TopOrdersComponent },
      { path: 'TotalVolume', component: TotalVolumeComponent },
      { path: 'VolumeDashboard', component: VolumeDashboardComponent },

      

      { path: 'VolumeSplash', component: VolumeSplashComponent },

      { path: 'CandlesStat', component: CandlesStatComponent },
      { path: 'Leaders', component: LeadersReportComponent },
    ],
  },
  {
    path: 'Identity/Account',
    children: [
      { path: 'Login', component: LoginComponent },
      { path: 'Logout', component: LogoutComponent },
      { path: 'ConfirmEmail', component: ConfirmEmailComponent },
      { path: 'ConfirmEmailChange', component: ConfirmEmailChangeComponent },
      { path: 'Register', component: RegisterComponent },
      { path: 'ForgotPassword', component: ForgotPasswordComponent },
      {
        path: 'ForgotPasswordConfirmation',
        component: ForgotPasswordConfirmationComponent,
      },
      {
        path: 'ResendEmailConfirmation',
        component: ResendEmailConfirmationComponent,
      },
      { path: 'ResetPassword', component: ResetPasswordComponent },
    ],
  },
  {
    path: 'devfestfl',
    children: [
      {
        path: 'sessions',
        children: [
          { path: 'my-ally-cli', component: FirstComponent },
          { path: 'become-angular-tailer', component: FirstComponent },
          { path: 'material-design', component: FirstComponent },
          { path: 'what-up-web', component: FirstComponent },
        ],
      },
      {
        path: 'speakers',
        children: [
          {
            path: 'michael-prentice',
            children: [{ path: 'material-design', component: FirstComponent }],
          },
          {
            path: 'stephen-fluin',
            children: [{ path: 'what-up-web', component: FirstComponent }],
          },
          {
            path: 'mike-brocchi',
            children: [
              { path: 'my-ally-cli', component: FirstComponent },
              { path: 'become-angular-tailer', component: FirstComponent },
            ],
          },
        ],
      },
    ],
  },
  { path: '**', component: NotFoundComponent }, // Wildcard route for a 404 page
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
  providers: [],
})
export class AppRoutingModule {}
