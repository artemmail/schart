define([
  'views/view',
  'text!views/CandlesChart/CandlesChart.html'
], function (View, html) {  
 
  var model = kendo.observable({    
      onResize: function()
      {
          c.MobileResize();
          c.ComputeSizes();
          c.drawcanvas();         
      },
      onChange: function (e)
      {
          
      }
  });

  var events = {
      afterShow: function(e)
      {
          try
          {          
              c.MobileResize();
              c.ComputeSizes();
              c.drawcanvas();
          }
          catch(e)
          {

          }          
      },
      init: function (e) {          
          c = new CandleChart('myCanvas');
          c.scale = 1.5;
          c.SetMouseCallBacks();          
          c.params = ControlsToParams(APP.CandlesChartModal.model.controls);
          c.paramshorizontal = ControlsToParamsHorizontal(APP.CandlesChartModal.model.controls);
          c.visualVolume = true;
          c.params['oiEnable'] = true;
          c.queryCandlesFull();
          c.SetWindowCallBacks();
          
                  
      }
  };

  var view = new View('CandlesChart', html, model, events);
});