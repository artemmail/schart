// shared.module.ts
import { NgModule } from '@angular/core';
import { CommonModule, registerLocaleData } from '@angular/common';
import localeRu from '@angular/common/locales/ru';

import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { MaterialModule } from './material.module';

import { OverlayModule } from '@angular/cdk/overlay';
import { PortalModule } from '@angular/cdk/portal';
import { DragDropModule } from '@angular/cdk/drag-drop';

import { MatDialogModule } from '@angular/material/dialog';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatInputModule } from '@angular/material/input';

import { InfiniteScrollModule } from 'ngx-infinite-scroll';
import { IMaskModule } from 'angular-imask';

// ВАЖНО: SharedModule НЕ должен импортировать BrowserModule / HammerModule
// BrowserModule — только в AppModule. HammerModule сейчас обычно не нужен.

// PalettePicker: экспортируем МОДУЛЬ, а не компонент (если компонент не standalone)
import { PalettePickerModule } from 'src/lib/palette-picker.module';

// ===== your declarations =====
import { ResizeListenerDirective } from './service/resize-listener-directive.directive';
import { OpenSupportDialogDirective } from './directives/open-support-dialog.directive';

import { FootPrintComponent } from './components/footprint/footprint.component';
import { FootPrintSettingsDialogComponent } from './components/footprint/foot-print-settings-dialog/foot-print-settings-dialog.component';
import { MarkupEditorComponent } from './components/footprint/markup-editor/markup-editor.component';

import { SpinnerOverlayComponent } from './components/Controls/spinner-overlay-component/spinner-overlay-component.component';
import { LeaderboardTableComponent } from './components/Controls/leaderboard-table/leaderboard-table.component';
import { TickerAutocompleteComponent } from './components/Controls/ticker-autocomplete/ticker-autocomplete.component';
import { DateRangePickerComponent } from './components/Controls/DateRange/date-range-picker.Component';
import { TopNavComponent } from './components/Controls/top-nav/top-nav.component';
import { MarketSelectorComponent } from './components/Controls/MarketSelector/market-selector.component';
import { PresetSelectorComponent } from './components/Controls/PresetSelector/preset-selector.component';
import { FootPrintParamsComponent } from './components/Controls/FootPrintParams/footpintparmas.component';
import { TreeMapComponent } from './components/Controls/tree-map/tree-map.component';
import { CustomTooltipComponent } from './components/Controls/custom-tooltip/custom-tooltip.component';
import { PaymentInstructionsDialogComponent } from './components/Controls/payment-instructions-dialog/payment-instructions-dialog.component';
import { ArrowDisplayComponent } from './components/Controls/arrow-display/arrow-display.component';
import { CategorySelectorComponent } from './components/Controls/CategorySelector/category-selector.component';
import { ComboBoxComponent } from './components/Controls/ComboBox/combobox.component';
import { TickerIconComponent } from './components/Controls/ticker-icon/ticker-icon.component';
import { EditorComponent } from './components/Controls/timy-mce/app-editor.component';
import { MarketBoardComponent } from './components/Controls/market-board/market-board.component';

import { SeasonalityComponent } from './components/Reports/seasonality/seasonality.component';
import { VolumeSplashComponent } from './components/Reports/volume-splash/volume-splash.component';
import { VolumeDashboardComponent } from './components/Reports/volume-dashboard/volume-dashboard.component';
import { BarometerComponent } from './components/Reports/barometer/barometer.component';
import { TopOrdersComponent } from './components/Reports/top-orders/top-orders.component';
import { CandlesStatComponent } from './components/Reports/candles-stat/candles-stat.component';
import { TotalVolumeComponent } from './components/Reports/total-volume/total-volume.component';
import { LeadersReportComponent } from './components/Reports/leaders-report/leaders-report.component';
import { BarometerMobileComponent } from './components/Reports/barometermobile/barometer.component';
import { StatementsComponent } from './components/Reports/statements/statements.component';
import { RecommendationListComponent } from './components/Reports/recommendation-list/recommendation-list.component';
import { DividendsComponent } from './components/Reports/dividends/dividends.component';
import { FinancialComponent } from './components/Reports/financial/financial.component';
import { ShareHoldersComponent } from './components/Reports/shareholders/shareholders.component';

