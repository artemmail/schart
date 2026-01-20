import { DEFAULT_MARKUP_COLOR, MarkupDefinition } from '../markup-api';
import { MarkupRegistry } from '../markup-registry';
import { Brush } from '../brush';
import { FibonacciFan } from '../fibonacci-fan';
import { Fibonacci } from '../fibonacci';
import { HorizontalLine } from '../horizontal-line';
import { Line } from '../line';
import { ParallelChannel } from '../parallel-channel';
import { Profile } from '../profile';
import { Ray } from '../ray';
import { Rect } from '../rect';
import { Ruler } from '../ruler';
import { Strength } from '../strength';
import { TextShape } from '../text';
import { VerticalLine } from '../vertical-line';
import { fontsPreset, profilePeriodsPreset, widthsPreset } from 'src/app/models/preserts';

const palette = [
  '#F08080',
  '#FFA500',
  '#F0E68C',
  '#90EE90',
  '#87CEFA',
  '#1E90FF',
  '#FF90FF',
  '#000000',
];

const numberOptions = (items: { Value: number; Text: string }[]) =>
  items.map((item) => ({ value: item.Value, label: item.Text }));

const editDefinition: MarkupDefinition = {
  type: 'Edit',
  displayName: 'Редактирование',
  description: 'Выбор и перемещение пометок',
  icon: 'open_with',
};

const brushDefinition: MarkupDefinition = {
  type: 'Brush',
  displayName: 'Кисть',
  description: 'Свободное рисование линий',
  icon: 'brush',
  paramsSchema: {
    color: {
      type: 'color',
      title: 'Цвет',
      default: DEFAULT_MARKUP_COLOR,
      palette,
    },
    width: {
      type: 'enum',
      title: 'Толщина',
      default: 3,
      options: numberOptions(widthsPreset),
    },
  },
  create: (manager, params) => new Brush(manager, params),
};

const lineDefinition: MarkupDefinition = {
  type: 'Line',
  displayName: 'Линия',
  description: 'Прямая линия с опциональной стрелкой',
  icon: 'timeline',
  paramsSchema: {
    color: {
      type: 'color',
      title: 'Цвет',
      default: DEFAULT_MARKUP_COLOR,
      palette,
    },
    width: {
      type: 'enum',
      title: 'Толщина',
      default: 3,
      options: numberOptions(widthsPreset),
    },
    arrow: {
      type: 'bool',
      title: 'Стрелка',
      default: false,
    },
  },
  create: (manager, params) => new Line(manager, params),
};

const rayDefinition: MarkupDefinition = {
  type: 'Ray',
  displayName: 'Луч',
  description: 'Линия от точки с продолжением в направлении',
  icon: 'trending_up',
  paramsSchema: {
    color: {
      type: 'color',
      title: 'Цвет',
      default: DEFAULT_MARKUP_COLOR,
      palette,
    },
    width: {
      type: 'enum',
      title: 'Толщина',
      default: 3,
      options: numberOptions(widthsPreset),
    },
    arrow: {
      type: 'bool',
      title: 'Стрелка',
      default: true,
    },
    dockable: {
      type: 'bool',
      title: 'Dockable',
      default: true,
    },
  },
  create: (manager, params) => new Ray(manager, params),
};

const horizontalLineDefinition: MarkupDefinition = {
  type: 'HorizontalLine',
  displayName: 'Горизонтальная линия',
  description: 'Уровень цены по всей ширине графика',
  icon: 'horizontal_rule',
  paramsSchema: {
    color: {
      type: 'color',
      title: 'Цвет',
      default: DEFAULT_MARKUP_COLOR,
      palette,
    },
    width: {
      type: 'enum',
      title: 'Толщина',
      default: 2,
      options: numberOptions(widthsPreset),
    },
    dockable: {
      type: 'bool',
      title: 'Dockable',
      default: true,
    },
  },
  create: (manager, params) => new HorizontalLine(manager, params),
};

const verticalLineDefinition: MarkupDefinition = {
  type: 'VerticalLine',
  displayName: 'Вертикальная линия',
  description: 'Метка времени по всей высоте графика',
  icon: 'vertical_align_center',
  paramsSchema: {
    color: {
      type: 'color',
      title: 'Цвет',
      default: DEFAULT_MARKUP_COLOR,
      palette,
    },
    width: {
      type: 'enum',
      title: 'Толщина',
      default: 2,
      options: numberOptions(widthsPreset),
    },
    dockable: {
      type: 'bool',
      title: 'Dockable',
      default: true,
    },
  },
  create: (manager, params) => new VerticalLine(manager, params),
};

const rulerDefinition: MarkupDefinition = {
  type: 'Ruler',
  displayName: 'Рулетка',
  description: 'Измерение цены и времени между двумя точками',
  icon: 'straighten',
  paramsSchema: {
    color: {
      type: 'color',
      title: 'Цвет',
      default: DEFAULT_MARKUP_COLOR,
      palette,
    },
    width: {
      type: 'enum',
      title: 'Толщина',
      default: 2,
      options: numberOptions(widthsPreset),
    },
    dockable: {
      type: 'bool',
      title: 'Dockable',
      default: true,
    },
  },
  create: (manager, params) => new Ruler(manager, params),
};

