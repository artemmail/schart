var drawGraph = function () {
    NP.resize();
};
var getLevelsFromStorage = function () {
    return window.localStorage.getItem("levels11");
};
var putLevelsToStorage = function (data) {
    window.localStorage.setItem("levels11", JSON.stringify(data));
};
var saveParamsHistory = function (params) {
    var hisDic = {};
    try { hisDic = JSON.parse(window.localStorage.getItem("footPrintHistory")); } catch (e) { }
    if (hisDic == null) hisDic = {};
    var key = jQuery.param(params);
    var count = 1;
    if (key in hisDic)
        count = hisDic[key].count + 1;
    hisDic[key] = { count: count, params: params, date: new Date() };
    window.localStorage.setItem("footPrintHistory", JSON.stringify(hisDic));
    updateHistory();
};
var paramToStr = function (param) {
    if ('startDate' in param)
        return '{0},{1}-{2},таймфрейм:{3} мин,шаг:{4}'.format(param.ticker, param.startDate, param.endDate, param.period, param.priceStep);
    else
        return '{0},период:{1},таймфрейм:{2} мин,шаг:{3}'.format(param.ticker, param.rperiod, param.period, param.priceStep);
};
var updateHistory = function () {
    if (isMobile2())
        return;
    try {
        var hisDic;
        try { hisDic = JSON.parse(window.localStorage.getItem("footPrintHistory")); } catch (e) { }
        if (hisDic == null) return;
        clenupClusterHistory();
        var values = Object.keys(hisDic);
        values.sort(function (a, b) {
            return Date.parse(hisDic[b].date) - Date.parse(hisDic[a].date);
        });
        for (var i = 0; i < Math.min(values.length, 15); i++) {
            var v = values[i];
            var p = hisDic[v].params;
            var tt = 'UpdateControls(viewModel,' + JSON.stringify(p) + ', ApplyTicker)';
            tt = tt.replaceAll('"', "'");
            menu.append(ConvertMenuItem({
                text: paramToStr(p),
                onclick: tt
            }), historyItem());
        }
    }
    catch (e) { }
};
var markset = { levels: {}, dates: {}, filters: {} };
try {
    markset = getLevelsFromStorage();
    if (markset != null)
        markset = JSON.parse(markset);
    else
        markset = { levels: {}, dates: {}, filters: {} };
}
catch (e) {
    markset = { levels: {}, dates: {}, filters: {} };
}
var getMarksKey = function () {
    return params.ticker + '_' + params.period + '_' + params.priceStep;
};
function SetMouseCallbacks() {
    var mouseDownElements = [];
    var downEvent;
    $("#graph").mousemove(function (e) {
        if (NP != null) {
            if (e.which === 1)
                NP.onMouseMovePressed(e);
            else
                NP.onMouseMove(e);
        }
    });

    $("#graph").mouseout(function (e) { NP.onMouseOut(e); });

    $("#graph").mousedown(function (e) { NP.onMouseDown(e); });
    $("#graph").mouseup(function (e) { NP.onMouseUp(e); });
    $("#graph").dblclick(function (e) { NP.onDblClick(e); });
    $('#graph').bind('wheel', function (e) {
        var wheelDistance = function (evt) {
            if ('wheelDeltaY' in evt)
                return evt.wheelDeltaY / 120;
            return -evt.deltaY / 3;
        };
        e.originalEvent.wheelDistance = wheelDistance(e.originalEvent);
        NP.onMouseWheel(e.originalEvent);
    });
    $("#graph").mouseout(function (e) { NP.drawClusterView(); });
    var graph = document.getElementById("graph");
    var h = Hammer(graph);
    var mc = new Hammer.Manager(graph);
    mc.add(new Hammer.Tap({ event: 'singletap' }));
    mc.on("singletap", function (event) { NP.onTap(event); });
    h.get('pinch').set({ enable: true });
    h.on("pan panstart panend pinchstart pinchmove pinchend", function (event) {
        var events = { panstart: 'onPanStart', pan: 'onPan', panend: 'onPanEnd', pinchstart: 'onPinchStart', pinchmove: 'onPinchMove', pinchend: 'onPinchEnd' };
        if (event.type in events)
            NP[events[event.type]](event);
    });
    if (!isMobile2())
        $(window).resize(function () { NP.resize(); });
}
var params = {};
var footPrintParamsControls = function () {
    var names = ['ticker', 'period', 'priceStep', 'rperiod', 'startDate', 'endDate', 'startTime', 'endTime'];
    var checkBoxNames = ['timeEnable', 'candles', 'Postmarket'];
    var params = {};
    for (var key in names)
        if (document.getElementById(names[key]))
            params[names[key]] = document.getElementById(names[key]).value;
    for (var key in checkBoxNames) {
        if (document.getElementById(checkBoxNames[key]))
            params[checkBoxNames[key]] = document.getElementById(checkBoxNames[key]).checked;
    }
    return params;
}
var mouseInit = false;