import { ImageUploaderComponent } from './components/pages/image-uploader/image-uploader.component';
import { FirstComponent } from './components/pages/first/first.component';
import { MainPageComponent } from './components/pages/main-page/main-page.component';
import { ServiceNewsDetailsComponent } from './components/pages/service-news-details/service-news-details.component';
import { MultiComponent } from './components/pages/multi/multi.component';
import { SubscriptionPlansComponent } from './components/pages/Tarif/subscription.component';
import { PortfolioComponent } from './components/pages/portfolio/portfolio.component';
import { PortfolioTableComponent } from './components/pages/portfolio copy/portfolio-table.component';
import { PortfolioOptimizationComponent } from './components/pages/optimization/optimization.component';
import { MarketMapComponent } from './components/pages/market-map/market-map.component';
import { NpmStatChartComponent } from './components/pages/npm-stat-chart/npm-stat-chart.component';
import { CreateTopicComponent } from './components/pages/create-topic/create-topic.component';
import { EditTopicComponent } from './components/pages/edit-topic/edit-topic.component';
import { EditCommentComponent } from './components/pages/edit-comment/edit-comment.component';
import { YooMoneyOperationsComponent } from './components/pages/yoo-money-operations/yoo-money-operations.component';
import { OperationDetailsDialogComponent } from './components/pages/operation-details-dialog/operation-details-dialog.component';
import { BillDetailsDialogComponent } from './components/pages/bill-details-dialog/bill-details-dialog.component';
import { UserPaymentsStatComponent } from './components/pages/users-pay-stats/users-pay-stats.component';
import { ProfitChartsComponent } from './components/pages/profit-charts/profit-charts.component';
import { ContractChartComponent } from './components/pages/contract-chart/contract-chart.component';
import { OptionDetailsComponent } from './components/pages/option-details/option-details.component';
import { FuturesDetailsComponent } from './components/pages/futures-details/futures-details.component';
import { ContractGroupsComponent } from './components/pages/contract-groups/contract-groups.component';

import { SettingsDialogComponent } from './mobile/settings-dialog/settings-dialog.component';

import { LoginComponent } from './components/Authentification/login/login.component';
import { LogoutComponent } from './components/Authentification/logout/logout.component';
import { ConfirmEmailComponent } from './components/Authentification/confirm-email/confirm-email.component';
import { ConfirmEmailChangeComponent } from './components/Authentification/confirm-email-change/confirm-email-change.component';
import { RegisterComponent } from './components/Authentification/register/register.component';
import { ForgotPasswordComponent } from './components/Authentification/forgot-password/forgot-password.component';
import { ForgotPasswordConfirmationComponent } from './components/Authentification/forgot-password-confirmation/forgot-password-confirmation.component';
import { ResendEmailConfirmationComponent } from './components/Authentification/resend-email-confirmation/resend-email-confirmation.component';
import { ResetPasswordComponent } from './components/Authentification/reset-password/reset-password.component';

import { PresetSelectorComponent1 } from './components/DateRangeSelector/date-range-selector.component';

import { KendoTreemapComponent } from './components/Controls/kendo-treemap/kendo-treemap.component';

import { NonModalDialogComponent } from './components/FootPrintParts/NonModal/non-modal-dialog.component';
import { TopOrdersComponentFP } from './components/FootPrintParts/top-orders/top-orders.component';
import { VolumeSearchTableComponent } from './components/FootPrintParts/volume-search-table/volume-search-table.component';

import { InformationDialogComponent } from './components/Dialogs/information-dialog/information-dialog.component';
import { SaveImageDialogComponent } from './components/Dialogs/save-image-dialog/save-image-dialog.component';
import { SupportDialogComponent } from './components/Dialogs/support-dialog/support-dialog.component';
import { LevelSettingsDialogComponent } from './components/Dialogs/level-settings-dialog/level-settings-dialog.component';
import { ConfirmDialogComponent } from './components/Dialogs/confirm-dialog/confirm-dialog.component';
import { PaymentDialogComponent } from './components/Dialogs/payments-dialog/payments-dialog.component';

import { BarometerTableComponent } from './components/tables/barometer/barometer.component';
import { UserTableComponent } from './components/tables/users-table/user-table.component';
import { CompanyTableComponent } from './components/tables/company-table/company-table.component';
import { DividendsTableComponent } from './components/tables/dividends-table/dividends-table.component';
import { ShareholdersChartComponent } from './components/tables/shareholders-chart/shareholders-chart.component';
import { FilteredDataChartComponent } from './components/tables/filtered-data-chart/filtered-data-chart.component';
import { TopicListComponent } from './components/tables/topic-list/topic-list.component';
import { OpenPositionsTableComponent } from './components/tables/open-positions-table/open-positions-table.component';
import { PaymentsTableComponent } from './components/tables/payments-table/payments-table.component';

