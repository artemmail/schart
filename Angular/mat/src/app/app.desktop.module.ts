// app-desktop.module.ts
import { NgModule, LOCALE_ID } from '@angular/core';
import { AppComponent } from './app.component';
import { AppRoutingModule } from './app-routing.module';
import { NavService } from './service/nav.service';
import { CustomDateAdapter, MY_DATE_FORMATS } from './service/date-formats';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';


//import { MetrikaModule } from 'ng-yandex-metrika';

import { MatNativeDateModule, MAT_DATE_LOCALE, NativeDateAdapter } from '@angular/material/core';
import { DateAdapter, MAT_DATE_FORMATS, MatDateFormats } from '@angular/material/core';
import { LevelMarksService } from './service/FootPrint/LevelMarks/level-marks.service';
import { HttpClientModule } from '@angular/common/http';


@NgModule({
  imports: [
  /*  MetrikaModule.forRoot(
      { id: 16829734, webvisor: true }, // CounterConfig | CounterConfig[]
      {
        alternativeUrl: 'https://cdn.jsdelivr.net/npm/yandex-metrica-watch/tag.js',
      },
    ),*/
    BrowserModule,
    BrowserAnimationsModule,
    HttpClientModule,
    AppRoutingModule,
    AppComponent,
  ],
  declarations: [],
  providers: [
    { provide: MAT_DATE_LOCALE, useValue: 'ru-RU' },
    { provide: LOCALE_ID, useValue: 'ru' },
    
    NavService,
    LevelMarksService,
    { provide: MAT_DATE_FORMATS, useValue: MY_DATE_FORMATS },
    { provide: DateAdapter, useClass: CustomDateAdapter },

  ],
  bootstrap: [AppComponent]
})
export class AppDesktopModule { }
