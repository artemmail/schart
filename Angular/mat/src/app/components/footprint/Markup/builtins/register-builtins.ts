import { DEFAULT_MARKUP_COLOR, MarkupDefinition } from '../markup-api';
import { MarkupRegistry } from '../markup-registry';
import { Brush } from '../brush';
import { Fibonacci } from '../fibonacci';
import { Line } from '../line';
import { Profile } from '../profile';
import { Rect } from '../rect';
import { Strength } from '../strength';
import { TextShape } from '../text';
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
  },
  create: (manager, params) => new Strength(manager, params),
};

export const BUILTIN_MARKUP_DEFINITIONS: MarkupDefinition[] = [
  editDefinition,
  brushDefinition,
  lineDefinition,
  rectDefinition,
  fibonacciDefinition,
  textDefinition,
  profileDefinition,
  strengthDefinition,
];

export function registerFootprintBuiltInMarkups(registry: MarkupRegistry): void {
  for (const def of BUILTIN_MARKUP_DEFINITIONS) {
    registry.register(def);
  }
}
