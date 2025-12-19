define([
  'views/view',
  'text!views/FootPrint/FootPrint.html'
], function (View, html) {  
 
  var model = kendo.observable({    
      onResize: function()
      {
          drawGraph();
      },
      onChange: function (e)
      {
          
      }
  });

  var events = {
      afterShow: function(e)
      {
          try {
              drawGraph();
          }
          catch (e) {

          }          
      },
      init: function (e) {          
    
          APP.FootPrintModal.model.apply();
      /*    setInterval(function () {
              //if (IsPayed)
            if ((APP.instance.view().id == '#FootPrint'))
              if (params != null && TickerWorks(params.ticker))
                  queryClusterProfileGraph(true);
          }, 500);*/
     }
  };

  var view = new View('FootPrint', html, model, events);
});