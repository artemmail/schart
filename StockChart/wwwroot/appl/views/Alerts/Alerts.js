define([
  'views/view',
  'text!views/Alerts/Alerts.html'
], function (View, html) {

    var model = kendo.observable({ IsPayed: IsPayed });
    var events = {
        init: function (e) {





        

            $("#alertsGrid").kendoGrid({

                
                columns: [
                    { field: "ticker",  title:"Тикер" },
                    { field: "price", title: "Цена" },
/*                    {
                         field: "sign",
                         title: 'Напр.',
                         template: function (data) {
                             return (data.sign > 0) ? '<font color="green">Вверх</font >' : '<font color="red">Вниз</font >';
                         }
                     },*/
             //       { field: "sign", width: "150px" },
                    { command: ["edit", "destroy"], title: "&nbsp;" }
                ],
                sort: { field: "Comment", dir: "desc" },
                editable: "inline",
                pageable: true,
                sortable: true,
                filterable: true,
                toolbar: ["create"],
                dataSource: {
                    //   error: errorHandler("#grid"),
                    serverPaging: true,
                    serverFiltering: true,
                    serverSorting: true,
                    pageSize: 10,
                    schema: {
                        data: "Data",
                        total: "Total",
                        model: {
                            id: "id",
                            fields: {
                                ID: { editable: false, nullable: true },
                                ticker: { validation: { required: true } },
                                price: { validation: { required: true } },
                                sign: { editable: false, validation: { required: false } }
                            }
                        }
                    },
                    batch: true,
                    transport: {
                        create: {
                            url: sitePrefix + "Alerts/Create",
                            type: "POST"
                        },
                        read: {
                            url: sitePrefix + "Alerts/Read",
                            contentType: "application/json",
                            type: "POST"
                        },
                        update: {
                            url: sitePrefix + "Alerts/Update",
                            type: "POST"
                        },
                        destroy: {
                            url: sitePrefix + "Alerts/Destroy",
                            type: "POST"
                        },

                        parameterMap: function (data, operation) {
                            if (operation != "read") {                               
                                var result = {};

                                for (var i = 0; i < data.models.length; i++) {
                                    var product = data.models[i];

                                    for (var member in product) {
                                        result["alerts[" + i + "]." + member] = product[member];
                                    }
                                }

                                return result;
                            } else {
                                return JSON.stringify(data)
                            }                           
                        }
                    }
                }
            });
            
            //   MarketMapRefresh();
        },
        afterShow: function (e) {
            //      alert(IsPayed);
   		var isCordovaApp = document.URL.indexOf('http://') === -1  && document.URL.indexOf('https://') === -1;
            model.set("IsPayed", IsPayed);
            model.set("IsCordova", isCordovaApp);
        }
    };

    var view = new View('Alerts', html, model, events);
});