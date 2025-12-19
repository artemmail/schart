export class HierarchicalDataSource {
  private data: any[];

  constructor(data: any[]) {
    this.data = data;
  }

  static create(dataSource: any): HierarchicalDataSource {
    return new HierarchicalDataSource(dataSource);
  }

  fetch(): Promise<any> {
    return Promise.resolve({ items: this.data });
  }

  getByUid(uid: string): any {
    // Поиск элемента по uid среди данных
    const findItem = (items: any[]): any => {
      for (const item of items) {
        if (item.uid === uid) {
          return item;
        }
        if (item.children) {
          const child = findItem(item.children);
          if (child) {
            return child;
          }
        }
      }
      return null;
    };

    return findItem(this.data);
  }
}

// Пример данных для тестирования
const testData = [
  {
    uid: '1',
    name: 'Root',
    hasChildren: true,
    children: [
      {
        uid: '1.1',
        name: 'Child 1',
        hasChildren: false
      },
      {
        uid: '1.2',
        name: 'Child 2',
        hasChildren: true,
        children: [
          {
            uid: '1.2.1',
            name: 'Grandchild 1',
            hasChildren: false
          }
        ]
      }
    ]
  }
];