define([
  'views/view',
  'text!views/MultiCandles/MultiCandles.html'
], function (View, html) {  
 
  var model = kendo.observable({
      periods: [
          { "Value": "1", "Text": "1 мин." },
          { "Value": "5", "Text": "5 мин." },
          { "Value": "15", "Text": "15 мин." },          
          { "Value": "60", "Text": "1 час" },
          { "Value": "1440", "Text": "1 день" }
      ],
      period: 5,
      onResize: function()
      {
          MultiResize();
      },
      onChange: function (e)
      {
          var rperiod = RperiodFromPeriod(this.period);
          for (var i = 0; i < can.length; i++) {
              can[i].params.period = this.period;
              can[i].params.rperiod = rperiod;
              can[i].queryCandlesFull();
          }
      }
  });

  var events = {
      afterShow: function(e)
      {
          try
          {
              MultiResize();
          }
          catch(e)
          {

          }
      },
      init: function (e) {
    
        var names = ['USD000000TOD', 'BR', 'ED', 'Si', 'RI',  'EUR_RUB__TOD', 'MX', 'SBER' , 'GAZP'/*, 'LKOH', 'GMKN'*/];
        var desc = ['RUR/USD', 'Нефть', 'EUR/USD', "Si(Фьючерс на Рубль)", "RTS FUT",  "RUR/EUR", "MICEX FUT", "Сбербанк","GAZP(Газпром)",/* "LKOH(Лукойл)", "GMKN(Норникель)"*/];

        InitMultiPage(names, desc);

          if (IsPayed)
              setInterval(function () {
                  if ((APP.instance.view().id == '#MultiCandles'))
                      for (var i = 0; i < can.length ; i++)
                          can[i].queryCandlesUpdate();
              }, 3000);       
      }
  };

  var view = new View('MultiCandles', html, model, events);
});