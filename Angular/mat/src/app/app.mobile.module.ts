import { LOCALE_ID, NgModule } from '@angular/core';
import { BrowserModule, HAMMER_GESTURE_CONFIG, HammerGestureConfig, HammerModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatListModule } from '@angular/material/list';
import { RouterModule } from '@angular/router';

import { AppMobileComponent } from './mobile/app.component';
import { HeaderComponent } from './mobile/header/header.component';
import { MarketMapComponent } from './mobile/MarketMap/marketmap.component';
import { SettingsComponent } from './mobile/settings/settings.component';
import { LeadersComponent } from './mobile/Leaders/leaders.component';

import { AppRoutingModule } from './mobile/app.routes'; // Импортируем модуль маршрутизации
import { SharedModule } from './shared.module';  // Import the SharedModule
import { MaterialModule } from './material.module';
import { NavService } from './service/nav.service';
import { SignalRService } from './service/FootPrint/signalr.service';
import { MAT_DATE_FORMATS, provideNativeDateAdapter } from '@angular/material/core';
import { MY_DATE_FORMATS } from './service/date-formats';
//import { MetrikaModule } from 'ng-yandex-metrika';
import { FirstComponent1 } from './mobile/first/first.component';
import { LeadersBinanceComponent } from './mobile/BinanceLeaders/leaders.component';
import { LeadersFortsComponent } from './mobile/Forts/leaders.component';
import * as Hammer from 'hammerjs';
import { LevelMarksService } from './service/FootPrint/LevelMarks/level-marks.service';



export class MyHammerConfig extends HammerGestureConfig {
  override overrides = {
    'swipe': { direction: Hammer.DIRECTION_HORIZONTAL } // Ограничим до горизонтального свайпа
  };
}




@NgModule({
  declarations: [
    AppMobileComponent,
    HeaderComponent,
    MarketMapComponent,
    SettingsComponent,
 ///   LeaderboardTableComponent,
    LeadersComponent,
    FirstComponent1,
    LeadersBinanceComponent,
    LeadersFortsComponent
    
  ],
  providers: [
    { provide: LOCALE_ID, useValue: 'ru-RU' },
    {
      provide: HAMMER_GESTURE_CONFIG,
      useClass: MyHammerConfig,
    },


    //{ provide: HTTP_INTERCEPTORS, useClass: DateConversionInterceptor, multi: true },
  
    NavService,
    SignalRService,
    LevelMarksService,
    { provide: MAT_DATE_FORMATS, useValue: MY_DATE_FORMATS },
    provideNativeDateAdapter(),
  ],
  imports: [
   
    HammerModule,
    MaterialModule,
    SharedModule,
    BrowserModule,
    BrowserAnimationsModule,
    MatToolbarModule,
    MatButtonModule,
    MatSidenavModule,
    MatIconModule,
    MatMenuModule,
    MatListModule,
    AppRoutingModule, // Импортируем AppRoutingModule для маршрутизации
    RouterModule // Импортируем RouterModule для использования <router-outlet>
  ],

  bootstrap: [AppMobileComponent]
})
export class AppMobileModule { }