const parallelChannelDefinition: MarkupDefinition = {
  type: 'ParallelChannel',
  displayName: 'Параллельный канал',
  description: 'Две параллельные линии по трем точкам',
  icon: 'view_week',
  paramsSchema: {
    color: {
      type: 'color',
      title: 'Цвет',
      default: DEFAULT_MARKUP_COLOR,
      palette,
    },
    width: {
      type: 'enum',
      title: 'Толщина',
      default: 2,
      options: numberOptions(widthsPreset),
    },
    fill: {
      type: 'bool',
      title: 'Заливка',
      default: true,
    },
  },
  create: (manager, params) => new ParallelChannel(manager, params),
};

const fanDefinition: MarkupDefinition = {
  type: 'FibonacciFan',
  displayName: 'Веер Фибо',
  description: 'Фан по уровням 38.2/50/61.8/100%',
  icon: 'flare',
  paramsSchema: {
    color: {
      type: 'color',
      title: 'Цвет',
      default: DEFAULT_MARKUP_COLOR,
      palette,
    },
    width: {
      type: 'enum',
      title: 'Толщина',
      default: 2,
      options: numberOptions(widthsPreset),
    },
    showLabels: {
      type: 'bool',
      title: 'Показывать подписи',
      default: true,
    },
    dockable: {
      type: 'bool',
      title: 'Dockable',
      default: true,
    },
  },
  create: (manager, params) => new FibonacciFan(manager, params),
};

const rectDefinition: MarkupDefinition = {
  type: 'Rect',
  displayName: 'Прямоугольник',
  description: 'Выделение области',
  icon: 'crop_16_9',
  paramsSchema: {
    color: {
      type: 'color',
      title: 'Цвет',
      default: DEFAULT_MARKUP_COLOR,
      palette,
    },
    width: {
      type: 'enum',
      title: 'Толщина',
      default: 3,
      options: numberOptions(widthsPreset),
    },
  },
  create: (manager, params) => new Rect(manager, params),
};

const fibonacciDefinition: MarkupDefinition = {
  type: 'Fibonacci',
  displayName: 'Фибоначчи',
  description: 'Линии Фибоначчи по двум точкам',
  icon: 'show_chart',
  paramsSchema: {
    color: {
      type: 'color',
      title: 'Цвет',
      default: DEFAULT_MARKUP_COLOR,
      palette,
    },
    width: {
      type: 'enum',
      title: 'Толщина',
      default: 2,
      options: numberOptions(widthsPreset),
    },
    showLabels: {
      type: 'bool',
      title: 'Показывать подписи',
      default: true,
    },
  },
  create: (manager, params) => new Fibonacci(manager, params),
};

const textDefinition: MarkupDefinition = {
  type: 'Text',
  displayName: 'Текст',
  description: 'Текстовая подпись',
  icon: 'title',
  paramsSchema: {
    color: {
      type: 'color',
      title: 'Цвет',
      default: DEFAULT_MARKUP_COLOR,
      palette,
    },
    font: {
      type: 'enum',
      title: 'Размер шрифта',
      default: 36,
      options: numberOptions(fontsPreset),
    },
    text: {
      type: 'text',
      title: 'Текст',
      default: 'Some comment',
      rows: 3,
    },
  },
  create: (manager, params) => new TextShape(manager, params),
};

const profileDefinition: MarkupDefinition = {
  type: 'Profile',
  displayName: 'Профиль',
  description: 'Профиль объема в выделенной области',
  icon: 'bar_chart',
  paramsSchema: {
    total: {
      type: 'bool',
      title: 'Total volume',
      default: true,
    },
    dockable: {
      type: 'bool',
      title: 'Dockable',
      default: true,
    },
    profilePeriod: {
      type: 'enum',
      title: 'Auto-profile',
      default: -1,
      options: numberOptions(profilePeriodsPreset),
      scope: 'tool',
    },
  },
  create: (manager, params) => new Profile(manager, params),
};

const strengthDefinition: MarkupDefinition = {
  type: 'Strength',
  displayName: 'Strength',
  description: 'Контур силы/диапазона',
  icon: 'fitness_center',
  paramsSchema: {
    dockable: {
      type: 'bool',
      title: 'Dockable',
      default: true,
    },
    text: {
      type: 'text',
      title: 'Note',
      default: '',
      rows: 3,
    },
  },
  create: (manager, params) => new Strength(manager, params),
};

export const BUILTIN_MARKUP_DEFINITIONS: MarkupDefinition[] = [
  editDefinition,
  brushDefinition,
  lineDefinition,
  rayDefinition,
  horizontalLineDefinition,
  verticalLineDefinition,
  rulerDefinition,
  rectDefinition,
  parallelChannelDefinition,
  fibonacciDefinition,
  fanDefinition,
  textDefinition,
  profileDefinition,
  strengthDefinition,
];

export function registerFootprintBuiltInMarkups(registry: MarkupRegistry): void {
  for (const def of BUILTIN_MARKUP_DEFINITIONS) {
    registry.register(def);
  }
}
