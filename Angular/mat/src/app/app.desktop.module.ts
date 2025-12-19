// app-desktop.module.ts
import { NgModule, LOCALE_ID } from '@angular/core';
import { AppComponent } from './app.component';
import { AppRoutingModule } from './app-routing.module';
import { SharedModule } from './shared.module';  // Import the SharedModule
import { NavService } from './service/nav.service';
import { SignalRService } from './service/FootPrint/signalr.service';
import { CustomDateAdapter, MY_DATE_FORMATS } from './service/date-formats';


import { MetrikaModule } from 'ng-yandex-metrika';

import { MatNativeDateModule, MAT_DATE_LOCALE, NativeDateAdapter } from '@angular/material/core';
import { DateAdapter, MAT_DATE_FORMATS, MatDateFormats } from '@angular/material/core';
import { LevelMarksService } from './service/FootPrint/LevelMarks/level-marks.service';


@NgModule({
  imports: [
    MetrikaModule.forRoot(
      { id: 16829734, webvisor: true }, // CounterConfig | CounterConfig[]
      {
        alternativeUrl: 'https://cdn.jsdelivr.net/npm/yandex-metrica-watch/tag.js',
      },
    ),
    SharedModule,
    AppRoutingModule,
  ],
  declarations: [
    AppComponent,
  ],
  providers: [
    { provide: MAT_DATE_LOCALE, useValue: 'ru-RU' },
    { provide: LOCALE_ID, useValue: 'ru' },
    
    NavService,
    SignalRService,
    LevelMarksService,
    { provide: MAT_DATE_FORMATS, useValue: MY_DATE_FORMATS },
    { provide: DateAdapter, useClass: CustomDateAdapter },

  ],
  bootstrap: [AppComponent]
})
export class AppDesktopModule { }
