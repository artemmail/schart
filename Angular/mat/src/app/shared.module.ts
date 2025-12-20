// shared.module.ts
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialModule } from './material.module'; // Assuming this is where Angular Material components are imported

import { ResizeListenerDirective } from './service/resize-listener-directive.directive';
import { FootPrintComponent } from './components/footprint/footprint.component';
import { SeasonalityComponent } from './components/Reports/seasonality/seasonality.component';
import { SpinnerOverlayComponent } from './components/Controls/spinner-overlay-component/spinner-overlay-component.component';
import { VolumeSplashComponent } from './components/Reports/volume-splash/volume-splash.component';
import { BarometerComponent } from './components/Reports/barometer/barometer.component';
import { LeaderboardTableComponent } from './components/Controls/leaderboard-table/leaderboard-table.component';
import { TickerAutocompleteComponent } from './components/Controls/ticker-autocomplete/ticker-autocomplete.component';
import { TopOrdersComponent } from './components/Reports/top-orders/top-orders.component';
import { ImageUploaderComponent } from './components/pages/image-uploader/image-uploader.component';
import { DateRangePickerComponent } from './components/Controls/DateRange/date-range-picker.Component';
import { UserTopicsTableComponent } from './components/tables/user-topics-table/user-topics-table.component';
import { FootPrintSettingsDialogComponent } from './components/footprint/foot-print-settings-dialog/foot-print-settings-dialog.component';


import { FirstComponent } from './components/pages/first/first.component';
import { TopNavComponent } from './components/Controls/top-nav/top-nav.component';

import { LoginComponent } from './components/Authentification/login/login.component';
import { SubscriptionPlansComponent } from './components/pages/Tarif/subscription.component';
import { MarketSelectorComponent } from './components/Controls/MarketSelector/market-selector.component';
import { PresetSelectorComponent } from './components/Controls/PresetSelector/preset-selector.component';
import { FootPrintParamsComponent } from './components/Controls/FootPrintParams/footpintparmas.component';
import { MarkupEditorComponent } from './components/footprint/markup-editor/markup-editor.component';
import { TreeMapComponent } from './components/Controls/tree-map/tree-map.component';
import { MarketMapComponent } from './components/pages/market-map/market-map.component';
import { CustomTooltipComponent } from './components/Controls/custom-tooltip/custom-tooltip.component';
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
import { CandlesStatComponent } from './components/Reports/candles-stat/candles-stat.component';
import { TotalVolumeComponent } from './components/Reports/total-volume/total-volume.component';
import { PresetSelectorComponent1 } from './components/DateRangeSelector/date-range-selector.component';

import { PaymentInstructionsDialogComponent } from './components/Controls/payment-instructions-dialog/payment-instructions-dialog.component';
import { PortfolioComponent } from './components/pages/portfolio/portfolio.component';
import { PortfolioTableComponent } from './components/pages/portfolio copy/portfolio-table.component';
import { PortfolioOptimizationComponent } from './components/pages/optimization/optimization.component';
import { ArrowDisplayComponent } from './components/Controls/arrow-display/arrow-display.component';
import { BarometerMobileComponent } from './components/Reports/barometermobile/barometer.component';
import { MoneyToStrPipe } from './pipes/money-to-str.pipe';
import { CostToStrPipe } from './pipes/cost-to-str.pipe copy';

import { LeadersReportComponent } from './components/Reports/leaders-report/leaders-report.component';
import { KendoTreemapComponent } from './components/Controls/kendo-treemap/kendo-treemap.component';
import { CategorySelectorComponent } from './components/Controls/CategorySelector/category-selector.component';
import { ComboBoxComponent } from './components/Controls/ComboBox/combobox.component';
import { MultiPageComponent } from './components/pages/multicandles/multicandles.component';
import { CreateTopicComponent } from './components/pages/create-topic/create-topic.component';
import { EditTopicComponent } from './components/pages/edit-topic/edit-topic.component';
import { ConfirmDialogComponent } from './components/Dialogs/confirm-dialog/confirm-dialog.component';
import { EditCommentComponent } from './components/pages/edit-comment/edit-comment.component';
import { PalettePickerModule } from 'src/lib/palette-picker.module';
import { PalettePickerComponent } from 'src/lib/palette-picker.component';
import { NpmStatChartComponent } from './components/pages/npm-stat-chart/npm-stat-chart.component';
import { BrowserModule } from '@angular/platform-browser';
import { OverlayModule } from '@angular/cdk/overlay';
import { PortalModule } from '@angular/cdk/portal';
import { MatDialogModule } from '@angular/material/dialog';
import { MatSidenavModule } from '@angular/material/sidenav';

import { DragDropModule } from '@angular/cdk/drag-drop';
import { NonModalDialogComponent } from './components/FootPrintParts/NonModal/non-modal-dialog.component';
import { TopOrdersComponentFP } from './components/FootPrintParts/top-orders/top-orders.component';
import { VolumeSearchTableComponent } from './components/FootPrintParts/volume-search-table/volume-search-table.component';
import { InformationDialogComponent } from './components/Dialogs/information-dialog/information-dialog.component';
import { SaveImageDialogComponent } from './components/Dialogs/save-image-dialog/save-image-dialog.component';
import { SupportDialogComponent } from './components/Dialogs/support-dialog/support-dialog.component';
import { LevelSettingsDialogComponent } from './components/Dialogs/level-settings-dialog/level-settings-dialog.component';
import { BarometerTableComponent } from './components/tables/barometer/barometer.component';

