define([
  'views/view',
  'text!views/FootPrintModal/FootPrintModal.html'
], function (View, html) {
    
    var viewModel = null;

    var ApplyTicker = function () {
        /*
        if (viewModel.controls.ticker != 'GAZP' && !IsPayed) {
            viewModel.set("controls.ticker", 'GAZP');
            //viewModel.set("controls.priceStep", 0);        
            $.when(kendo.ui.ExtAlertDialog.show({
                title: "Платная функция",
                message: 'Бесплатным пользователям <br> доступен только Газпром<br>1Оформить подписку можно по <a href="http://ru-ticker.com/Payment">ссылке</a>',
                icon: "k-ext-information"
            }));
            //ApplyModelToControls(viewModel);
            //return;
        }
        */
//      ApplyModelToControls(viewModel);

      var step = viewModel.controls.minStep;
      var decimals = GetDecimals(step);
      $("#psfp").data("kendoNumericTextBox").step(step);
      $("#psfp").data("kendoNumericTextBox").setOptions({ min: step, format: "n" + decimals, decimals: decimals });

      queryClusterProfileGraph(false, ControlsToParamsFootPrint(viewModel));
      modalViewFootPrint.close();
  }

  

  $.ajax({
      url: sitePrefix + 'api/common/jsonChartControls',
      data: { ticker: IsPayed? 'Si':'GAZP', type: "Cluster" },
      async: false,
      success: function (data) {
          viewModel = CreateViewModelBase(data, ApplyTicker);
          FPsettings = viewModel.settings;
      }
  });

  var events = {
      init: function (e) {
          modalViewFootPrint = e.sender;
      },
      open: function (e) {
          ApplyModelToControls(viewModel);
      }
  };

  var view = new View('FootPrintModal', html, viewModel, events);
});