var old = null;

var queryClusterProfileGraph = function (lastOnly, param) {
   
    
    if (!mouseInit) {
        $(SetMouseCallbacks);
        mouseInit = true;
    }
    if (lastOnly) {
        if (!TickerWorks(params.ticker) || footPrintBusy)
            return;



        /*
        if (params.timeEnable) {
            var d = params.endDate.split(".");
            var t = params.endTime.split(":");
            if (new Date() > new Date(d[2], d[1] - 1, d[0], t[0], t[1]))
                return;
        }*/

        params.startDate = removeUTC(new Date(NP.data.clusterData[NP.data.clusterData.length - 1].x));
        params.endDate = null;
    }
    else {
        params = CloneObject(param);

        saveParamsHistory(params);
        footPrintBusy = true;
    }

    try {
        params.login = APP.Login.model.login;
        var aa = params.login;
    }
    catch (e) {

    }

    //params.CandlesOnly = viewModel.settings.CandlesOnly;

    $.get(
        sitePrefix + 'api/clusters/getRange',
        params,
        function (data) {

            if (params.period == 0) {
                data.clusterData = $.map(data.clusterData, function ( value) {

                    var xx =
                    {
                        Number:  value.Number,
                        "x": new Date(value.TradeDate),
                        "o": value.Price,
                        c: value.Price,
                        l: value.Price,
                        h: value.Price,
                        q: value.Quantity,
                        bq: value.Quantity * value.Direction,
                        v: value.Volume,
                        bv: value.Volume * value.Direction,
                        oi: value.OI
                    };

                    return xx;
                });
            }
            else
            $.each(data.clusterData, function (index, value) {
                value.x = new Date(value.x)
            });

            if (data !== '' && 'forbidden' in data) {
                params.ticker = "GAZP";
                $.when(kendo.ui.ExtAlertDialog.show({
                    title: "Не доступно",
                    message: data.message,
                    icon: "k-ext-information"
                }));
                return;
            }
            if (lastOnly)
                NP.mergeData(data);
            else {
                document.title = params.ticker + ' FootPrint';
                NP = new newFootPrint(data);
                footPrintBusy = false;

                try {
                    if (old != null) {
                        connection.invoke("UnSubscribeCluster", JSON.stringify(old));
                        connection.invoke("UnSubscribeLadder", old.ticker);
                    }
                } catch (f) { }


                if (!!params.endDate) {
                    var d = new Date(params.endDate);
                    if ((d.getUTCHours() != 0 || d.getUTCMinutes() != 0)) {
                        //&& new Date() > d)
                        return;
                    }

                    var x = new Date();
                    if (!(x.getUTCDay() === d.getUTCDay() && x.getUTCMonth() === d.getUTCMonth() && x.getUTCFullYear() === d.getUTCFullYear()))
                        return;
                }



                var step = params.priceStep;

                try {
                    step =  viewModel.settings.CandlesOnly ? 0 : params.priceStep;
                }
                catch (e) { }

                old = { ticker: params.ticker, period: params.period, step: step };

                connection.invoke("SubscribeCluster", JSON.stringify(old));
                connection.invoke("SubscribeLadder", old.ticker);

            }
        }
    );
}
function freezeCanvas() {
    needLogo = true;
    NP.drawClusterView();
    canvas.toBlob(
        function (blob) {
            uploadImage(blob);
        }, "image/png");
    needLogo = false;
    NP.drawClusterView();
    return;
}
function FootPrintScreen() {
    isFootPrint = true;
    $(document).ready(function () {
        MenuAddCluster(menu);
        debugger

        $("#ticker").autocomplete({
            source: function (request, response) {
                $.get(
                    '/api/common/findbymask', {
                    type: "Cluster",
                    mask: request.term
                },
                    function (data) {
                        response(data);
                    });
            },
            select: function (event, ui) {
                MouseAutoComplete('ticker', event, ui);
                //PriceStepUpdate();
                return false;
            },
            minLength: 1
        });
        queryClusterProfileGraph(false, footPrintParamsControls());
    });
}
function FootPrintSetInterval() {
    setInterval(function () {
        if (document.getElementById('autoUpd') && document.getElementById('autoUpd').checked)
            queryClusterProfileGraph(true);
    }, 300);
}

