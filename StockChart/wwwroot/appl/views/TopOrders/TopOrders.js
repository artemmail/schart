define([
  'views/view',
  'text!views/TopOrders/TopOrders.html'
], function (View, html) {  
 
  var model = kendo.observable({      
      periods: [
          { "Value": "1", "Text": "день" },
          { "Value": "3", "Text": "3 дня" },
          { "Value": "7", "Text": "неделя" },
          { "Value": "14", "Text": "2 недели" },
          { "Value": "30", "Text": "месяц" }
      ],      
      period: 3,
      ticker: 'GAZP',
      apply: function(e)
      {
          if (!IsPayed && this.ticker != 'GAZP')
          {
              $.when(kendo.ui.ExtAlertDialog.show({
                  title: "Платная функция",
                  message: 'Бесплатным пользователям <br> доступен только <b>GAZP</b>(Газпром)' +
                      '<br>Оформить подписку можно по <a href="' + sitePrefix + 'Payment">ссылке</a>',
                  icon: "k-ext-information"
              }));
              this.set("ticker", "GAZP");
          }

          ReportTopOrdersMobile('#topordergrid', this.ticker, this.period);
      }
  });

  var events = {
      init: function (e) {
          model.apply();        
      }
  };

  var view = new View('TopOrders', html, model, events);
});