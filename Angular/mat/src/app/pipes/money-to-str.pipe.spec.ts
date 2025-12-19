import { MoneyToStrPipe } from './money-to-str.pipe';

describe('MoneyToStrPipe', () => {
  it('create an instance', () => {
    const pipe = new MoneyToStrPipe();
    expect(pipe).toBeTruthy();
  });
});
