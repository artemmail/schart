import { Component, Input } from '@angular/core';
import { MaterialModule } from '../../../material.module';

const GUIDES = {
  map: { title: 'Как читать карту рынка', text: 'Размер плитки отражает торговый объём, цвет — изменение цены за выбранный период. Зелёный означает рост, красный — снижение. На телефоне коснитесь бумаги, затем нажмите «Открыть график». На компьютере нажмите на бумагу; заголовок сектора открывает сравнение его бумаг.', example: 'Посмотреть график GAZP', path: '/FootPrint', query: { ticker: 'GAZP', mode: 'candles', period: 5, rperiod: 'day' }, article: 'karta-razdelov-stockchart-ru' },
  footprint: { title: 'Первый кластерный график', text: 'Каждая свеча показывает движение цены, а числа внутри кластера — объём сделок на ценовых уровнях. Период задаёт длительность свечи; шаг объединяет соседние уровни цены. Начните с GAZP и пяти минут, затем сравните кластеры со свечами.', example: 'Открыть бесплатный пример GAZP', path: '/FootPrint', query: { ticker: 'GAZP', mode: 'clusters', period: 5, rperiod: 'day' }, article: 'klasternyy-grafik-dlya-nachinayuschikh' },
  bonds: { title: 'Как пользоваться картой облигаций', text: 'Выберите тип выпусков и диапазон доходности, затем нажмите «Применить». Оси карты подписаны для выбранного режима. Нажатие на точку выделяет выпуск в таблице; название выпуска открывает его карточку. Пример: начните с всех выпусков и постепенно сужайте диапазон дюрации.', example: 'Показать все выпуски', path: '/bonds', query: {}, article: 'karta-razdelov-stockchart-ru' },
  options: { title: 'Как читать опционы', text: 'Выберите базовый актив и срок экспирации. В доске сравнивайте call и put на одинаковом страйке; в улыбке — подразумеваемую волатильность по страйкам. Проверьте время котировки и наличие сделки перед сравнением. Начните с доступной серии в списке: данные загружаются с сервера.', example: 'Открыть доску опционов', path: '/OptionBoard', query: {}, article: 'karta-razdelov-stockchart-ru' },
};

@Component({
  standalone: true, selector: 'app-context-help', imports: [MaterialModule],
  template: `<details class="context-help"><summary><mat-icon>help_outline</mat-icon>{{ guide.title }}</summary><p>{{ guide.text }}</p><div><a mat-stroked-button [routerLink]="guide.path" [queryParams]="guide.query">{{ guide.example }}</a><a mat-button [routerLink]="['/ServiceNews/Content', guide.article]">Подробная справка</a></div></details>`,
  styles: [`.context-help{border:1px solid var(--mat-sys-outline-variant);border-radius:10px;padding:10px 14px;margin:8px 0;background:var(--mat-sys-surface-container-low);font-size:14px}summary{display:flex;align-items:center;gap:8px;cursor:pointer;min-height:24px}p{max-width:900px;line-height:1.6;color:var(--mat-sys-on-surface-variant)}details>div{display:flex;gap:8px;flex-wrap:wrap}`]
})
export class ContextHelpComponent {
  @Input() topic: keyof typeof GUIDES = 'map';
  get guide() { return GUIDES[this.topic]; }
}
