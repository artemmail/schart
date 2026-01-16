<!-- 04_VOLUME_PANEL_INDICATOR.md -->

# 04. Спецификация индикатора Volume (в отдельной панели)

## 1) Цель
Сделать индикатор, который рисует **объём** в отдельной панели снизу, как в терминалах.

- Тип: histogram
- Панель: отдельная (new panel)
- Источник: candle.v (volume)

---

## 2) Параметры (v1)
```ts
type VolumeParams = {
  panel: "newPanel" | "chart";     // по умолчанию newPanel
  color: string;                  // цвет гистограммы
  width: number;                  // толщина/ширина столбика (если применимо)
  useUpDownColor: boolean;        // включить раскраску по рост/падение свечи
  upColor: string;
  downColor: string;
};
