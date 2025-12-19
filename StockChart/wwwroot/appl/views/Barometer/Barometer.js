define([
  'views/view',
  'text!views/Barometer/Barometer.html'
], function (View, html) {  
  var events = {
    init: function (e) {                   
        ReportBarometerMobile('#barometergrid')
    }
  };  
  var view = new View('Barometer', html, null, events);
});