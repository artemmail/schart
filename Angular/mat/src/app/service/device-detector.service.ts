import { Injectable } from '@angular/core';
import { DeviceDetectorService as NgxDeviceDetectorService } from 'ngx-device-detector';

@Injectable({
  providedIn: 'root'
})
export class DeviceDetectorService {
  constructor(private ngxDeviceService: NgxDeviceDetectorService) {}

  isMobile(): boolean {
    return this.ngxDeviceService.isMobile();
  }

  isTablet(): boolean {
    return this.ngxDeviceService.isTablet();
  }

  isDesktop(): boolean {
    return this.ngxDeviceService.isDesktop();
  }
}
