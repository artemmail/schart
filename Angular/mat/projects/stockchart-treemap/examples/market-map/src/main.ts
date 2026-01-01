import { bootstrapApplication } from '@angular/platform-browser';
import { provideAnimations } from '@angular/platform-browser/animations';
import { AppStockchartTreemapExampleComponent } from './app/app-stockchart-treemap-example.component';

bootstrapApplication(AppStockchartTreemapExampleComponent, {
  providers: [provideAnimations()]
}).catch((err) => console.error(err));
