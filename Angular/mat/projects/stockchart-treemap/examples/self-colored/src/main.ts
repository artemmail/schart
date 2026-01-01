import { bootstrapApplication } from '@angular/platform-browser';
import { provideAnimations } from '@angular/platform-browser/animations';
import { SelfColoredTreemapExampleComponent } from './app/self-colored-treemap-example.component';

bootstrapApplication(SelfColoredTreemapExampleComponent, {
  providers: [provideAnimations()]
}).catch((err) => console.error(err));
