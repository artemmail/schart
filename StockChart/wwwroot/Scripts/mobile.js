    function footprintselect(e) {
        queryClusterProfileGraph(false, footPrintParamsControls());
}
    function afterShow(e) {
        resize();
    }
    function onupdateVolYear() {
        var h = Math.max(220, window.innerHeight - document.getElementById('map1').getBoundingClientRect().top - 3);
        document.getElementById('map1').style.height = h + "px";
        document.getElementById('map1').style.width = window.innerWidth + "px";
        document.getElementById('map1').height = h;
        document.getElementById('map1').width = window.innerWidth;
        var elem = document.getElementById('YearsList');
        var elem2 = document.getElementById('MarketList');
        ShowMicexVol('map1', elem.value, elem2.value);
    }
    function resize() {
        if (app.view())
            switch (app.view().id) {
                case '#multi':
                    MultiResize();
                    break;
                case '#map':
                    document.getElementById('treemap').style.height = //window.innerHeight + "px";
                    Math.max(220, window.innerHeight - document.getElementById('treemap').getBoundingClientRect().top - 3) + "px";                   
		            ShowMarketMap('treemap', {plain:true});                    
                    break;
                case '#micexvol':
                    onupdateVolYear();
                    break;
            }
    }
    $(document).ready(function () {
        app = new kendo.mobile.Application($(document.body), { /* useNativeScrolling: true,*/ skin: "flat", transition: "slide" });
        window.addEventListener('load', resize, false);
        window.addEventListener('resize', resize, false);
    });
    var c = new CandleChart('myCanvas');
    c.scale = 1.5;
    $("#ticker").autocomplete({
        source: function (request, response) {
            $.get(
                '/api/common/findbymask', {
                    mask: request.term
                },
   function (data) {
                        response(data);
                    });        },
        select: function (event, ui) {
	MouseAutoComplete('ticker',event, ui);
            c.GetParams(); c.queryCandlesFull();
            return false;
        },
        minLength: 1
    });
    function onInitialize(e) {
        switch (e.view.id) {
            case '#map':
                resize();
                break;
            case '#micexvol':
                resize();
                break;
            case '#splash':
                ReportVolumeSplashMobile('#splashgrid')
                break;
            case '#barometer':
                ReportBarometerMobile("#barometergrid"); 
                break;
            case '#candleschart':
                c.SetMouseCallBacks();
                c.GetParams();
                c.visualVolume = true;
                c.params['oiEnable'] = true;
                c.queryCandlesFull();
                c.SetWindowCallBacks();
                if (IsPayed)
                    setInterval(function () {
                        //if (document.getElementById('autoUpd') && document.getElementById('autoUpd').checked)
                        if ((app.view().id == '#candleschart') )
                            c.queryCandlesUpdate();
                    }, 1000);
                break;
            case '#footprint':
                FootPrintScreen();
               // if (IsPayed)
                    setInterval(function () {
                        if ((app.view().id == '#footprint') )
                            queryClusterProfileGraph(true);
                    }, 500);
                break;
            case '#multi':
                names = ['USD000000TOD', 'BR', 'ED', 'Si', 'RI', 'GAZP',  'EUR_RUB__TOD', 'MX', 'SBER' /*, 'GAZP', 'LKOH', 'GMKN'*/];
                desc = ['RUR/USD', 'Нефть', 'EUR/USD', "Si(Фьючерс на Рубль)", "RTS FUT","GAZP(Газпром)", "RUR/EUR", "MICEX FUT","SBER(Сбербанк)",/*"GAZP(Газпром)", "LKOH(Лукойл)", "GMKN(Норникель)"*/];
            InitMultiPage(names,desc);
            if (IsPayed)
                setInterval(function () {
                    if ((app.view().id == '#multi'))
                        for (var i = 0; i < can.length ; i++)
                            can[i].queryCandlesUpdate();
                }, 3000);
            case '#tab1':
                $(function () {
                    $("#tabsh").tabs();
                });
                InitIndexPageAbstract("#tabstrip", MicexLeaders);
                if (IsPayed)
                    setInterval(function () {
                        if ((app.view().id == '#tab1') && (MarketWorks() == 2))
	                RefreshIndexTablesMicex();
                    }, 5000);
                break;
            case '#tab2':
                $(function () {
                    $("#tabsha").tabs();
                });
                InitIndexPageAbstract("#tabstrip2", RtsLeaders);
                if (IsPayed)
                    setInterval(function () {
                        if ((app.view().id == '#tab2')  && (MarketWorks()  > 0))
	                RefreshIndexTablesRts();
                    }, 5000);
                break;
        }
    }
    function ChangePeriod() {
        var v = document.getElementById('multiperiod').value;
        for (var i = 0; i < can.length; i++) {
            can[i].params.period = v;
            can[i].params.rperiod = RperiodFromPeriod(v);
            can[i].queryCandlesFull();
        }
    }
settings = { style: "Delta", Postmarket: true, OpenClose: true };
    function modalViewOpen(e) {
        if (app.view().id == "#footprint") {
            $('#CandlesOptions').hide();
            $('#FootPrintOptions').show();
        }
        else {
            $('#FootPrintOptions').hide();
            $('#CandlesOptions').show();
        }
        var modal = $("#newTodo");
        //Get header height.
        var height = modal.find('div.km-header').outerHeight(true) + 40;
        //Get all direct descendants of the km-scroll-container that are visible and add their heights.
        $.each(modal.find('div.km-scroll-container > *'), function (index, elem) {
            var jqElem = $(elem);
            if (jqElem.is(":visible")) {
                height += jqElem.outerHeight(true);
            }
        });
        //Dynamically resize the dialog's height.
        modal.height(height);
        modal.parent().parent().height(height);
    }
    function CloseModal() {
        $("#newTodo").data("kendoMobileModalView").close();
    }
    function onSelectStyle(e) {
        //    console.log(settings.OpenClose);
        var values = ["Delta", "ASKxBID", "Volume"];
        settings.style = values[this.current().index()];
        console.log(settings.OpenClose);
        drawGraph();
    }
    function ApplySettings() {
        if (app.view().id == "#footprint") {
            settings.OpenClose = document.getElementById('candles').checked;
            queryClusterProfileGraph(false, footPrintParamsControls());
        }
        else {
            c.GetParams();
            c.queryCandlesFull();
        }
        CloseModal();
    }