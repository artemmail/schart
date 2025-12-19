import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import { AppDesktopModule } from './app/app.desktop.module';
import { AppMobileModule } from './app/app.mobile.module';
import { DeviceDetectorService as NgxDeviceDetectorService, DeviceDetectorService } from 'ngx-device-detector';
import { PLATFORM_ID } from '@angular/core';
import { Inject, Injector } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

// Получение platformId
const platformId = 'browser';

// Создание Injector для создания экземпляра NgxDeviceDetectorService
const injector = Injector.create({ providers: [{ provide: PLATFORM_ID, useValue: platformId }] });

// Создание экземпляра NgxDeviceDetectorService
const ngxDeviceService = new NgxDeviceDetectorService(injector.get(PLATFORM_ID));

// Создание экземпляра DeviceDetectorService с использованием ngxDeviceService
const deviceDetector = new DeviceDetectorService(ngxDeviceService);

var r = (deviceDetector as any).platformId.deviceType;

if (r === "desktop") {
  platformBrowserDynamic().bootstrapModule(AppDesktopModule)
    .catch(err => console.error(err));
} else {
  platformBrowserDynamic().bootstrapModule(AppMobileModule)
    .catch(err => console.error(err));
}
