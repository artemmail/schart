import {
  Component,
  ViewChild,
  ElementRef,
  ViewEncapsulation,
  AfterViewInit,
  Input,
  Output,
  OnInit,
} from '@angular/core';

import {
  NavigationEnd,
  Router,
  RouterLink,
  RouterOutlet,
} from '@angular/router';
import { isPlatformServer, Location } from '@angular/common';
import { filter } from 'rxjs/operators';
//import { Metrika } from 'ng-yandex-metrika';
import { HttpClient } from '@angular/common/http';
import { Inject, PLATFORM_ID } from '@angular/core';

@Component({
  selector: 'angular-material-drawer',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  encapsulation: ViewEncapsulation.None,
})
export class AppComponent implements OnInit {
  ngOnInit() {
    //this.jsonData = content;
  }
 
  constructor(
  //  private metrika: Metrika,
    private http: HttpClient,
    private router: Router,
    location: Location,
    @Inject(PLATFORM_ID) platformId: Object
  ) {


    
    if (isPlatformServer(platformId)) {
      return;
    }

    let prevPath = location.path();
    /*this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe(() => {
        try {
          const newPath = location.path();
        
        
        /*  this.metrika.hit(newPath, {
            referer: prevPath,
            callback: () => {
          //    console.log('hit end');
            },
          });
          prevPath = newPath;
        } catch (e) {
          
        }
      });*/
  }
}
