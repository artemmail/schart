import 'reflect-metadata';

const DATE_METADATA_KEY = Symbol('DateField');

export function DateField(): PropertyDecorator {
  return function (target: Object, propertyKey: string | symbol) {
    Reflect.defineMetadata(DATE_METADATA_KEY, true, target, propertyKey);
  };
}

export function isDateField(target: any, propertyKey: string): boolean {
  return Reflect.getMetadata(DATE_METADATA_KEY, target, propertyKey);
}
