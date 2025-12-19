import { ApplicationConfig, importProvidersFrom } from '@angular/core';


import { routes } from './app.routes';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { MetrikaModule } from 'ng-yandex-metrika';
import { provideRouter } from '@angular/router';


export const appConfig: ApplicationConfig = {
  providers: [
   
    
    importProvidersFrom(
    MetrikaModule.forRoot([
      { id: 16829734, webvisor: true },
      { id: 16829734 },
    ])
  ),provideRouter(routes), provideAnimationsAsync()]
};
