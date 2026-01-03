/*import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { LOCALE_ID, NgModule } from '@angular/core';
import { CommonModule, registerLocaleData } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { A11yModule } from '@angular/cdk/a11y';
import { BidiModule } from '@angular/cdk/bidi';
import { ObserversModule } from '@angular/cdk/observers';
import { OverlayModule } from '@angular/cdk/overlay';
import { PlatformModule } from '@angular/cdk/platform';
import { PortalModule } from '@angular/cdk/portal';
import { ScrollDispatcher } from '@angular/cdk/scrolling';
import { CdkStepperModule } from '@angular/cdk/stepper';
import { CdkTableModule } from '@angular/cdk/table';

import { AppComponent } from './app.component';
import { FlexLayoutModule } from '@angular/flex-layout';

import { AppRoutingModule } from './app-routing.module';
import { NgJsonEditorModule } from 'ang-jsoneditor';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import {
  MatRippleModule,
  MatNativeDateModule,
  DateAdapter,
  MAT_DATE_FORMATS,
} from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatRadioModule } from '@angular/material/radio';
import { MatSelectModule } from '@angular/material/select';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTabsModule } from '@angular/material/tabs';
import { MatToolbarModule } from '@angular/material/toolbar';

import { MatTooltipModule } from '@angular/material/tooltip';

import { MatProgressBarModule } from '@angular/material/progress-bar';

import { MatSliderModule } from '@angular/material/slider';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { ScrollingModule } from '@angular/cdk/scrolling';

import { Routes } from '@angular/router';
import {
  HttpClient,
  HttpClientModule,
  HttpHandler,
} from '@angular/common/http';

import { CdkTreeModule } from '@angular/cdk/tree';
import { MatDividerModule } from '@angular/material/divider';

import { MatFormFieldModule } from '@angular/material/form-field';

import { MatSortModule } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';
import { MatTreeModule } from '@angular/material/tree';
import { MatBadgeModule } from '@angular/material/badge';
import { MatPaginatorModule } from '@angular/material/paginator';
import { ResizeListenerDirective } from './service/resize-listener-directive.directive';
import { FootPrintComponent } from './components/footprint/components/footprint/footprint.component';
import { SeasonalityComponent } from './components/Reports/seasonality/seasonality.component';
import { SpinnerOverlayComponent } from './components/Controls/spinner-overlay-component/spinner-overlay-component.component';
import { VolumeSplashComponent } from './components/Reports/volume-splash/volume-splash.component';
import { BarometerComponent } from './components/Reports/barometer/barometer.component';
import { LeaderboardTableComponent } from './components/Controls/leaderboard-table/leaderboard-table.component';
import { TickerAutocompleteComponent } from './components/Controls/ticker-autocomplete/ticker-autocomplete.component';
import { TopOrdersComponent } from './components/Reports/top-orders/top-orders.component';
import { ImageUploaderComponent } from './components/pages/image-uploader/image-uploader.component';
import { DateRangePickerComponent } from './components/Controls/DateRange/date-range-picker.component';
import { UserTopicsTableComponent } from './components/pages/user-topics-table/user-topics-table.component';
import { FootPrintSettingsDialogComponent } from './components/footprint/components/footprint-settings-dialog/footprint-settings-dialog.component';
import { NavListItemComponent } from './components/Controls/nav-list-item/nav-list-item.component';
import { MenuListItemComponent } from './components/Controls/menu-list-item/menu-list-item.component';
import { MaterialDrawerComponent } from './components/footprint/material-drawer/material-drawer.component';
import { FirstComponent } from './components/pages/first/first.component';
import { TopNavComponent } from './components/Controls/top-nav/top-nav.component';
import { NavListItemMiniComponent } from './components/Controls/nav-list-item-mini/nav-list-item-mini.component';
import { NavService } from './service/nav.service';
import { LoginComponent } from './components/Authentification/login/login.component';
import { SubscriptionPlansComponent } from './components/pages/Tarif/subscription.component';
import { MarketSelectorComponent } from './components/Controls/MarketSelector/market-selector.component';
import { PresetSelectorComponent } from './components/Controls/PresetSelector/preset-selector.component';
import { FootPrintParamsComponent } from './components/Controls/FootPrintParams/footpintparmas.component';
import { MY_DATE_FORMATS } from './service/date-formats';
import { MarkupEditorComponent } from './components/footprint/components/markup-editor/markup-editor.component';

import { GoogleChartsModule } from 'angular-google-charts';
import { TreeMapComponent } from './components/Controls/tree-map/tree-map.component';
import { MarketMapComponent } from './components/pages/market-map/market-map.component';
import { TreemapComponent2 } from './components/Controls/treemap2/treemap2.component';
import { CustomTooltipComponent } from './components/Controls/custom-tooltip/custom-tooltip.component';
import { NgxEchartsModule } from 'ngx-echarts';
import { HighchartsChartModule } from 'highcharts-angular';
import { MainPageComponent } from './components/pages/main-page/main-page.component';
import { EditorModule } from '@tinymce/tinymce-angular';
import { ServiceNewsDetailsComponent } from './components/pages/service-news-details/service-news-details.component';
import { MultiComponent } from './components/pages/multi/multi.component';
import * as signalR from '@microsoft/signalr';
import { LogoutComponent } from './components/Authentification/logout/logout.component';
import { ConfirmEmailComponent } from './components/Authentification/confirm-email/confirm-email.component';
import { ConfirmEmailChangeComponent } from './components/Authentification/confirm-email-change/confirm-email-change.component';
import { RegisterComponent } from './components/Authentification/register/register.component';
import { ForgotPasswordComponent } from './components/Authentification/forgot-password/forgot-password.component';
import { ForgotPasswordConfirmationComponent } from './components/Authentification/forgot-password-confirmation/forgot-password-confirmation.component';
import { ResendEmailConfirmationComponent } from './components/Authentification/resend-email-confirmation/resend-email-confirmation.component';
import { ResetPasswordComponent } from './components/Authentification/reset-password/reset-password.component';

import localeRu from '@angular/common/locales/ru';
import { CandlesStatComponent } from './components/Reports/candles-stat/candles-stat.component';
import { TotalVolumeComponent } from './components/Reports/total-volume/total-volume.component';
import { PresetSelectorComponent1 } from './components/Controls/FootPrintParams/PresetSelector/preset-selector.component';
import { PalettePickerComponent } from './components/Controls/color-picker/color-picker.component';
import { PaymentInstructionsDialogComponent } from './components/Controls/payment-instructions-dialog/payment-instructions-dialog.component';
import { PortfolioComponent } from './components/pages/portfolio/portfolio.component';
import { PortfolioTableComponent } from './components/pages/portfolio copy/portfolio-table.component';
import { PortfolioOptimizationComponent } from './components/pages/optimization/optimization.component';

registerLocaleData(localeRu);

//import { TotalVolumeComponent } from './total-volume/total-volume.component';

const materialModules = [
  MatDialogModule,
  CdkTreeModule,
  MatAutocompleteModule,
  MatButtonModule,
  MatCardModule,
  MatCheckboxModule,
  MatChipsModule,
  MatDividerModule,
  MatExpansionModule,
  MatIconModule,
  MatInputModule,
  MatListModule,
  MatMenuModule,
  MatProgressSpinnerModule,
  MatPaginatorModule,
  MatRippleModule,
  MatSelectModule,
  MatSidenavModule,
  MatSnackBarModule,
  MatSortModule,
  MatTableModule,
  MatTabsModule,
  MatToolbarModule,
  MatFormFieldModule,
  MatButtonToggleModule,
  MatTreeModule,
  OverlayModule,
  PortalModule,
  MatBadgeModule,
  MatGridListModule,
  MatRadioModule,

  MatDatepickerModule,
  MatTooltipModule,
];

@NgModule({
  exports: [
    // CDK
    A11yModule,
    BidiModule,
    ObserversModule,
    OverlayModule,
    PlatformModule,
    PortalModule,
    ScrollingModule,
    CdkStepperModule,
    CdkTableModule,

    // Material
    MatAutocompleteModule,
    MatButtonModule,
    MatButtonToggleModule,
    MatCardModule,
    MatCheckboxModule,
    MatChipsModule,
    MatDatepickerModule,
    MatDialogModule,
    MatExpansionModule,
    MatGridListModule,
    MatIconModule,
    MatInputModule,
    MatListModule,
    MatMenuModule,
    MatProgressBarModule,
    MatProgressSpinnerModule,
    MatRadioModule,
    MatRippleModule,
    MatSelectModule,
    MatSidenavModule,
    MatSlideToggleModule,
    MatSliderModule,
    MatSnackBarModule,
    MatTabsModule,
    MatToolbarModule,
    MatTooltipModule,
    MatNativeDateModule,

    ...materialModules,
  ],
  declarations: [],
})
export class MaterialModule {}

@NgModule({
  imports: [
    BrowserModule,
    CommonModule,
    MatToolbarModule,
    MatIconModule,
    MatMenuModule,
    MatSidenavModule,
    RouterModule,
    AppRoutingModule,
    HttpClientModule,
    MatNativeDateModule,
    MatDialogModule,
    MatProgressSpinnerModule,

    MatTableModule,
    GoogleChartsModule.forRoot(),
    MatAutocompleteModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    EditorModule,
    //   MaterialModule,
    FormsModule,
    ReactiveFormsModule,
    BrowserAnimationsModule,
    FlexLayoutModule,
    NgxEchartsModule,
    BrowserModule,
    HighchartsChartModule,
    NgxEchartsModule.forRoot({ echarts: () => import('echarts') }),
    //  ChartsModule,

    NgJsonEditorModule,
    ...materialModules,
  ],
  declarations: [
    ServiceNewsDetailsComponent,

    AppComponent,
    MarkupEditorComponent,
    ResizeListenerDirective,
    CustomTooltipComponent,
    TreemapComponent2,
    FootPrintComponent,
    SeasonalityComponent,
    SpinnerOverlayComponent,
    VolumeSplashComponent,
    BarometerComponent,
    LeaderboardTableComponent,
    TickerAutocompleteComponent,
    TopOrdersComponent,
    ImageUploaderComponent,
    LoginComponent,
    SubscriptionPlansComponent,
    PresetSelectorComponent,
    MarketSelectorComponent,
    FootPrintParamsComponent,
    //TotalVolumeComponent,
    DateRangePickerComponent,
    NavListItemComponent,
    MenuListItemComponent,
    MaterialDrawerComponent,
    UserTopicsTableComponent,
    FirstComponent,
    TopNavComponent,
    NavListItemMiniComponent,
    FootPrintSettingsDialogComponent,
    TreeMapComponent,
    TreemapComponent2,
    MainPageComponent,
    MarketMapComponent,
    MultiComponent,
    LogoutComponent,
    ConfirmEmailComponent,
    ConfirmEmailChangeComponent,
    RegisterComponent,
    ResendEmailConfirmationComponent,
    ForgotPasswordComponent,
    ResetPasswordComponent,
    ForgotPasswordConfirmationComponent,
    CandlesStatComponent,
    TotalVolumeComponent,
    PresetSelectorComponent1,
    PalettePickerComponent,
    PaymentInstructionsDialogComponent ,
    PortfolioComponent, PortfolioTableComponent,PortfolioOptimizationComponent
  ],

  bootstrap: [AppComponent],
  providers: [
    MatDialog,
    NavService,
    HttpClient,
    { provide: MAT_DATE_FORMATS, useValue: MY_DATE_FORMATS },
    { provide: LOCALE_ID, useValue: 'ru-RU' },
  ],
})
export class AppModule {}
*/

