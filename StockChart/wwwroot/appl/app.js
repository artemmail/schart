define([
    'views/drawer/drawer',
    'views/MicexTab/MicexTab',
    'views/RtsTab/RtsTab',
    'views/BinTab/BinTab',
    'views/Splash/Splash',
    'views/TopOrders/TopOrders',
    'views/Barometer/Barometer',
    'views/MultiCandles/MultiCandles',
    'views/CandlesChartModal/CandlesChartModal',
    'views/CandlesChart/CandlesChart',
    'views/FootPrintModal/FootPrintModal',
    'views/FootPrint/FootPrint',
    'views/Login/Login',
    'views/MarketMap/MarketMap',
    //'views/Payment/Payment',
    //'views/PaymentScreen/PaymentScreen',
    'views/Alerts/Alerts'
], function () {
    // create a global container object
    var APP = window.APP = window.APP || {};
    var init = function () {


        connection = new signalR.HubConnectionBuilder().withUrl("/CandlesHub").build();

        connection.on("recieveCandle", function (message) {

            try {

                var answ;
                eval("answ=" + message);
                candlesObjects[JSON.stringify(answ.key)].updateMerge(answ.data);
            }
            catch (ex) {

            }
        });

        connection.on("recieveCluster", function (answ) {
            try {
                $.each(answ, function (index, value) { value.x = new Date(value.x) });
                NP.mergeData({ clusterData: answ });
            }
            catch (ex) {

            }
        });

        connection.on("recieveLadder",
            function (ladder) {

                if (Object.keys(ladder).length > 2) {
                    var res = {};

                    for (let key in ladder) {
                        let newkey = Math.round(key / NP.data.priceScale) * NP.data.priceScale;
                        if (newkey == 0)
                            newkey = key;
                        if (newkey in res)
                            res[newkey] += ladder[key];
                        else
                            res[newkey] = ladder[key];
                    }
                    NP.data.ladder = res;
                    NP.drawClusterView();
                }
            });

        connection.start().then(function () {
            console.log("Connect..");
           
        }).catch(function (err) {
            return console.error(err.toString());
        });

        connection.onclose(() => {
            console.log("Disconnect");
            setTimeout(() => connection.start(), 5000);
        });







        try {
            window.plugins.appMetrica.activate('da96c42f-8772-4818-8dcc-f3b98ed285f9');
        }
        catch (e) {
        }
        APP.instance = new kendo.mobile.Application(document.body, { skin: 'flat' });
        window.addEventListener('resize',
            function () {
                try {
                    var view = APP.instance.view();
                    view.model.onResize();
                }
                catch (e) {
                }
            }
            , false);
    };
    return {
        init: init
    };
});