import { HammerModule } from '@angular/platform-browser';
import { UserTableComponent } from './components/tables/users-table/user-table.component';

import { IMaskModule } from 'angular-imask';
import { CompanyTableComponent } from './components/tables/company-table/company-table.component';
import { StatementsComponent } from './components/Reports/statements/statements.component';
import { RecommendationListComponent } from './components/Reports/recommendation-list/recommendation-list.component';
import { DividendsTableComponent } from './components/tables/dividends-table/dividends-table.component';
import { DividendsComponent } from './components/Reports/dividends/dividends.component';
import { FinancialComponent } from './components/Reports/financial/financial.component';
import { ShareholdersChartComponent } from './components/tables/shareholders-chart/shareholders-chart.component';
import { ShareHoldersComponent } from './components/Reports/shareholders/shareholders.component';


import { registerLocaleData } from '@angular/common';
import localeRu from '@angular/common/locales/ru';
import { FilteredDataChartComponent } from './components/tables/filtered-data-chart/filtered-data-chart.component';
import { InfiniteScrollModule } from 'ngx-infinite-scroll';
import { TopicListComponent } from './components/tables/topic-list/topic-list.component';
import { TickerIconComponent } from './components/Controls/ticker-icon/ticker-icon.component';
import { ContractChartComponent } from './components/pages/contract-chart/contract-chart.component';
import { OpenPositionsTableComponent } from './components/tables/open-positions-table/open-positions-table.component';
import { OptionDetailsComponent } from './components/pages/option-details/option-details.component';
import { FuturesDetailsComponent } from './components/pages/futures-details/futures-details.component';
import { ContractGroupsComponent } from './components/pages/contract-groups/contract-groups.component';
import { OpenSupportDialogDirective } from './directives/open-support-dialog.directive';
import { NgxMaterialTimepickerModule } from 'ngx-material-timepicker';


import { YooMoneyOperationsComponent } from './components/pages/yoo-money-operations/yoo-money-operations.component';
import { OperationDetailsDialogComponent } from './components/pages/operation-details-dialog/operation-details-dialog.component';
import { SettingsDialogComponent } from './mobile/settings-dialog/settings-dialog.component';
import { EditorComponent } from './components/Controls/timy-mce/app-editor.component';
import { BillDetailsDialogComponent } from './components/pages/bill-details-dialog/bill-details-dialog.component';
import { UserPaymentsStatComponent } from './components/pages/users-pay-stats/users-pay-stats.component';
import { PaymentsTableComponent } from './components/tables/payments-table/payments-table.component';
import { PaymentDialogComponent } from './components/Dialogs/payments-dialog/payments-dialog.component';
import { ProfitChartsComponent } from './components/pages/profit-charts/profit-charts.component';


import {
  NgxMatDatepickerInput,
  NgxMatDatetimepicker,
} from '@ngxmc/datetime-picker';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatInputModule } from '@angular/material/input';
import { MarketBoardComponent } from './components/Controls/market-board/market-board.component';
import { VolumeDashboardComponent } from './components/Reports/volume-dashboard/volume-dashboard.component';

registerLocaleData(localeRu, 'ru');



