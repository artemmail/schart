import { ComponentFixture, TestBed, fakeAsync, flushMicrotasks } from '@angular/core/testing';
import { TreeMapComponent } from './tree-map.component';
import { TreeMapEvent } from './tree-map.models';

interface Item {
  name: string;
  value: number;
  change?: number;
  items?: Item[] | { $values: Item[] } | { values: Item[] } | Set<Item>;
}

describe('TreeMapComponent shared by the app and examples', () => {
  let fixture: ComponentFixture<TreeMapComponent<Item>>;
  let component: TreeMapComponent<Item>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [TreeMapComponent] }).compileComponents();
    fixture = TestBed.createComponent(TreeMapComponent<Item>);
    component = fixture.componentInstance;
    fixture.nativeElement.style.width = '400px';
    fixture.nativeElement.style.height = '300px';
  });

  function render(data: Item[]): void {
    component.data = data;
    fixture.detectChanges();
    flushMicrotasks();
    fixture.detectChanges();
  }

  const collections: Array<{ name: string; wrap: (items: Item[]) => Item['items'] }> = [
    { name: 'array', wrap: items => items },
    { name: '.NET $values', wrap: items => ({ $values: items }) },
    { name: 'values', wrap: items => ({ values: items }) },
    { name: 'iterable', wrap: items => new Set(items) }
  ];

  for (const collection of collections) {
    it(`derives sector values from a ${collection.name} collection`, fakeAsync(() => {
      render([{ name: 'Sector', value: 0, items: collection.wrap([{ name: 'Share', value: 10 }]) }]);

      const sector = component.root!.children![0];
      expect(sector.value).toBe(10);
      expect(sector.children![0].text).toBe('Share');
      expect(sector.children![0].coord.width).toBeGreaterThan(0);
      expect(sector.children![0].coord.height).toBeGreaterThan(0);
    }));
  }

  it('retains zero-volume shares in sector events without assigning them area', fakeAsync(() => {
    component.options = { keepZeroValueNodes: true };
    const sector: Item = {
      name: 'Sector', value: 10,
      items: [{ name: 'Trading', value: 10 }, { name: 'No trades', value: 0 }]
    };
    let clicked: TreeMapEvent<Item> | undefined;
    component.tileClick.subscribe(event => clicked = event);
    render([sector]);

    const children = component.root!.children![0].children!;
    expect(children.length).toBe(2);
    expect(children[1].coord.width * children[1].coord.height).toBe(0);
    expect(children[0].coord.width * children[0].coord.height).toBeGreaterThan(0);
    fixture.nativeElement.querySelector('.sc-treemap-title').click();
    expect(clicked!.dataItem).toBe(sector);
    expect(clicked!.path).toEqual([sector]);
    expect(clicked!.node.children!.length).toBe(2);
  }));

  it('skips zero-valued leaves by default for existing library consumers', fakeAsync(() => {
    render([{ name: 'Trading', value: 10 }, { name: 'No trades', value: 0 }]);
    expect(component.root!.children!.map(node => node.text)).toEqual(['Trading']);
  }));

  for (const type of ['squarified', 'horizontal', 'vertical'] as const) {
    it(`preserves the hierarchy and clamps titles in a small ${type} treemap`, fakeAsync(() => {
      fixture.nativeElement.style.width = '10px';
      fixture.nativeElement.style.height = '10px';
      component.options = { type, titleSize: 26 };
      render([{ name: 'Sector', value: 10, items: [{ name: 'Share', value: 10 }] }]);

      const sector = component.root!.children![0];
      expect(component.isLeaf(sector)).toBeFalse();
      expect(sector.children![0].text).toBe('Share');
      expect(component.titleSizeFor(sector)).toBe(10);
      expect(sector.children![0].coord.width * sector.children![0].coord.height).toBe(0);
    }));
  }

  it('keeps colorValueField independent of tile area', fakeAsync(() => {
    component.options = {
      colorValueField: 'change', colors: [],
      colorScale: { min: '#FF0000', center: '#FFFFFF', max: '#00FF00' }
    };
    render([{ name: 'Loss', value: 10, change: -5 }, { name: 'Gain', value: 10, change: 5 }]);
    const [loss, gain] = component.root!.children!;
    expect(loss.color).toBe('#FF0000');
    expect(gain.color).toBe('#00FF00');
    expect(loss.coord.width * loss.coord.height).toBe(gain.coord.width * gain.coord.height);
  }));

  it('uses the resolved color for rendering and text contrast', fakeAsync(() => {
    const resolver = jasmine.createSpy('colorResolver').and.returnValue('#FFFFFF');
    component.colorResolver = resolver;
    component.options = { colors: ['#000000'] };
    const item = { name: 'Share', value: 10 };
    render([item]);

    expect(resolver).toHaveBeenCalledOnceWith(item, '#000000', component.host.nativeElement);
    const tile = fixture.nativeElement.querySelector('.k-leaf');
    expect(tile.style.backgroundColor).toBe('rgb(255, 255, 255)');
    expect(tile.classList.contains('k-inverse')).toBeTrue();
  }));

  it('themes titles through public CSS properties', fakeAsync(() => {
    fixture.nativeElement.style.setProperty('--sc-treemap-title-background', '#112233');
    fixture.nativeElement.style.setProperty('--sc-treemap-title-color', '#FFFFFF');
    render([{ name: 'Sector', value: 10, items: [{ name: 'Share', value: 10 }] }]);

    const styles = getComputedStyle(fixture.nativeElement.querySelector('.sc-treemap-title'));
    expect(styles.backgroundColor).toBe('rgb(17, 34, 51)');
    expect(styles.color).toBe('rgb(255, 255, 255)');
  }));
});
