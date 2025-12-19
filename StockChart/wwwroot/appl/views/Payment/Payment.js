define([
  'views/view',
  'text!views/Payment/Payment.html'
], function (View, html) {

    var model = kendo.observable({ IsPayed: APP.Login.model.result.validated });

    var events = {
        init: function (e) {

        
        function generateForm(params)
        {
            let s = '<form method="POST" action="https://yoomoney.ru/quickpay/confirm.xml">';
            for (let p in params)
                s += '<input type="hidden" name="{0}" value="{1}">'.format( p, params[p]);
            s += '<input type="submit" class="k-button k-button-icontext k-grid-Оформить" value="Оформить"></form>';
            return s;
        }

        function getPaymentButton(data)
        {
            let params = { receiver: 410011635522558, label: data.BillId, targets: data.message, sum: data.money, paymentType: viewModel.paymentType, "quickpay-form": "donate" };
            return generateForm(params);
        };


        var refreshGrid = function (service) {
            $("#grid").kendoGrid({
                sortable: true,
                groupable: false,
                scrollable: false,
                dataSource: {
                    transport: {
                        read: {
                            url: sitePrefix + 'api/billing/Tarifs?service=' + service + '&guid=@Model.ProviderUserKey', dataType: "Json"
                        }
                    }
                },
                columns: [
                    { field: "period", title: "Период подписки", template: '#=  data.period #' },
                    { field: "price", title: "Цена подписки", template: '#=  data.price #' },
                    { field: "monthprice", title: "Цена в месяц", template: '#=  data.monthprice #' },
                    { title: '', template: getPaymentButton, visible: true },
                    { command: { text: 'Оформить', click: showDetails }, title: '', width: '80px', visible: true }                    
                ]
            });
        };
                           
        },
        afterShow: function (e) {          
            model.set("IsPayed", APP.Login.model.result.validated );
        }
    };

    var view = new View('Payment', html, model, events);
});