@NgModule({
  imports: [
    IMaskModule,
    MatDialogModule,
    MatSidenavModule,
    DragDropModule,
    HammerModule,
    CommonModule,
    MaterialModule,
    PalettePickerModule,
    BrowserModule,
    OverlayModule,
    PortalModule,
    InfiniteScrollModule,
    //NgxMaterialTimepickerModule,
    FormsModule,
    ReactiveFormsModule,
    MatDatepickerModule,
    MatInputModule,
    NgxMatDatetimepicker,
    NgxMatDatepickerInput,
],
  declarations: [
    ResizeListenerDirective,
    FootPrintComponent,
    SeasonalityComponent,
    SpinnerOverlayComponent,
    VolumeSplashComponent,
    VolumeDashboardComponent,
    BarometerComponent,
    LeaderboardTableComponent,
    TickerAutocompleteComponent,
    TopOrdersComponent,
    ImageUploaderComponent,
    DateRangePickerComponent,
    UserTopicsTableComponent,
    FootPrintSettingsDialogComponent,



    FirstComponent,
    TopNavComponent,

    LoginComponent,
    SubscriptionPlansComponent,
    MarketSelectorComponent,
    PresetSelectorComponent,
    FootPrintParamsComponent,
    MarkupEditorComponent,
    TreeMapComponent,
    MarketMapComponent,

    CustomTooltipComponent,
    MainPageComponent,
    ServiceNewsDetailsComponent,
    MultiComponent,
    LogoutComponent,
    ConfirmEmailComponent,
    ConfirmEmailChangeComponent,
    RegisterComponent,
    ForgotPasswordComponent,
    ForgotPasswordConfirmationComponent,
    ResendEmailConfirmationComponent,
    ResetPasswordComponent,
    CandlesStatComponent,
    TotalVolumeComponent,
    PresetSelectorComponent1,

    PaymentInstructionsDialogComponent,
    PortfolioComponent,
    PortfolioTableComponent,
    PortfolioOptimizationComponent,
    ArrowDisplayComponent,
    BarometerMobileComponent,
    MoneyToStrPipe,
    CostToStrPipe,

    LeadersReportComponent,
    KendoTreemapComponent,
    CategorySelectorComponent,
    ComboBoxComponent,
    MultiPageComponent,
    CreateTopicComponent,
    EditTopicComponent,
    ConfirmDialogComponent,
    EditCommentComponent,
    NpmStatChartComponent,
    NonModalDialogComponent,
    TopOrdersComponentFP,
    VolumeSearchTableComponent,

    InformationDialogComponent,
    ConfirmDialogComponent,
    SaveImageDialogComponent,
    SupportDialogComponent,
    LevelSettingsDialogComponent,
    BarometerTableComponent, UserTableComponent,
    CompanyTableComponent,
    StatementsComponent,
    RecommendationListComponent,
    DividendsTableComponent, DividendsComponent, ShareHoldersComponent,
    FinancialComponent,
     ShareholdersChartComponent,
     FilteredDataChartComponent,
     YooMoneyOperationsComponent,OperationDetailsDialogComponent, 
     TopicListComponent,TickerIconComponent,ContractChartComponent,OpenPositionsTableComponent,
     OptionDetailsComponent,FuturesDetailsComponent,ContractGroupsComponent,OpenSupportDialogDirective,
     SettingsDialogComponent, EditorComponent,
     BillDetailsDialogComponent, UserPaymentsStatComponent,PaymentsTableComponent,PaymentDialogComponent, ProfitChartsComponent,MarketBoardComponent
  ],
  exports: [
    ResizeListenerDirective,
    FootPrintComponent,
    SeasonalityComponent,
    SpinnerOverlayComponent,
    VolumeDashboardComponent,
    VolumeSplashComponent,
    BarometerComponent,
    LeaderboardTableComponent,
    TickerAutocompleteComponent,
    TopOrdersComponent,
    ImageUploaderComponent,
    DateRangePickerComponent,
    UserTopicsTableComponent,
    FootPrintSettingsDialogComponent,

    FirstComponent,
    TopNavComponent,

    LoginComponent,
    SubscriptionPlansComponent,
    MarketSelectorComponent,
    PresetSelectorComponent,
    FootPrintParamsComponent,
    MarkupEditorComponent,
    TreeMapComponent,
    MarketMapComponent,

    CustomTooltipComponent,
    MainPageComponent,
    ServiceNewsDetailsComponent,
    MultiComponent,
    LogoutComponent,
    ConfirmEmailComponent,
    ConfirmEmailChangeComponent,
    RegisterComponent,
    ForgotPasswordComponent,
    ForgotPasswordConfirmationComponent,
    ResendEmailConfirmationComponent,
    ResetPasswordComponent,
    CandlesStatComponent,
    TotalVolumeComponent,
    PresetSelectorComponent1,
    PalettePickerComponent,
    PaymentInstructionsDialogComponent,
    PortfolioComponent,
    PortfolioTableComponent,
    PortfolioOptimizationComponent,
    ArrowDisplayComponent,
    BarometerMobileComponent,
    MoneyToStrPipe,
    CostToStrPipe,

    LeadersReportComponent,
    KendoTreemapComponent,
    CategorySelectorComponent,
    ComboBoxComponent,
    MultiPageComponent,
    CreateTopicComponent,
    EditTopicComponent,
    ConfirmDialogComponent,
    EditCommentComponent,
    NpmStatChartComponent,
    NonModalDialogComponent,
    TopOrdersComponentFP,
    VolumeSearchTableComponent,
    InformationDialogComponent,
    ConfirmDialogComponent,
    SaveImageDialogComponent,
    SupportDialogComponent,
    LevelSettingsDialogComponent,
    BarometerTableComponent, UserTableComponent,
    CompanyTableComponent,
    StatementsComponent,
    RecommendationListComponent,
    DividendsTableComponent,
    DividendsComponent,
    FinancialComponent,
    ShareholdersChartComponent, ShareHoldersComponent,
    FilteredDataChartComponent, 
    TopicListComponent, BillDetailsDialogComponent,
    TickerIconComponent,YooMoneyOperationsComponent,OperationDetailsDialogComponent,
    ContractChartComponent,OpenPositionsTableComponent,
    OptionDetailsComponent,FuturesDetailsComponent,ContractGroupsComponent,
    OpenSupportDialogDirective , SettingsDialogComponent, EditorComponent,
     UserPaymentsStatComponent,PaymentsTableComponent, ProfitChartsComponent,
    PaymentDialogComponent, MarketBoardComponent

  ],
})
export class SharedModule { }
