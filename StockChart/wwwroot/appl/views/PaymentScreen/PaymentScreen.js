define([
  'views/view',
  'text!views/PaymentScreen/PaymentScreen.html'
], function (View, html) {

    var model = kendo.observable({ IsPayed: IsPayed });

    var events = {
        init: function (e) {
                       
        },
        afterShow: function (e) {          
            model.set("IsPayed", IsPayed);
        }
    };

    var view = new View('PaymentScreen', html, model, events);
});