# stockchart-treemap

Готовый к публикации на npm пакет с самостоятельным TreeMap-компонентом для Angular.
Компонент работает как standalone, поддерживает подсветку по `TreeMapColorScale`,
источники данных в виде массива, Observable или лоадера, а также кастомные шаблоны плиток и заголовков.

## Сборка и публикация
1. Соберите библиотеку:
   ```bash
   npm run ng -- build stockchart-treemap
   ```
2. Перейдите в папку сборки и опубликуйте пакет (убедитесь, что вошли в npm):
   ```bash
   cd dist/stockchart-treemap
   npm publish --access public
   ```

## Сборка примерных компонентов для отладки
Для локального тестирования и пошаговой отладки демо-компонентов соберите отдельный пакет `stockchart-treemap-examples`:
```bash
npm run build:stockchart-treemap-examples
```
Сборка использует tsconfig для примеров и кладёт артефакты в `dist/stockchart-treemap-examples`, чтобы их можно было подключить в песочнице или во внешнем приложении без вмешательства в основной пакет.

## Подключение
```ts
import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { TreeMapComponent } from 'stockchart-treemap';

bootstrapApplication(AppComponent, {
  providers: [
    // TreeMapComponent подключается как standalone в импортах компонентов
  ]
});
```

В компоненте-доме добавьте `TreeMapComponent` или готовые демо-обёртки в секцию `imports` и используйте селектор
`<stockchart-treemap>` прямо в шаблоне.

## Пример «app-stockchart-treemap» с сгенерированными данными
```ts
import { AppStockchartTreemapExampleComponent, createMockMarketMap } from 'stockchart-treemap';

@Component({
  standalone: true,
  imports: [AppStockchartTreemapExampleComponent]
})
export class DemoHost {}
```

Компонент сам генерирует дерево с секторами и тикерами, выставляет `colorValueField: 'change'` и
использует `TreeMapColorScale` для плавной подсветки приростов и падений.

## Базовое использование с авторасчётом цветов
```html
<stockchart-treemap
  [data]="data"
  [options]="{ textField: 'name', valueField: 'value', colorValueField: 'change', colorScale: performanceColorScale }">
</stockchart-treemap>
```
```ts
import { performanceColorScale, createPerformanceTreemap } from 'stockchart-treemap';

@Component({
  standalone: true,
  imports: [TreeMapComponent]
})
export class SimpleDemo {
  data = createPerformanceTreemap();
  options = {
    textField: 'name',
    valueField: 'value',
    colorValueField: 'change',
    colorScale: performanceColorScale,
    colors: []
  };
}
```

Плитки не содержат поля `color`, поэтому библиотека самостоятельно рассчитывает оттенки на основе значений из `change`.
