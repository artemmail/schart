function isMap() {
    return $('#stylelist').val() === '0';
}
function ShowMarketMapPeriod() {
    if (false && !IsPayedUser && document.getElementById('rperiod').value !== 'day') {
        $("#rperiod").data("kendoDropDownList").value("day");
        update_start_end(document.getElementById('rperiod').value);
        $.when(kendo.ui.ExtAlertDialog.show({
            title: "Платная функция",
            width: '280px',
            height: '130px',
            message: '<b>Бесплатным пользователям  доступен просмотр Карты рынка только за последний день торгов</b><br> <br>Оформить подписку можно по <a href="/Payment">ссылке</a>',
            icon: "k-ext-information"
        }));
    }
    else {
        if (isMap())
            ShowMarketMap('desk', urlParams());
        else
            genSet();
    }
}

var busy = true;
function resizeMap() {
    if (isMap()) {
        var div = document.getElementById("desk");
        div.style.height = Math.max(220, window.innerHeight - div.getBoundingClientRect().top - 10) + 'px';
    }
    else
        if (busy) {
            busy = false;
            setTimeout(function () {
                RedrawDesk(deskData);
                busy = true;
            }, 100);
        }
}
function resize() {
    if (isMap()) {
        var div = document.getElementById("desk");
        div.style.height = Math.max(220, window.innerHeight - div.getBoundingClientRect().top - 10) + 'px';      
    }    
    ShowMarketMapPeriod();
}
function urlParams() {
    let x = required.value() + '';
    return {
        startDate: toIsoString("#startDate"),
        endDate: toIsoString("#endDate"), 
        rperiod: $('#rperiod').val(),
        top: $('#toplist').val(),
        market: $('#marketList').val(),
        categories: x
    }
}
function opens(ticker) {
    let params = urlParams();
    params.ticker = ticker;
    OpenCandles(params);
}
function genBlock(ticker, color, price, volume, percent, name) {
    return [
        '<div ticker="{0}" onclick="opens(\'{0}\')" class="ticker" style="background-color: {1} ">' +
        '   <dl>' +
        '      <dt>{0}' +
        '      <br /><span style="font-size:12px">{5}</span> </dt>' +
        '     <dd><h2>{2}</h2></dd>' +
        '    <dd>{4}%</dd>' +
        '     <dd>V: {3}</dd>' +
        '     </dl>' +
        '</div>'
    ].join().format(ticker, color, price, volume, percent, name);
}
function findTicker(data,ticker) {
    let x = data[0].items;
    for (let j = 0; j < x.length; j++) 
      for (let i = 0; i < x[j].items.length; i++) 
          if (x[j].items[i].ticker == ticker)
              return x[j].items[i];        
}
function RedrawDesk(data) {
    let treeMap = $("#desk");
    treeMap.removeClass("k-widget k-treemap");
    treeMap.removeAttr('style');
    treeMap.css('background-color', '#e0e0e0');
    let res = '';
    for (let j = 0; j < data[0].items.length; j++) {
        let items = data[0].items[j].items;
        let r = ''
        let tickers = [];
        for (let i = 0; i < items.length; i++) {
            let n = items[i];
            let p = drob(n.percent,2);
            if (n.percent < 0)
                p = "&#9660;" + p;
            if (n.percent > 0)
                p = "&#9650;" + p;
            r += genBlock(n.ticker, n.color, n.cls, MoneyToStr(n.value), p, n.name1);
            tickers.push(n.ticker);
        }
        let href = '/MultiCandles?tickers={0}'.format(tickers + '');
        res += '<div class="category effect2"><div><h6><a target="_blank" href="{2}" >{0}</a></h6> </div><div>   {1}</div>   </div>'.format(data[0].items[j].name, r, href);
    }
    $('#desk').html(res);
}
var deskData;
var item;
function genSet() {
    $.get('/api/reports/MarketMap', urlParams(), function (data) {
        deskData = data;
        let treeMap = $("#desk");
        if (treeMap.data("kendoTooltip")) {
            treeMap.data("kendoTooltip").destroy();
        }
        RedrawDesk(deskData);
        treeMap.kendoTooltip({
            filter: ".ticker",
            position: "top",
            show: function (e) {
                params = CloneObject(urlParams());
                params.ticker = item.ticker;
                console.log($('#myCanvas' + item.ticker).length);
                try {
                    InitCanvas2('myCanvas' + item.ticker, params, item.name1,
                        {
                            percent: item.percent,
                            volume: item.value,
                            ask: item.bid
                        }
                         );
                }
                catch (e) { }
            },
            content: function (e) {
                let ticker = e.target.attr('ticker');
                item = findTicker(deskData, ticker);
                if (item.cls != null) {
                    return '<canvas id="myCanvas{0}" width="{1}" height="{2}" style="width:{1}px;height:{2}px;"></canvas>'.format(item.ticker, 350, 200);                    
                }
                else
                    return "<p><b>{0}</b></p><p><b>Объем:</b>{2}</p>".format(item.name, item.cls, kendo.toString(item.value, "n0"));
            }
        });
    });
}
var required;
$(function () {
   

    $("#marketList").width(140).kendoDropDownList();
    $("#stylelist").width(80).kendoDropDownList();
    $("#toplist").width(80).kendoDropDownList();
    $("#get").click(function () {
        alert("Attendees:\n\nRequired: " + required.value());
    });
    var checkInputs = function (elements) {
        elements.each(function () {
            var element = $(this);
            var input = element.children("input");
            input.prop("checked", element.hasClass("k-state-selected"));
        });
    };
    // create MultiSelect from select HTML element
    required = $("#categories").kendoMultiSelect({
        itemTemplate: "#:data.text# <input type='checkbox' />",
        autoClose: false,
        dataBound: function () {
            var items = this.ul.find("li");
            setTimeout(function () {
                checkInputs(items);
            });
        },
        change: function () {
            var items = this.ul.find("li");
            checkInputs(items);
        }
    }).data("kendoMultiSelect");   

     window.addEventListener('load', resize, false);
    window.addEventListener('resize', resizeMap, false);
});
