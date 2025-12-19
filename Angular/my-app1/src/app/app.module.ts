import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppComponent } from './app.component';
import { FootPrintComponent } from './footprint/footprint.component';
import { ResizeListenerDirective } from './resize-listener-directive.directive';
import { HttpClientModule } from '@angular/common/http';
import { Point} from './models/Point';

@NgModule({
  declarations: [
    FootPrintComponent,
    AppComponent,
    ResizeListenerDirective    ,
    
  ],
  imports: [
    HttpClientModule,
    BrowserModule, 
    
    
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
