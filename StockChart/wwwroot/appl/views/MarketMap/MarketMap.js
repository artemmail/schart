define([
  'views/view',
  'text!views/MarketMap/MarketMap.html'
], function (View, html) {

    var MarketMapRefresh =
        function () {         
            try
            {
                ShowMarketMap('treemap', { plain: true });
            }
            catch(e)
            {
                alert('Error');
            }
        }
        var model = kendo.observable({
            onResize: function () {
         
                MarketMapRefresh();
            }
    });
    var events = {
        init: function (e) {
         //   MarketMapRefresh();
        },
        afterShow: function (e) {
            MarketMapRefresh();
        }
    };
    var view = new View('MarketMap', html, model, events);
});