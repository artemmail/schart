import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { MarketMapComponent } from './MarketMap/marketmap.component';
import { LeadersComponent } from './Leaders/leaders.component';

import { SettingsComponent } from './settings/settings.component';

import { BarometerMobileComponent } from '../components/Reports/barometermobile/barometer.component';
import { LoginComponent } from '../components/Authentification/login/login.component';
import { LogoutComponent } from '../components/Authentification/logout/logout.component';
import { ConfirmEmailComponent } from '../components/Authentification/confirm-email/confirm-email.component';
import { ConfirmEmailChangeComponent } from '../components/Authentification/confirm-email-change/confirm-email-change.component';
import { RegisterComponent } from '../components/Authentification/register/register.component';
import { ForgotPasswordComponent } from '../components/Authentification/forgot-password/forgot-password.component';
import { ForgotPasswordConfirmationComponent } from '../components/Authentification/forgot-password-confirmation/forgot-password-confirmation.component';
import { ResendEmailConfirmationComponent } from '../components/Authentification/resend-email-confirmation/resend-email-confirmation.component';
import { ResetPasswordComponent } from '../components/Authentification/reset-password/reset-password.component';
import { UserTopicsTableComponent } from '../components/tables/user-topics-table/user-topics-table.component';
import { CreateTopicComponent } from '../components/pages/create-topic/create-topic.component';
import { EditTopicComponent } from '../components/pages/edit-topic/edit-topic.component';
import { EditCommentComponent } from '../components/pages/edit-comment/edit-comment.component';
import { ServiceNewsDetailsComponent } from '../components/pages/service-news-details/service-news-details.component';
import { FirstComponent1 } from './first/first.component';
import { LeadersFortsComponent } from './Forts/leaders.component';
import { LeadersBinanceComponent } from './BinanceLeaders/leaders.component';
import { StatementsComponent } from '../components/Reports/statements/statements.component';
import { DividendsComponent } from '../components/Reports/dividends/dividends.component';
import { FinancialComponent } from '../components/Reports/financial/financial.component';
import { ShareHoldersComponent } from '../components/Reports/shareholders/shareholders.component';
import { FilteredDataChartComponent } from '../components/tables/filtered-data-chart/filtered-data-chart.component';
import { TopicListComponent } from '../components/tables/topic-list/topic-list.component';
import { OptionDetailsComponent } from '../components/pages/option-details/option-details.component';
import { ContractGroupsComponent } from '../components/pages/contract-groups/contract-groups.component';
import { FuturesDetailsComponent } from '../components/pages/futures-details/futures-details.component';


export const routes: Routes = [
  { path: '', component: MarketMapComponent },

  {
    path: 'fundamental/:standart/:ticker/:filtername',
    component: FilteredDataChartComponent
  },

  { path: 'FootPrint', component: FirstComponent1 },
  { path: 'CandlestickChart', component: FirstComponent1 },
  { path: 'CandlestickChart/PairTrading', component: FirstComponent1 },
  
  { path: 'Leaders', component: LeadersComponent },
  { path: 'Forts', component: LeadersFortsComponent },
  { path: 'LeadersBinance', component: LeadersBinanceComponent },
  { path: 'ServiceNews/List', component: TopicListComponent },
  { path: 'statements/:ticker', component: StatementsComponent },
  { path: 'Dividends/:ticker', component: DividendsComponent },
  { path: 'ShareHolders/:ticker', component: ShareHoldersComponent },


  { path: 'Financial/:ticker', component: FinancialComponent },
  { path: 'option/:code', component: OptionDetailsComponent },

  { path: 'FuturesList', component: ContractGroupsComponent },
  { path: 'futures/:ticker', component: FuturesDetailsComponent },


  

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
  { path: 'ServiceNews/Create', component: CreateTopicComponent },
  { path: 'ServiceNews/Details/:id', component: ServiceNewsDetailsComponent },
  { path: 'Recognized/:id', component: ServiceNewsDetailsComponent },
  { path: 'ServiceNews/Content/:id', component: ServiceNewsDetailsComponent },
  { path: 'ServiceNews/Edit/:id', component: EditTopicComponent },
  { path: 'ServiceNews/EditComment/:id', component: EditCommentComponent },
  { path: 'Barometer', component: BarometerMobileComponent },
  
  { path: 'settings', component: SettingsComponent },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
