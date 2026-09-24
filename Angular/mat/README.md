# AngularMaterialLoginTemplate

[Create Login & Signup UI Templates in Angular Material 16](https://www.positronx.io/create-login-ui-template-with-angular-material-design/)

## Общие компоненты и данные

- [stockchart-treemap](projects/stockchart-treemap/README.md) — единственная реализация treemap для приложения и примеров. Проверка: `npm run test:stockchart-treemap`.
- [Финансовые снимки](data/stockchart-financial-data/README.md) — отдельный приватный пакет JSON. В приложение копируются только данные `MULT` и `FIN`; остальные разделы читаются через API.
- TinyMCE хранится в `src/assets/tinymce` и доступен по `/assets/tinymce/`. Служебные архивы и сохранённые `usa*.html` в сборку не входят.
