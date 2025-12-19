define([
  'views/view',
  'text!views/CandlesChartModal/CandlesChartModal.html'
],  function (View, html) {
    
   var ApplyTicker = function () {      
      try
      {
              c.Unsubscribe();
       } catch(e) {}
      c.params = ControlsToParams(viewModel.controls);
      ApplyModelToControls(viewModel);
      c.paramshorizontal = ControlsToParamsHorizontal(viewModel.controls);
      c.queryCandlesFull();
      modalViewCandles.close();
  }

  var viewModel = null;

   $.ajax({
      url: sitePrefix + 'api/common/jsonChartControls',
      data: { ticker: 'Si' },
      async: false,
      success: function (data) {
          viewModel = CreateViewModelBase(data, ApplyTicker);
          settings = viewModel.settings;
    
      }
  });

  var events = {
      init: function (e) {
          modalViewCandles = e.sender;
      },
      open: function (e) {

      }
  };

    var view = new View('CandlesChartModal', html, viewModel, events);


});