import { MoneyToStrPipe } from './pipes/money-to-str.pipe';
import { CostToStrPipe } from './pipes/cost-to-str.pipe copy';

// locale
registerLocaleData(localeRu, 'ru');

const DECLARATIONS = [
  // directives
  ResizeListenerDirective,
  OpenSupportDialogDirective,

  // components
  FootPrintComponent,
  FootPrintSettingsDialogComponent,
  MarkupEditorComponent,

  SpinnerOverlayComponent,
  LeaderboardTableComponent,
  TickerAutocompleteComponent,
  DateRangePickerComponent,
  TopNavComponent,
  MarketSelectorComponent,
  PresetSelectorComponent,
  PresetSelectorComponent1,
  FootPrintParamsComponent,
  TreeMapComponent,
  CustomTooltipComponent,
  PaymentInstructionsDialogComponent,
  ArrowDisplayComponent,
  CategorySelectorComponent,
  ComboBoxComponent,
  TickerIconComponent,
  EditorComponent,
  MarketBoardComponent,

  SeasonalityComponent,
  VolumeSplashComponent,
  VolumeDashboardComponent,
  BarometerComponent,
  TopOrdersComponent,
  CandlesStatComponent,
  TotalVolumeComponent,
  LeadersReportComponent,
  BarometerMobileComponent,
  StatementsComponent,
  RecommendationListComponent,
  DividendsComponent,
  FinancialComponent,
  ShareHoldersComponent,

  ImageUploaderComponent,
  FirstComponent,
  MainPageComponent,
  ServiceNewsDetailsComponent,
  MultiComponent,
  SubscriptionPlansComponent,
  PortfolioComponent,
  PortfolioTableComponent,
  PortfolioOptimizationComponent,
  MarketMapComponent,
  NpmStatChartComponent,
  CreateTopicComponent,
  EditTopicComponent,
  EditCommentComponent,
  YooMoneyOperationsComponent,
  OperationDetailsDialogComponent,
  BillDetailsDialogComponent,
  UserPaymentsStatComponent,
  ProfitChartsComponent,
  ContractChartComponent,
  OptionDetailsComponent,
  FuturesDetailsComponent,
  ContractGroupsComponent,

  SettingsDialogComponent,

  LoginComponent,
  LogoutComponent,
  ConfirmEmailComponent,
  ConfirmEmailChangeComponent,
  RegisterComponent,
  ForgotPasswordComponent,
  ForgotPasswordConfirmationComponent,
  ResendEmailConfirmationComponent,
  ResetPasswordComponent,

  KendoTreemapComponent,

  NonModalDialogComponent,
  TopOrdersComponentFP,
  VolumeSearchTableComponent,

  InformationDialogComponent,
  SaveImageDialogComponent,
  SupportDialogComponent,
  LevelSettingsDialogComponent,
  ConfirmDialogComponent,
  PaymentDialogComponent,

  BarometerTableComponent,
  UserTableComponent,
  CompanyTableComponent,
  DividendsTableComponent,
  ShareholdersChartComponent,
  FilteredDataChartComponent,
  TopicListComponent,
  OpenPositionsTableComponent,
  PaymentsTableComponent,

  // pipes
  MoneyToStrPipe,
  CostToStrPipe,
];

const IMPORTS = [
  CommonModule,

  // angular forms
  FormsModule,
  ReactiveFormsModule,

  // material / cdk
  MaterialModule,
  MatDialogModule,
  MatSidenavModule,
  MatDatepickerModule,
  MatInputModule,
  OverlayModule,
  PortalModule,
  DragDropModule,

  // 3rd party
  InfiniteScrollModule,
  IMaskModule,

  // libs
  PalettePickerModule,
];

@NgModule({
  imports: [...IMPORTS],
  declarations: [...DECLARATIONS],
  exports: [
    // реэкспортим общие модули чтобы не таскать их в каждом feature-модуле
    ...IMPORTS,
    // экспортим все объявленное
    ...DECLARATIONS,
  ],
})
export class SharedModule {}
