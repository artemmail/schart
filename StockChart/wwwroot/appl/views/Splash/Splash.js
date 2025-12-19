define([
  'views/view',
  'text!views/Splash/Splash.html'
], function (View, html) {  
 
  var model = kendo.observable({
      bigPeriods: [
          { "Value": "7", "Text": "неделя" },
          { "Value": "14", "Text": "2 недели" },
          { "Value": "30", "Text": "месяц" },
          { "Value": "92", "Text": "квартал" },
          { "Value": "365", "Text": "год" }
      ],
      smallPeriods: [
          { "Value": "1", "Text": "день" },
          { "Value": "3", "Text": "3 дня" },
          { "Value": "7", "Text": "неделя" },
          { "Value": "14", "Text": "2 недели" },
          { "Value": "30", "Text": "месяц" }
      ],
      bigPeriod: 30,
      smallPeriod: 3,
      apply: function(e)
      {
          ReportVolumeSplashMobile('#splashgrid', this.bigPeriod, this.smallPeriod);
      }
  });

  var events = {
      init: function (e) {
          ReportVolumeSplashMobile('#splashgrid', model.bigPeriod, model.smallPeriod);
      }
  };

  var view = new View('Splash', html, model, events);
});