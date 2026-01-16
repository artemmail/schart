
---

```md
<!-- 05_FIRST_INDICATOR_SMA.md -->

# 05. Первый индикатор для реализации — SMA (Simple Moving Average)

## 1) Цель
Сделать простой индикатор, который гарантированно проверит архитектуру:
- series line
- overlay на основном графике (panel="chart")
- пересчет при изменении period
- корректная обработка warmup

---

## 2) Параметры
```ts
type SmaParams = {
  source: "close" | "open" | "high" | "low";
  period: number;
  color: string;
  width: number;
  panel: "chart"; // фиксировано для v1
};
