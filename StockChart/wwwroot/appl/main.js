require.config({
  paths: {
    'text': '../bower_components/requirejs-text/text'
  }
});

var connection;

define([
  'app'
], function (app) {
  if (kendo.mobileOs) {
    document.addEventListener('deviceready', function () {
      app.init();
        navigator.splashscreen.hide();

      

    }, false);
  }
  else {
    app.init();
  }
});