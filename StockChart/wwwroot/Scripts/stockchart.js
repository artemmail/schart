var menu;
var m;
var redcandleA = "rgba(250, 0, 0, 0.5)";
var greencandleA = "rgba(75, 150, 0, 0.5)";
var Black = "#000000";
var lineColor = '#888';
var greencandle = "rgba(107, 165, 131, 1)";
var greencandlesat = "rgba(4, 163, 68, 1)";
var redcandle = "rgba(215, 84, 66, 1)";
var redcandlesat = "rgba(214, 24, 0, 1)";
var greencandleA = "rgba(107, 165, 131, 0.6)";
var greencandlesatA = "rgba(4, 163, 68, 0.6)";
var redcandleA = "rgba(215, 84, 66, 0.6)";
var redcandlesatA = "rgba(214, 24, 0, 0.6)";
var greencandleAA = "rgba(107, 165, 131, 0.25)";
var redcandleAA = "rgba(215, 84, 66, 0.15)";
var greenCandleBorder = '#225437';
var redCandleBorder = '#5b1a13';
var greencandle = "#6ba583";
var greencandlesat = "#04a344";
var redcandle = "#d75442";
var redcandlesat = "#d61800";
var extraTickers = ['@NQ#', '@EU#', '@ES#', 'AAPL', 'FB', 'AMZN', 'TSLA', 'NVDA', 'QCL#', 'QGC#', 'QBZ#'];

function toIsoString(Id) {
        var date = $(Id).data("kendoDatePicker").value();
       
        var tzo = -date.getTimezoneOffset(),
            dif = tzo >= 0 ? '+' : '-',
            pad = function (num) {
                return (num < 10 ? '0' : '') + num;
            };

        return date.getFullYear() +
            '-' + pad(date.getMonth() + 1) +
            '-' + pad(date.getDate()) +
            'T' + pad(date.getHours()) +
            ':' + pad(date.getMinutes()) +
            ':' + pad(date.getSeconds());
            /*+
            dif + pad(Math.floor(Math.abs(tzo) / 60)) +
            ':' + pad(Math.abs(tzo) % 60);*/
    }

function drob(v, sh = 2) {
    if (v == 0)
        return 0;
    let x = -(Math.round(Math.log10(Math.abs(v))) - sh);
    if (x < 0) x = 0;
    let p = Math.pow(10, x);
    return Number(Math.round(v * p) / p).toFixed(10).replace(/\.?0+$/, "");
}
function extraTarif(ticker) {
    if (!IsPayedPlus) {
        if (ticker in extraTickers) {
            window.open('/PaymentCME');
            return false;
        }
        return true;
    }
    return true;
}
if (typeof (sitePrefix) == 'undefined')
    sitePrefix = '/'; //'http://localhost:50512/';//
function CloneObject(obj) {
    return JSON.parse(JSON.stringify(obj));
}
function hexToRgb(hex) {
    // Expand shorthand form (e.g. "03F") to full form (e.g. "0033FF")
    var shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
    hex = hex.replace(shorthandRegex, function (m, r, g, b) {
        return r + r + g + g + b + b;
    });
    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
}
function openView(params) {
    UpdateControls(APP.CandlesChartModal.model, params, APP.CandlesChartModal.model.apply);
    APP.instance.navigate("#CandlesChart");
}
function LinkToCandles(params, text, type) {
    type = /*typeof type !== 'undefined' ? type : */'FootPrint';
    if (isMobile2())
        return "<a onclick='openView({0})'>{1}</a>".format(JSON.stringify(params), text);
    else
        return '<a href="{0}">{1}</a>'.format(sitePrefix + type + '?' + jQuery.param(params), text);
}
function OpenCandles(params) {
    if (isMobile2())
        return openView(params);
    else
        window.open('/FootPrint?' + jQuery.param(params));
}
function MoscowTime() {
    var x = new Date();
    var currentTime = (3 * 60 + x.getTimezoneOffset()) * 60 * 1000;
    return new Date(x.getTime() + currentTime);
}
function MoscowTimeShift(date) {
    var x = new Date();
    var currentTime = (3 * 60 + x.getTimezoneOffset()) * 60 * 1000;
    return new Date(date.getTime() + currentTime);
}
function MarketWorks() {
    return 2;
    var Date = MoscowTime();
    weekday = Date.getDay();
    hour = Date.getHours();
    if ((weekday == 0) || (weekday == 6))
        return 0;
    //    if (hour >= 19)
    //      return 1;
    if (hour >= 6)
        return 2;
    return 0;
}
function TickerWorks(ticker) {
    if (/[*-+//()]/.test(ticker))
        return false;
    switch (MarketWorks()) {
        case 0: return false;
        case 2: return true;
        case 1:
            {
                if (ticker.length == 2)
                    return true;
                if ((ticker.length == 4) && /[A-Z][A-Za-z][A-Z][567]/.test(ticker))
                    return true;
                return false;
            }
    }
}
getGradientColor = function (start_color, end_color, percent) {
    // strip the leading # if it's there
    start_color = start_color.replace(/^\s*#|\s*$/g, '');
    end_color = end_color.replace(/^\s*#|\s*$/g, '');
    // convert 3 char codes --> 6, e.g. `E0F` --> `EE00FF`
    if (start_color.length == 3) {
        start_color = start_color.replace(/(.)/g, '$1$1');
    }
    if (end_color.length == 3) {
        end_color = end_color.replace(/(.)/g, '$1$1');
    }
    // get colors
    var start_red = parseInt(start_color.substr(0, 2), 16),
        start_green = parseInt(start_color.substr(2, 2), 16),
        start_blue = parseInt(start_color.substr(4, 2), 16);
    var end_red = parseInt(end_color.substr(0, 2), 16),
        end_green = parseInt(end_color.substr(2, 2), 16),
        end_blue = parseInt(end_color.substr(4, 2), 16);
    // calculate new color
    var diff_red = end_red - start_red;
    var diff_green = end_green - start_green;
    var diff_blue = end_blue - start_blue;
    diff_red = ((diff_red * percent) + start_red).toString(16).split('.')[0];
    diff_green = ((diff_green * percent) + start_green).toString(16).split('.')[0];
    diff_blue = ((diff_blue * percent) + start_blue).toString(16).split('.')[0];
    // ensure 2 digits by color
    if (diff_red.length == 1)
        diff_red = '0' + diff_red
    if (diff_green.length == 1)
        diff_green = '0' + diff_green
    if (diff_blue.length == 1)
        diff_blue = '0' + diff_blue
    return '#' + diff_red + diff_green + diff_blue;
};
function getGradientColorEx(start_color, mid_color, end_color, maxvalue, value) {
    if (value < 0)
        return getGradientColor(mid_color, start_color, -value / maxvalue);
    else
        return getGradientColor(mid_color, end_color, value / maxvalue);
}
String.prototype.replaceAll = function (search, replace) {
    return this.split(search).join(replace);
}
String.prototype.format = function () {
    var formatted = this;
    for (var arg in arguments) {
        formatted = formatted.replaceAll("{" + arg + "}", arguments[arg]);
        //          formatted = formatted.replace("{" + arg + "}", arguments[arg]);
    }
    return formatted;
};
inttodate = function (i) { return new Date(i * 1000); }
MyFixed = function (i) {
    return drob(i, 4);
}
function TimeFormat(d) {
    return dateTools.to2DigStr(d.getHours()) + ":" + dateTools.to2DigStr(d.getMinutes());
}
function TimeFormat2(d, s) {
    return dateTools.to2DigStr(d.getHours()) + ":" + dateTools.to2DigStr(d.getMinutes()) + ":" +
        dateTools.to2DigStr(d.getSeconds());
}
function DecodeDate(date) {
    return new Date(date);//(new Date(date.match(/\d+/)[0] * 1));
}
function jDateToStr(date) {
    var d = DecodeDate(date);
    return dateTools.toStr(d) + " " + TimeFormat2(d);
}


function jDateToStrD(date) {
    return dateTools.toStr(DecodeDate(date));
}
function jDateToStrT(date) {
    return TimeFormat(DecodeDate(date));
}
function UnPackArray(arr) {
    var i = 1;
    for (var i = 1; i < arr.length; i++)
        arr[i] = arr[i] + arr[i - 1];
}
function UnPackArrayRound(arr) {
    var i = 1;
    for (var i = 1; i < arr.length; i++)
        arr[i] = arr[i] + arr[i - 1];
    for (var i = 1; i < arr.length; i++)
        if (arr[i] - arr[i].toFixed(4) != 0) {
            arr[i] = Math.round(arr[i] * 10000) / 10000;
        }
}
function ColorText(sign, text, alig, color) {
    if (text != null) {

        if (color == null) {
            var color = 'black';
            if (sign > 0)
                color = greencandlesat;
            if (sign < 0)
                color = redcandlesat;
        }
        return '<span style="float:' + alig + '"><font color="' + color + '">' + text + '</font ></span>';
    }
    else return "";
}
function UnPackCandles(candles) {
    UnPackArrayRound(candles.Min);
    UnPackArrayRound(candles.Max);
    UnPackArrayRound(candles.Opn);
    UnPackArrayRound(candles.Cls);
    UnPackArray(candles.Date);
}
var dateTools = new function () {
    var monthnames = ["янв", "фев", "мар", "апр", "май", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];
    this.isValid = function (str) {
        if (str) {
            var arr = str.split('.');
            return arr.length == 3 && Number(arr[0]) >= 1 && Number(arr[0]) <= 31
                && Number(arr[1]) >= 1 && Number(arr[1]) <= 12
                && Number(arr[2]) >= 2000 && Number(arr[2]) <= 2100;
        }
    }
    this.parse = function (str) {
        if (str) {
            var arr = str.split('.');
            if (arr.length == 3) {
                return new Date(Number(arr[2]), Number(arr[1]) - 1, Number(arr[0]));
            }
        }
        return new Date();
    }
    this.toStr = function (date) {
        //return date;
        if (date && date.getDate) {
            var to2dig = function (num) { return num < 10 ? '0' + num : '' + num; };
            return '' + to2dig(date.getDate()) + '.' + to2dig(date.getMonth() + 1) + '.' + date.getFullYear();
        }
        return '';
    }
    this.monthName = function (date) {
        return monthnames[date.getMonth()] + ' ' + date.getFullYear();
    }
    this.toShortStr = function (date) {
        return date.getDate() + " " + monthnames[date.getMonth()];
    }
    this.unixToTimeStr = function (date) {
        var timePart = date - Math.floor(date / this.day()) * this.day();
        var hh = Math.floor(timePart / this.hour());
        var mm = Math.floor((timePart - hh * this.hour()) / this.minute());
        return "" + this.to2DigStr(hh) + ":" + this.to2DigStr(mm);
    }
    this.unixMinutesToTimeStr = function (date) {
        var d = new Date(date * 60000);
        return "" + this.to2DigStr(d.getHours()) + ":" + this.to2DigStr(d.getMinutes());
    }
    this.to2DigStr = function (num) { return num <= 9 ? "0" + num : "" + num; }
    this.getPreferedPeriod = function (milliseconds) {
        var days = milliseconds / 24 / 3600 / 1000;
        if (days <= 2)
            return '1'; // 1 min
        else if (days <= 5)
            return '5'; // 5 min
        else if (days <= 7 + 1)
            return '15'; // 15 min
        else if (days <= 14 + 1)
            return '30'; // 30 min
        else if (days <= 30 + 1)
            return '60'; // 1 hour
        else if (days <= 366)
            return '1440'; // 1 day
        else if (days <= 366 * 3)
            return '10080'; // 1 day
        else
            return '10080'; //30000// 1 month
    }
    this.getPreferedCPeriod = function (milliseconds) {
        var hours = milliseconds / 3600 / 1000;
        if (hours <= 2) return '5';
        else if (hours <= 4) return '10';
        else if (hours <= 6) return '15';
        else if (hours <= 24) return '30';
        else if (hours <= 2 * 24) return '60';
        else if (hours <= 4 * 24) return '120';
        else if (hours <= 8 * 24) return '240';
        else return '1440';
    }
    this.timeStrToUnix = function (str) {  // hh:mm
        if (str == '')
            return 0;
        arr = str.split(':');
        return (Number(arr[0]) * 60 + Number(arr[1])) * 60 * 1000;
    }
    this.timeStrAddUnix = function (str, delta) {
        return this.unixToTimeStr(Math.max(0, this.timeStrToUnix(str) + delta));
    }
    this.compareTextTime = function (a, b) {
        var ta = this.timeStrToUnix(a);
        var tb = this.timeStrToUnix(b);
        if (ta < tb) return -1;
        if (ta > tb) return 1;
        return 0;
    }
    this._Periods = [1, 5, 15, 30, 60, 1440, 1440 * 7, 1440 * 30];
    this._ClusterPeriods = [15, 30, 60, 120, 180, 240, 360, 720, 1440, 1440 * 2, 1440 * 3, 1440 * 7, 1440 * 30];
    this.second = function () { return 1000; }
    this.minute = function () { return 60000; }
    this.hour = function () { return 3600000; }
    this.day = function () { return 86400000; }
    this.week = function () { return 7 * this.day(); }
    this.month = function () { return 30 * this.day(); }
    this.halfyear = function () { return 182 * this.day(); }
    this.year = function () { return 365 * this.day(); }
};
var updatePeriod = function () {
    var period = $('#period');
    var start = toIsoString('#startDate'); 
    var end = toIsoString('#endDate');//$('#endDate').data("kendoDatePicker").value(); 
    if (period.length && start.length && end.length) {
        var dtime = end - start;
        period.data("kendoDropDownList").value(dateTools.getPreferedPeriod(dtime));
        period.val(dateTools.getPreferedPeriod(dtime));
        choose_period();
    }
    update_start_end_time();
}
var update_start_end_time = function () {
    var start = $('#startDate').data("kendoDatePicker").value(); 
    var end = $('#endDate').data("kendoDatePicker").value(); 
    var timeCont = $('#timeCont');
    if (start && end && timeCont) {
        if (start.getTime() === end.getTime())
            $('#timeCont').show();
        else {
            $('#timeCont').hide();
            $('#timeEnable').prop('checked', false);
        }
        update_timeEnable();
    }
}
var update_timeEnable = function () {
    var timeEnable = $('#timeEnable');
    if (timeEnable) {
        var startTime = $('#startTime');
        var endTime = $('#endTime');
        if (timeEnable.prop('checked')) {
            $('#startEndTimeCont').show();
            if (startTime.value == '' || endTime.value == '') {
                startTime.val('10:00');
                endTime.val('23:59');
            }
            update_time_limits(true, true);
        }
        else {
            $('#startEndTimeCont').hide();
            startTime.val('');
            endTime.val('');
        }
    }
}
var invalidate_rperiod = function () {
    $("#rperiod").data("kendoDropDownList").value("custom");
}
var onStartDateChange = function () {
    var dateText = $('#startDate').val();
    if (dateTools.parse(dateText).getTime() > dateTools.parse(lastDateStr).getTime()) {
        $('#startDate').val(dateText = lastDateStr);
    }
    var endDateValue = $('#endDate').val();
    if (!dateTools.isValid(endDateValue) || dateTools.parse(dateText).getTime() > dateTools.parse(endDateValue).getTime()) {
        $('#endDate').val(dateText);
    }
    updatePeriod();
    invalidate_rperiod();
    //PriceStepUpdate();
}
// On select end date
var onEndDateChange = function () {
    var dateText = $('#endDate').val();
    if (dateTools.parse(dateText).getTime() > dateTools.parse(lastDateStr).getTime()) {
        $('#endDate').val(dateText = lastDateStr);
    }
    var startDateValue = $('#startDate').val();
    if (!dateTools.isValid(startDateValue) || dateTools.parse(startDateValue).getTime() > dateTools.parse(dateText).getTime()) {
        $('#startDate').val(dateText);
    }
    updatePeriod();
    invalidate_rperiod();
    // PriceStepUpdate();
}
var update_start_end = function (rperiod) {
    var start = $('#startDate').data("kendoDatePicker"); 
    var end = $('#endDate').data("kendoDatePicker");
    if (!start || !end)
        return;
    var lastDate = dateTools.parse(lastDateStr); // new Date();
    if (rperiod == 'day') {
        end.value((lastDate));
        start.value((lastDate));
    }
    else if (rperiod == 'week') {
        end.value((lastDate));
        start.value((new Date(lastDate.getTime() - dateTools.week() + dateTools.day())));
    }
    else if (rperiod == 'month') {
        end.value((lastDate));
        start.value((new Date(lastDate.getTime() - dateTools.month() + dateTools.day())));
    }
    else if (rperiod == 'quarter') {
        end.value((lastDate));
        start.value((new Date(lastDate.getTime() - dateTools.month() * 3 + dateTools.day())));
    }
    else if (rperiod == 'halfyear') {
        end.value((lastDate));
        start.value((new Date(lastDate.getTime() - dateTools.halfyear() + dateTools.day())));
    }
    else if (rperiod == 'startyear') {
        end.value((lastDate));
        start.value((new Date(lastDate.getFullYear(), 0, 1)));
    }
    else if (rperiod == 'year') {
        end.value((lastDate));
        start.value((new Date(lastDate.getFullYear() - 1, lastDate.getMonth(), lastDate.getDate())));
    }
    else if (rperiod == 'prevyear') {
        end.value((new Date(lastDate.getFullYear(), 0, 1)));
        start.value((new Date(lastDate.getFullYear() - 1, 0, 1)));
    }
    else if (rperiod == 'prevprevyear') {
        end.value((new Date(lastDate.getFullYear() - 1, 0, 1)));
        start.value((new Date(lastDate.getFullYear() - 2, 0, 1)));
    }
    else if (rperiod == 'all') {
        end.value((lastDate));
        start.value(new Date(2000,1,1));
    }
    //PriceStepUpdate();
}
var update_time_limits = function (updateStart, updateEnd) {
    var startT = $('#startTime');
    var endT = $('#endTime');
    if (updateStart)
        $("#startTime").kendoTimePicker({
            min: "9:30",
            max: "23:00",
            format: "HH:mm",
            change: function () {
                if (dateTools.compareTextTime($('#startTime').val(), $('#endTime').val()) > 0) {
                    $('#endTime').val(dateTools.timeStrAddUnix($('#startTime').val(), 30 * 60000));
                }
                update_time_limits(false, true);
                choose_period();
            }
        }).data("kendoTimePicker");
    if (updateEnd)
        $("#endTime").kendoTimePicker({
            min: "10:30",
            max: "23:59",
            format: "HH:mm",
            change: function () {
                if (dateTools.compareTextTime($('#endTime').val(), $('#startTime').val()) < 0)
                    $('#startTime').val(dateTools.timeStrAddUnix($('#endTime').val(), -30 * 60000));
                update_time_limits(true, false);
                choose_period();
            }
        }).data("kendoTimePicker");
    $("#startTime").closest("span.k-timepicker").width(95);
    $("#endTime").closest("span.k-timepicker").width(95);
}
var choose_period = function () {
    var period = $('#period');
    if (period) {
        var start = $('#startDate').data("kendoDatePicker").value();
        var end = $('#endDate').data("kendoDatePicker").value();
        var sd = start.getTime();
        var ed = end.getTime();
        var startT = $('#startTime');
        var endT = $('#endTime');
        var timeEnable = $('#timeEnable');
        if (startT && endT && timeEnable && timeEnable.prop('checked')) {
            sd += dateTools.timeStrToUnix(startT.value);
            ed += dateTools.timeStrToUnix(endT.value);
            //alert(sd + ' ' + ed);
        }
        else {
            ed += 24 * 3600 * 1000;
        }
        var dt = ed - sd;
        //alert(dateTools.unixToTimeStr(dt));
        if (typeof (periodSelector) == 'undefined' || periodSelector == "Candles") {
            //period.val(dateTools.getPreferedPeriod(dt);
            $("#period").data("kendoDropDownList").value(dateTools.getPreferedPeriod(dt));
        }
        else {
            //           period.val(dateTools.getPreferedCPeriod(dt);
            $("#period").data("kendoDropDownList").value(dateTools.getPreferedCPeriod(dt));
        }
    }
}
function reload_with_params() {
    var allParamNames = ['ticker', 'ticker', 'ticker1', 'ticker2', 'period', 'period', 'timeEnable', 'priceStep', 'rperiod', 'startDate', 'endDate', 'timeEnable', 'startTime', 'endTime', 'visualVolume', 'oiEnable'];
    var url = document.URL.replace(/(.+\?)(.+)/, '$1');
    var prms = '';
    for (var i = 0; i < allParamNames.length; i++) {
        var elem = document.getElementById(allParamNames[i]);
        if (elem && elem.value) {
            if (prms != '')
                prms += '&';
            prms += allParamNames[i] + '=' + elem.value;
        }
    }
    window.open(url + prms, '_self');
}
//re = /ticker=\w+&/
//"http://localhost:4420/MXTicker/CandlesGraph?rperiod=week&ticker=GAZP&period=1".replace(re, 'ticker=XXXX&')
// Initialization
$(document).ready(function () {
    var start = $('#startDate');
    var end = $('#endDate');
    var timeEnable = $('#timeEnable');
    var startEndTimeCont = $('#startEndTimeCont');
    if (start)
        $("#startDate").kendoDatePicker({ format: "dd.MM.yyyy", change: onStartDateChange });
    if (end)
        $("#endDate").kendoDatePicker({ format: "dd.MM.yyyy", change: onEndDateChange });
    $("#portfolioDate").kendoDatePicker({ format: "dd.MM.yyyy" });
    $("#portfolioDate").closest("span.k-datepicker").width(95);
    $("#startDate").closest("span.k-datepicker").width(100);
    $("#endDate").closest("span.k-datepicker").width(100);
    $("#rperiod").width(135).kendoDropDownList();
    $("#period").width(80).kendoDropDownList();
    $("#period").width(80).kendoDropDownList();
    $("#smallPeriod").width(95).kendoDropDownList();
    $("#bigPeriod").width(95).kendoDropDownList();
    $("#multiperiod").width(75).kendoDropDownList();
    if (timeEnable) {
        update_timeEnable();
        $('#timeEnable').change(function () { update_timeEnable(); choose_period(); });
    }
    // Report period
    if ($('#rperiod').length) {
        var rperiod = $('#rperiod')[0];
        rperiod.onchange = function () {
            update_start_end(this.value);
            updatePeriod();
        }
        if (!start.val() || !end.val())
            update_start_end($('#rperiod').val());
        update_start_end_time();
    }
    // Replace ticker and period
    $('.graphLink').mousedown(function (e) {
        ticker = $('#ticker');
        if (ticker) {
            re = /ticker=\w+&/;
            this.href = this.href.replace(re, 'ticker=' + ticker.value + '&');
        }
        rperiod = $('#rperiod');
        if (rperiod) {
            re = /rperiod=\w+&/;
            this.href = this.href.replace(re, 'rperiod=' + rperiod.value + '&');
        }
        startDate = $('#startDate').data("kendoDatePicker").value();
        if (startDate) {
            this.href = this.href + '&startDate=' + startDate.value();
        }
        endDate = $('#endDate');
        if (endDate) {
            this.href = this.href + '&endDate=' + endDate.value();
        }
    });
});
function MoneyToStr(mon) {
    var mona = Math.abs(mon);
    let t = ~~(Math.log10(mona) / 3);
    if (t > 1)
        return drob(mon / Math.pow(10, t * 3), 2) + " " + ["тыс", "млн", "млрд", "трлн", "блн", "хул", "*", "*"][t - 1];
    return drob(mon, 4);
}
function RperiodFromPeriod(p) {
    r = "day";
    if (p > 1)
        r = "week";
    if (p > 15)
        r = "month";
    if (p > 60)
        r = "year";
    if (p > 1440)
        r = "all";
    return r;
}
function GetParentDivWidth(elem) {
    return $(elem).parent("div").width();
}
function InitCanvas(canvas, ticker, period, text) {
    var c = new CandleChart(canvas, true);
    c.SetMouseCallBacks();
    c.params = {
        ticker: ticker,
        period: period,
        rperiod: RperiodFromPeriod(period),
        count: 200
    };
    c.text = text;
    c.queryCandlesFull();
    return c;
}
function InitCanvas2(canvas, params, text, percent) {
    var c = new CandleChart(canvas, true);
    c.SetMouseCallBacks();
    c.params = params;
    c.text = text;
    c.queryCandlesFull();
    // c['hintMode'] = true;
    c['exParams'] = percent;
    return c;
}
function ShowMicexVol(canvas, year, year2, market, group) {
    var marketname = market == 3 ? 'Валютной секции' : market == 0 ? 'ММВБ' : 'FORTS';
    $.get('/api/reports/MarketCandlesVolume', { year: year, year2: year2, group: group, market: market },
        function (data) {
            $("#" + canvas).kendoChart({
                dataSource: {
                    data: data
                },
                title: {
                    text: 'Дневной  торгов (в млрд. руб.) на ' + marketname + ' за ' + year + ' год',
                },
                series: [{
                    type: "column",
                    aggregate: "avg",
                    field: "Volume",
                    categoryField: "Date",
                    gap: 0,
                    spacing: 0
                }],
                categoryAxis: {
                    labels: {
                        rotation: 325,
                        step: Math.max(1, Math.round(data.length / 50)),
                        template: "#=  jDateToStrD(value) #"
                    },
                    baseUnit: "weeks",
                    majorGridLines: {
                        visible: false
                    }
                },
                tooltip: {
                    visible: true,
                    template:
                        "<div><ul style='margin: 0; padding: 0px;list-style-type:none'> <li style='float: left'><b> Дата: ${jDateToStrD(category)}</b> </li><br> <li style='float: left'>${value} млрд. рублей</li></ul></div>"
                },
                valueAxis: {
                    line: {
                        visible: false
                    }
                }
            });
        }
    );
}
function ShowMicexRegions(canvas, year) {
    $.get('/api/reports/MicexRegions', { year: year },
        function (data) {
            $("#" + canvas).kendoChart({
                dataSource: {
                    data: data.list
                },
                title: {
                    text: 'Недельный  по компаниям (в млрд. руб.) ' + year + ' год',
                },
                legend: {
                    position: "top"
                },
                seriesDefaults: {
                    type: "area",
                    stack: true,
                    gap: 0,
                    spacing: 0
                },
                series: data.series,
                categoryAxis: {
                    field: "Date",
                    labels: {
                        rotation: 325,
                        step: 1,
                        template: "#=  jDateToStrD(value) #"
                    },
                    majorGridLines: {
                        visible: false
                    }
                },
                tooltip: {
                    visible: true,
                    template: "#= series.name #: #= MoneyToStr(value*1000000000) #"
                },
                valueAxis: {
                    line: {
                        visible: false
                    }
                }
            });
        }
    );
}
function RefreshIndexTablesMicex() {
    var TabNames = ['#DayVolumeLeaders', '#DayGrowLeaders', '#DayFallLeaders'];
    var i = $("#tabstrip").data("kendoTabStrip").select().index();
    $(TabNames[i]).data('kendoGrid').dataSource.read();
    kendo.ui.progress($(TabNames[i]), false);
}
function RefreshIndexTablesRts() {
    var TabNames2 = ['#DayVolumeLeadersRTS', '#DayIndexLeaders', '#DayCommodiesLeaders'];
    var i2 = $("#tabstrip2").data("kendoTabStrip").select().index();
    $(TabNames2[i2]).data('kendoGrid').dataSource.read();
    kendo.ui.progress($(TabNames2[i2]), false);
}
function RefreshIndexTablesCME() {
    var TabNames2 = ['#DayVolumeLeadersBinance', '#DayVolumeLeadersSPB'];
    var i2 = $("#tabstrip3").data("kendoTabStrip").select().index();
    $(TabNames2[i2]).data('kendoGrid').dataSource.read();
    kendo.ui.progress($(TabNames2[i2]), false);
}
function MicexLeaders(i) {
    var TabNames = ['DayVolumeLeaders', 'DayGrowLeaders', 'DayFallLeaders'];
    FillLeaderTable(TabNames[i], 0, i);
}
function CMELeaders(i) {
    var TabNames = ['DayVolumeLeadersBinance', 'DayVolumeLeadersSPB'];
    var idx = [20, 10]
    FillLeaderTable(TabNames[i], idx[i]);
}
function RtsLeaders(i) {
    switch (i) {
        case 0: FillLeaderTable('DayVolumeLeadersRTS', 1); break;
        case 1: FillLeaderTable('DayVolumeLeadersETC', 3); break;
        case 2: FillIndex('DayIndexLeaders', 0);
        case 3: FillIndex('DayCommodiesLeaders', 1);
    }
}
function InitIndexPageAbstract(tabs, callback) {
    $(tabs).kendoTabStrip({
        selectedIndex: 0,
        select: function (e) {
            callback($(e.item).index());
        },
        animation: {
            open: {
                effects: "No"
            }
        }
    }).select(0);
    $(tabs).data("kendoTabStrip").select(0);
}
function isMobile2() {
    var a = (navigator.userAgent || navigator.vendor || window.opera);
    if (/android.+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od|ad)|iris|kindle|lge |maemo|midp|mmp|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|symbian|treo|up\.(browser|link)|vodafone|wap|windows (ce|phone)|xda|xiino/i.test(a) || /1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(di|rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0, 4))) {
        return true;
    }
    return false;
}
function FillLeaderTable(table, market, type) {
    //    type = typeof type !== 'CandlestickChart' ?  type : 1;
    $('#' + table).kendoGrid({
        sortable: true,
        groupable: false,
        scrollable: false,
        dataSource: {
            transport: {
                read: {
                    url: sitePrefix + 'api/reports/Leaders', dataType: "Json", data: { market: market, dir: type },
                }
            }
        },
        columns: [{
            field: "ticker",
            title: 'Бумага',
            template: function (data) {
                return LinkToCandles({ period: type === "FootPrint" ? 5 : 1, rperiod: 'day', ticker: data.ticker }, data.name.substring(0, 25), type);
            }
        }, {
            field: "cls",
            title: 'Цена',
            template: function (data) {
                return ColorText(data.percent, drob(data.cls, 4), 'right', data.color);
            }
        }, {
            field: "volume",
            title: type === "FootPrint" ? 'Сделок' : 'Объем',
            template: '<span style="float:right">#= MoneyToStr(volume) #</span>'
        }, {
            field: "percent",
            title: 'Изм%',
            template: '<span style="float:right">#= percent.toFixed(2) #</span>'
        }/*, {
            field: "bid",
            title: 'ASK%',
            template: '<span style="float:right">#= bid.toFixed(1) #</span>'
        }, */]
    });
    kendo.ui.progress($('#' + table), false);
}
function FillIndex(table, type) {
    $('#' + table).kendoGrid({
        sortable: true,
        groupable: false,
        scrollable: false,
        dataSource: {
            transport: {
                read: {
                    url: sitePrefix + 'jsonLastInfoIndexEx?type=' + type,
                    dataType: "Json"
                }
            }
        },
        columns: [
            {
                field: "ticker",
                title: 'Бумага',
                template: function (data) {
                    return LinkToCandles({ period: 1, ticker: data.ticker }, data.shortname);
                }
            },
            {
                field: "cls",
                title: 'Значение',
                template: function (data) {
                    return ColorText(data.percent, data.cls, 'right');
                }
            }, {
                field: "percent",
                title: 'Изм%',
                template: '<span style="float:right">#= percent.toFixed(2) #</span>'
            },
        ]
    });
    kendo.ui.progress($('#' + table), false);
}



function RecommendationColor(text) {
    var map = {};

    map[-3] = "шорт открыть";
    map[3] = "лонг открыть";

    map[-2] = "шорт держать";
    map[2] = "лонг держать";

    map[-1] = "шорт сократить";
    map[1] = "лонг сократить";


    return text < 0 ? '<font color="red">' + map[text] + '</font >' : '<font color="green">' + map[text] + '</font >';
}
function RecommendationColorShort(text) {
    var map = {};

    map[-3] = "шорт откр";
    map[3] = "лонг откр";

    map[-2] = "шорт держ";
    map[2] = "лонг держ";

    map[-1] = "шорт сокр";
    map[1] = "лонг сокр";


    return text < 0 ? '<font color="red">' + map[text] + '</font >' : '<font color="green">' + map[text] + '</font >';
}
function ReportBarometer(grid, market) {
    $(grid).kendoGrid({
        toolbar: ["excel"],
        excel: { fileName: "Barometer_{0}.xlsx".format(dateTools.toStr(new Date())), filterable: false },
        sortable: true,
        groupable: false,
        scrollable: false,
        //      height: "300px",
        dataSource: {
            transport: {
                read: {
                    url: sitePrefix + "api/Reports/Barometer",
                    data: { market: market },
                    dataType: "Json"
                }
            }
        },
        columns: [{
            field: "ticker",
            title: 'Наименование',
            template: function (data) {
                return LinkToCandles({ rperiod: 'year', ticker: data.ticker }, data.tickerName);
                //return '<a href="/CandlestickChart?rperiod=year&ticker=' + data.ticker + '">' + data.tickerName + '</a>';
            }
        }, {
            field: "price",
            title: 'Цена',
            template: '<span style="float:right">#= opn #</span>'
        },
        {
            field: "rec1",
            title: 'Краткосрочно(часы)',
            template: '#= RecommendationColor(data.rec1)  #'
        },
        {
            field: "rec2",
            title: 'Среднесрочно(дневки)',
            template: '#= RecommendationColor(data.rec2)  #'
        },
        {
            field: "rec3",
            title: 'Дальнесрочно(недельки)',
            template: '#= RecommendationColor(data.rec3)  #'
        },
        {
            field: "news",
            title: 'Поиск новостей',
            template: function (data) {
                return '<a href="https://www.google.ru/search?q=' + data.tickerName + '&newwindow=1&tbm=nws">' + data.tickerName + '</a>';
            }
        }]
    });
}
function ReportBarometerMobile(grid) {
    $(grid).kendoGrid({
        sortable: true,
        groupable: false,
        scrollable: false,
        //      height: "300px",
        dataSource: {
            transport: {
                read: {
                    url: sitePrefix + "api/Reports/Barometer",
                    dataType: "Json"
                }
            }
        },
        columns: [{
            field: "ticker",
            title: 'Тикер',
            template: function (data) {
                return LinkToCandles({ rperiod: 'year', ticker: data.ticker }, data.ticker);
                //  return '<a href="/CandlestickChart?rperiod=year&ticker=' + data.ticker + '">' + data.ticker + '</a>';
            }
        }, {
            field: "price",
            title: 'Цена',
            template: '<span style="float:right">#= opn #</span>'
        },
        {
            field: "rec1",
            title: 'Крат.(часы)',
            template: '#= RecommendationColorShort(data.rec1)  #'
        },
        {
            field: "rec2",
            title: 'Сред.(дни)',
            template: '#= RecommendationColorShort(data.rec2)  #'
        },
        {
            field: "rec3",
            title: 'Даль.(нед.)',
            template: '#= RecommendationColorShort(data.rec3)  #'
        }]
    });
}

var item;
function ShowMarketMap(div, urlParams) {
    let treeMap = $("#" + div);
    if (treeMap.data("kendoTooltip")) {
        treeMap.data("kendoTooltip").destroy();
    }
    if (treeMap.getKendoTreeMap()) {
        treeMap.getKendoTreeMap().destroy();
        treeMap.empty();
        treeMap.unbind();
    }
    treeMap.kendoTreeMap({
        dataSource: {
            transport: {
                read: {
                    url: sitePrefix + "api/reports/MarketMap",
                    data: urlParams,
                    dataType: "json"
                }
            },
            schema: {
                model: {
                    children: "items"
                }
            }
        },
        valueField: "value",
        textField: "name",
        dataBound: function (e) {
            if (e.node) {
                var element = this.findByUid(e.node.uid);
            }
        },
        itemCreated: function (e) {
            e.element.css("color", "#222");
            e.element.css("text-align", "center");
        }
    }).on("click", ".k-leaf, .k-treemap-title", function (e) {
        var item = treeMap.data("kendoTreeMap").dataItem($(this).closest(".k-treemap-tile"));
        if (item.ticker) {
            if (urlParams.startDate) {
                urlParams.ticker = item.ticker;
                OpenCandles(urlParams);
            }
            else
                OpenCandles({ rperiod: "day", period: 5, ticker: item.ticker });
        }
        else {
            var r = "";
            for (var i = 0; i < item.items.length; i++)
                r += ((r != "") ? "," : "") + item.items[i].ticker;
            if (!isMobile2())
                window.open('MultiCandles?period={1}&tickers={0}'.format(r, urlParams.startDate ? 1440 : 15));
        }
    });
    treeMap.kendoTooltip({
        filter: ".k-leaf,.k-treemap-title",
        position: "right",
        show: function (e) {
            params = CloneObject(urlParams);
            params.ticker = item.ticker;
            try {
                InitCanvas2('myCanvas', params, item.name1, {
                    percent: item.percent,
                    volume: item.value,
                    ask: item.ask
                });
            }
            catch (e) { }
        },
        content: function (e) {
            var treemap = treeMap.data("kendoTreeMap");
            item = treemap.dataItem(e.target.closest(".k-treemap-tile"));
            if (item.cls != null) {
                return '<canvas id="myCanvas{0}" width="{1}" height="{2}" style="width:{1}px;height:{2}px;"></canvas>'.format('', 350, 200);
            }
            else
                return "<p><b>{0}</b></p><p><b>Объем:</b>{2}</p>".format(item.name, item.cls, kendo.toString(item.value, "n0"));
        }
    });
}
function ReportLeaders() {

    var start = toIsoString("#startDate");
    var end = toIsoString("#endDate");


    $("#grid").kendoGrid({
        sortable: true,
        groupable: false,
        scrollable: false,
        toolbar: ["excel"],
        excel: {
            allPages: true,
            fileName: "{0}({3})_{1}-{2}.xlsx".format(
                $('#report').val(), $('#startDate').val(), $('#endDate').val(), $('#top').val()),
            filterable: true
        },
        pageable: {
            refresh: true,
            pageSizes: true,
            buttonCount: 5,
            pageSize: 25
        },
        //      height: "300px",
        dataSource: {
            transport: {
                read: {
                    url: '/api/reports/leaders',
                    data:
                    {
                        market: $('#marketList').data("kendoDropDownList") .value(),
                        top: $('#top').val(),
                        startDate: start,
                        endDate: end
                    },
                    dataType: "Json"
                }
            }
        },
        columns: [
            {
                field: "ticker",
                title: 'Бумага',
                template: function (data) {
                    return LinkToCandles({
                        period: 1440,
                        startDate: toIsoString("#startDate"),
                        endDate: toIsoString('#endDate'),
                        ticker: data.ticker
                    }, data.name.substring(0, 25));
                }
            }, {
                field: "opn",
                title: 'Открытие',
                template: function (data) {
                    return ColorText(data.percent, drob(data.opn, 4), 'right', data.color);
                }
            }, {
                field: "cls",
                title: 'Закрытие',
                template: function (data) {
                    return ColorText(data.percent, drob(data.cls, 4), 'right', data.color);
                }
            }, {
                field: "volume",
                title: 'Объем',
                template: '<span style="float:right">#= MoneyToStr(volume) #</span>'
            }, {
                field: "percent",
                title: 'Изм%',
                template: '<span style="float:right">#= percent.toFixed(2) #</span>'
            }, {
                field: "bid",
                title: 'ASK%',
                template: '<span style="float:right">#= drob(bid,3) #</span>'
            }/*,
            {
                field: "name",
                title: 'Поиск новостей',
                template: function (data) {
                    return '<a href="https://www.google.ru/search?q=' + data.name + '&newwindow=1&tbm=nws">{0}</a>'.format(data.name);
                }
            }*/]
    });
}
function isHidden(el) {
    var style = window.getComputedStyle(el);
    return (style.visibility == "hidden");
}
function ClusterParams() {
    return jQuery.param(ControlsToParamsFootPrint(viewModel));
}
function CandlestoClusterParams() {
    return jQuery.param(ControlsToParamsFootPrint(viewModel));
}
function CandlesParams() {
    return jQuery.param(ControlsToParamsTicker(viewModel.controls));
}
function PairToCandles(n) {
    req = 'ticker=' + encodeURIComponent($('#ticker' + n).value)
    req += '&startDate=' + $('#startDate').val();
    req += '&endDate=' + $('#endDate').val();
    req += '&period=' + $('#period').val();
    req += '&rperiod=' + $('#rperiod').val();
    return (req);
}
function ReportVolumeSearch() {
    $("#grid").kendoGrid({
        sortable: true,
        groupable: false,
        scrollable: false,
        toolbar: ["excel"],
        excel: {
            allPages: true,
            fileName: "VolumeSearch_{0}.xlsx".format($('#ticker').val()),
            filterable: true
        },
        //      height: "300px",
        dataSource: {
            transport: {
                read: {
                    url: '/api/Clusters/VolumeSearch?' + ClusterParams(),
                    dataType: "Json"
                }
            }
        },
        columns: [
            {
                field: "Time",
                title: 'Time',
                template: '<span style="float:right">#= Time.replace("T"," ") #</span>'
            },
            {
                field: "Price",
                title: 'Price'
            },
            {
                field: "MaxVolume",
                title: 'MaxVolume'
            }, {
                field: "TotalVolume",
                title: 'TotalVolume'
            }, {
                field: "BarSize",
                title: 'BarSize'
            }, {
                field: "Trades",
                title: 'Trades'
            }, {
                field: "Ask",
                title: 'Ask'
            }, {
                field: "Bid",
                title: 'Bid'
            }, {
                field: "Delta",
                title: 'Delta'
            }
        ]
    });
}
function ReportVolumeSplash(grid, bigPeriod, smallPeriod, market, splash) {


    if (typeof (bigPeriod) == 'undefined')
        bigPeriod = $('#bigPeriod').val();
    if (typeof (smallPeriod) == 'undefined')
        smallPeriod = $('#smallPeriod').val();

    if (typeof (market) == 'undefined')
        market = 0;
    if (typeof (splash) == 'undefined')
        splash = 3;


    $(grid).kendoGrid({
        sortable: true,
        groupable: false,
        scrollable: false,
        toolbar: ["excel"],
        excel: {
            allPages: true,
            fileName: "Всплески({0})_{1}-{2}.xlsx".format(dateTools.toStr(new Date()),
                $('#bigPeriod').val(), $('#smallPeriod').val()),
            filterable: true
        },
        //      height: "300px",
        dataSource: {
            transport: {
                read: {
                    url: sitePrefix + 'api/reports/VolumeSplash',
                    data: { bigperiod: bigPeriod, smallPeriod: smallPeriod, market: market, splash: splash },
                    dataType: "Json"
                }
            }
        },
        columns: [{
            field: "ticker",
            title: 'Бумага',
            template: function (data) {
                if (IsPayed)
                    return LinkToCandles({ rperiod: 'year', ticker: data.ticker }, data.ticker);
                //return '<a href="/CandlestickChart?rperiod=year&ticker=' + data.ticker + '">' + data.ticker + '</a>';
                else
                    return '<a href="' + sitePrefix + 'Payment">Открыто в премиум доступе</a>';
            }
        }, {
            field: "avgval",
            title: 'Средний объем',
            template: '<span style="float:right">#= avgval.toFixed(0) #</span>'
        }, {
            field: "max",
            title: 'Максимальный объем',
            template: '<span style="float:right">#= max.toFixed(0) #</span>'
        }, {
            field: "huge",
            title: 'Всплеск',
            template: '<span style="float:right">#= huge.toFixed(1) #</span>'
        }, {
            field: "cls",
            title: 'Последняя цена',
            template: '<span style="float:right">#= cls #</span>'
        }, {
            field: "name",
            title: 'Поиск новостей',
            template: function (data) {
                if (IsPayed)
                    return '<a href="https://www.google.ru/search?q=' + data.name + '&newwindow=1&tbm=nws">' + data.name + '</a>';
                else
                    return 'Ссылка в премиум доступе';
            }
        }]
    });
}
function ReportVolumeSplashMobile(grid, bigPeriod, smallPeriod) {
    if (typeof (bigPeriod) == 'undefined')
        bigPeriod = $('#bigPeriod').val();
    if (typeof (smallPeriod) == 'undefined')
        smallPeriod = $('#smallPeriod').val();
    $(grid).kendoGrid({
        sortable: true,
        groupable: false,
        scrollable: false,
        //      height: "300px",
        dataSource: {
            transport: {
                read: {
                    url: sitePrefix + 'api/Reports/VolumeSplash?bigPeriod={0}&smallPeriod={1}'.format(bigPeriod, smallPeriod),
                    dataType: "Json"
                }
            }
        },
        columns: [{
            field: "ticker",
            title: 'Бумага',
            template: function (data) {
                if (IsPayed)
                    return LinkToCandles({ rperiod: 'year', ticker: data.ticker }, data.ticker);
                //return '<a href="/CandlestickChart?rperiod=year&ticker=' + data.ticker + '">' + data.ticker + '</a>';
                else
                    if (isMobile2())
                        return '<a href="#Login">Открыто в премиум доступе</a>';
                    else
                        return '<a href="' + sitePrefix + 'Payment">Открыто в премиум доступе</a>';
            }
        }, {
            field: "max",
            title: 'Макс. объем',
            template: '<span style="float:right">#= max.toFixed(0) #</span>'
        }, {
            field: "huge",
            title: 'Всплеск',
            template: '<span style="float:right">#= huge.toFixed(1) #</span>'
        }, {
            field: "cls",
            title: 'Цена',
            template: '<span style="float:right">#= cls #</span>'
        }
        ]
    });
}
function ReportTopOrdersMobile(grid, ticker, bigPeriod) {
    $(grid).kendoGrid({
        sortable: true,
        groupable: false,
        scrollable: false,
        toolbar: ["excel"],
        excelExport: function (e) {
            var sheet = e.workbook.sheets[0];
            for (var rowIndex = 1; rowIndex < sheet.rows.length; rowIndex++) {
                var row = sheet.rows[rowIndex];
                row.cells[4].format = "dd.MM.yyyy hh:mm:ss"
            }
        },
        excel: {
            allPages: true,
            fileName: "TopOrders_{0}_{1}.xlsx".format(ticker, bigPeriod),
            filterable: true
        },
        dataSource: {
            transport: {
                read: {
                    url: sitePrefix + 'api/Reports/TopOrders?' + jQuery.param({ ticker: ticker, bigPeriod: bigPeriod }),
                    dataType: "Json"
                }
            },
            schema: {
                model: {
                    id: "tradeDate",
                    fields: {
                        tradeDate: {
                            type: "date",
                            parse: function (data) { return new Date(data); }
                        }
                    }
                }
            }
        },
        columns: [
            {
                field: "quantity",
                title: 'Кол-во',
                template: function (data) {
                    //              alert(                                data.tradeDate);
                    var date = data.tradeDate;// (new Date(data.tradeDate + '+0300'));
                    return LinkToCandles(
                        {
                            ticker: ticker,
                            period: 0,
                            rperiod: 'custom',
                            startDate: jDateToStrD(date),
                            endDate: jDateToStrD(date),
                            timeEnable: true,
                            startTime: jDateToStrT(date),
                            endTime: jDateToStrT(date)
                        }, data.quantity);
                }
            },
            {
                field: "Direction",
                title: 'Тип',
                template: function (data) {
                    if (data.Direction == 0) return '<font color="red">Продажа</font >';
                    else return '<font color="green">Покупка</font >';
                }
            }, {
                field: "price",
                title: 'Цена',
                template: '<span style="float:right">#= data.price #</span>'
            }, {
                field: "volume",
                title: 'Объем',
                template: '<span style="float:right">#=  Math.round(data.volume) #</span>'
            }, {
                field: "tradeDate",
                title: 'Дата',
                template: '<span style="float:right">#= jDateToStrD(tradeDate) + " " + jDateToStrT(tradeDate) #</span>'
            }]
    });
}
var optionData;
var lastOptionName;
var lastOptionText;
function onOptionChanged() {
    lastOptionName = $('#OptionNames').val();
    lastOptionText = $('#OptionNames').find('option:selected').text();
    $.get('/api/Reports/Options', { name: lastOptionName }, function (data) {
        optionData = data;
        $("#visualization").kendoChart({
            dataSource: {
                data: optionData
            },
            title: {
                text: 'Улыбка волатильности для серии опциона ' + lastOptionText,
            },
            series: [{
                type: "area",
                field: "volatility",
                categoryField: "strike"
            }],
            categoryAxis: {
                labels: {
                    rotation: 325
                },
                majorGridLines: {
                    visible: false
                }
            },
            tooltip: {
                visible: true,
                template:
                    "Страйк:${category} Волатильность:${value}"
            },
            valueAxis: {
                line: {
                    visible: false
                }
            }
        });
        $("#chart_div").kendoChart({
            dataSource: {
                data: optionData
            },
            title: {
                text: 'Открытые позиции для серии опциона ' + lastOptionText,
            },
            legend: {
                position: "top"
            },
            seriesDefaults: {
                type: "column"
            },
            series: [{ field: "openposcall", name: "Put", color: "rgba(215, 84, 66, 1)" }, { field: "openposput", name: "Call", color: "rgba(107, 165, 131, 1)" }],
            categoryAxis: {
                labels: {
                    rotation: 325
                },
                field: "strike",
                majorGridLines: {
                    visible: false
                }
            },
            tooltip: {
                visible: true,
                template:
                    "Страйк:${category} ${series.name}:${value}"
            },
            valueAxis: {
                line: {
                    visible: false
                }
            }
        });
        $("#chart_div2").kendoChart({
            dataSource: {
                data: optionData
            },
            title: {
                text: 'Объем торгов для серии опциона ' + lastOptionText,
            },
            legend: {
                position: "top"
            },
            seriesDefaults: {
                type: "column"
            },
            series: [{ field: "valcall", name: "Put", color: "rgba(215, 84, 66, 1)" }, { field: "valput", name: "Call", color: "rgba(107, 165, 131, 1)" }],
            categoryAxis: {
                labels: {
                    rotation: 325
                },
                field: "strike",
                majorGridLines: {
                    visible: false
                }
            },
            tooltip: {
                visible: true,
                template:
                    "Страйк:${category} ${series.name}:${value}"
            },
            valueAxis: {
                line: {
                    visible: false
                }
            }
        });
    });
}
function isMobile() {
    return false;
    var a = (navigator.userAgent || navigator.vendor || window.opera);
    if (/android.+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od|ad)|iris|kindle|lge |maemo|midp|mmp|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|symbian|treo|up\.(browser|link)|vodafone|wap|windows (ce|phone)|xda|xiino/i.test(a) || /1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(di|rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0, 4))) {
        return true;
    }
    return false;
}
function InitTickerList(ticker, type) {
    $(ticker).autocomplete({
        source: function (request, response) {
            $.get(
                '/api/common/findbymask', {
                type: type,
                mask: request.term
            },
                function (data) {
                    response(data);
                });
        },
        select: function (event, ui) {
            MouseAutoComplete(ticker, event, ui);
            queryCandlesGraph(false);
            return false;
        },
        minLength: 1
    });
}
function MenuAddMain(menu) {
    menu.append([
        {
            text: "Помощь",
            items: [
                { url: "https://youtu.be/zGPTz5oXljc", text: "Видеоурок о сервисе анализа объемов" },
                { url: "https://youtu.be/c3SPiXQEvsk", text: "Видеоурок о оптимизации портфеля" },
                { url: "https://youtu.be/fHfa-UAeuHo", text: "Что такое Фрактальный Барометр" },
                { url: "10-top-features.pdf", text: "10 уникальных возможностей графиков Ru-ticker.com" },
                { url: "http://ru-ticker.com/Documentation", text: "Как работать с сервисом" },
                { url: "Search?needle=Склеен", text: "Склеенные графики фьючерсов" }]
        }
    ]);
}
function MenuAddAdmin(menu) {
    menu.append([
        {
            text: "Кабинет",
            items: [
                //    { url: "/Admin/Payments", text: "Платежи" },
                { url: "/Admin/PaymentsTable", text: "Платежи" },
                { url: "/Admin/UsersTable", text: "Пользователи" },
                //{ url: "/Admin/Cached", text: "Кешированные объекты" },
                { url: "/Admin/PaymentStat", text: "Статистика платежей" },
                { url: "/Admin/UserStat", text: "Статистика пользователей" },
                { url: "/Admin/Cabinet", text: "Информация" }]
        }
    ]);
}
function historyItem() {
    return menu.element.children("li").eq(menu.element.children("li").length - 1);
}
function clenupClusterHistory() {
    var items = historyItem().find("ul:first").children("li");
    for (var i = 0; i < items.length; i++)
        menu.remove(items[i]);
}
function ConvertMenuItem(item) {
    var attrs = '';
    for (var attr in item)
        if (!(attr in ['text', 'items', 'url', 'encoded'])) {
            attrs += '{0}="{1}" '.format(attr, item[attr]);
        }
    var text = '<span {0}>{1}</span>'.format(attrs, item.text);
    var res = CloneObject(item);
    res.text = text;
    res.encoded = false;
    return res;
}
function ConvertMenuItems(items) {
    for (var i = 0; i < items.length; i++)
        items[i] = ConvertMenuItem(items[i]);
    return items;
}
function MenuAddCluster(menu) {
    if (menu != undefined)
        menu.append([{
            text: "<b>Доп. инструменты</b>",
            encoded: false,
            items:
                ConvertMenuItems([
                    { text: "Скачать свечной график как CSV Файл", onclick: "NP.GetCSV()" },
                    { text: "Ссылка на скриншот", onclick: "freezeCanvas()" },
                    { text: "URL на текущий график", onclick: "window.open('/FootPrint?' + (ClusterParams()))" },
                    { text: "Перейти на горизонтальные объемы", onclick: "window.open('/CandlestickChart?VisualVolume=true&' + (ClusterParams().replace('ticker', 'ticker').replace('period', 'period')))" },
                    { text: "Пометки", onclick: "$('#window1').data('kendoWindow').open();" }
                ])
        },
        { text: "История" }
        ]);
}
function PairParams() {
    return jQuery.param(c.params);
}
function MenuAddPair(menu) {
    if (menu != undefined)
        menu.append([
            {
                text: "<b>Доп. инструменты</b>", encoded: false,
                items:
                    ConvertMenuItems([
                        { text: "Скачать скриншот", onclick: "c.freezeCanvas()" },
                        { text: "Ссылка на текущий график", onclick: "window.open('/CandlestickChart/PairTrading?' + PairParams())" },
                        { text: "Свечной график для Портфеля 1", onclick: "window.open('/CandlestickChart?' + PairToCandles(1))" },
                        { text: "Свечной график для Портфеля 2", onclick: "window.open('/CandlestickChart?' + PairToCandles(2))" },
                    ])
            }
        ]);
}
function MenuAddCandles(menu) {
    if (menu != undefined)
        menu.append([
            {
                text: "<b>Доп. инструменты</b>", encoded: false,
                items: ConvertMenuItems([
                    { text: "Скачать CSV Файл", onclick: "c.GetCSV()" },
                    { text: "Скачать скриншот", onclick: "c.freezeCanvas()" },
                    { text: "URL на текущий график", onclick: " window.open('/CandlestickChart?' + (CandlesParams()))" },
                    { text: "Перейти на FootPrint", onclick: " window.open('/FootPrint?' + (CandlestoClusterParams()))" },
                ])
            }
        ]);
}
function MenuAddPortfolio(menu) {
    if (menu != undefined)
        menu.append([
            {
                text: "<b>Доп. инструменты</b>", encoded: false,
                items: ConvertMenuItems([
                    { text: "График текущего Портфеля", onclick: "GetPortfolioGraph()" },
                    { text: "Сравнение доходности с индексом ММВБ", onclick: "GetPortfolioCompare()" },
                    { text: "Графики всех бумаг Портфеля", onclick: "GetPortfolioMultiCandles()" },
                    { text: "Оптимизировать доли бумаг в Портфеле", onclick: "GetPortfolioOptimization()" },
                ])
            }
        ]);
}
function MenuAddMarkovitz(menu) {
    if (menu != undefined)
        menu.append([
            {
                text: "<b>Доп. инструменты</b>", encoded: false,
                items: ConvertMenuItems([
                    { text: "График цены Портфеля", onclick: "GetCandlesChart()" },
                    { text: "Сравнение доходности с  ММВБ", onclick: "Correlation()" },
                ])
            }
        ]);
}
function CommonLayout() {
    kendo.culture("ru");
    $(document).ready(function () {
        $("#needle").autocomplete({
            source: function (request, response) {
                $.get(
                    '/api/common/findbymask', {
                    type: "Candles",
                    mask: request.term
                },
                    function (data) {
                        response(data);
                    });

            },
            select: function (event, ui) {
                MouseAutoComplete('needle', event, ui);
                return false;
            },
            minLength: 1
        });
        $("#menu").kendoMenu().show();
        menu = $("#menu").kendoMenu().data("kendoMenu");
        m = $("#menu").kendoMenu().data("kendoMenu");
        //        MenuAddMain(menu);
        if (AdminLogged)
            MenuAddAdmin(menu);
    });
}
function IndexScript() {
    if (isMobile2() == true)
        window.location = '/Mobile';
    InitIndexPageAbstract("#tabstrip", MicexLeaders);
    InitIndexPageAbstract("#tabstrip2", RtsLeaders);
    InitIndexPageAbstract("#tabstrip3", CMELeaders);

    //MicexLeaders("#tabstrip");

    ShowMarketMap('treemap', { plain: true });
    var tickers = [['Si', 'USD/RUR FUT'], ['RI', 'Индекс РТС'],/* ['USDT-ETH', 'Ethereum'], */['CNYRUB_TOM', 'CNY/RUR(юань)'], ['MX', 'Micex'], ['BR', 'Нефть'], ['BTCUSDT', 'Bitcoin']];
    //var tickers = [ ['RI', 'Индекс РТС'], ['USDRUBMEIB', 'Рубль/USD'], ['BR', 'Нефть']];
    can = new Array(tickers.length);
    var x = document.getElementById('graphics').clientWidth;
    var w = Math.round(x / 2 - 8);
    var h = Math.round(w * 0.55);
    var graphics = "";
    for (j = 0; j < tickers.length; j++)
        graphics += '<canvas id="myCanvas{0}" width="{1}" height="{2}" style="width:{1}px;height:{2}px;"></canvas>'.format(j, w, h);
    document.getElementById("graphics").innerHTML = '<center>{0}</center>'.format(graphics);
    for (j = 0; j < tickers.length; j++)
        can[j] = InitCanvas('myCanvas' + j, tickers[j][0], 15, tickers[j][1]);

    UpdateIndex = function () {
         {
            if (MarketWorks() == 2) {
                RefreshIndexTablesMicex();
                $('#treemap').data('kendoTreeMap').dataSource.read();
                //ShowMarketMap('treemap', { plain: true });
            }
            RefreshIndexTablesRts();
            RefreshIndexTablesCME();
        }
    }
    setInterval(UpdateIndex, 5000);
}
function MouseAutoComplete(name, event, ui) {
    var origEvent = event;
    while (origEvent.originalEvent !== undefined)
        origEvent = origEvent.originalEvent;
    if (origEvent.type == 'click')
        document.getElementById(name).value = ui.item.value;
}
function GetPortfolioLine(grid) {
    var displayedData = $(grid).data().kendoGrid.dataSource.view();
    if (displayedData.length > 3)
        return displayedData[displayedData.length - 3].ticker;
    return '';
}
function ShowPotfolio(grid, number, options) {
    var x = $(grid).kendoGrid({
        sortable: false,
        groupable: false,
        scrollable: false,
        mobile: true,
        dataSource: {
            transport: {
                read: {
                    url: "/api/Portfolio/GetShares?portfolionumber=" + number,
                    dataType: "Json"
                }
            }
        },
        columns: [{
            field: "ticker",
            title: "Бумага",
            template: function (data) {
                if (data.ticker != null) {
                    if (options.externalLink)
                        return '<a target="_blank" href="CandlestickChart?period=1440&rperiod=custom&startDate={0}&ticker={1}">{2}</a>'.format(options.date, encodeURIComponent(data.ticker), data.name);
                    else
                        return "<a href='#' onclick='UpdateTickerBox(\"{0}\",\"{1}\")'>{1}<div></div></a>".format(data.ticker, data.name);
                } else
                    return '<b>' + data.name + '</b>';
            }
        },
        {
            field: "price",
            title: "Цена покупки",
            template: function (data) {
                if (data.price != null)
                    return ColorText(0, data.price.toFixed(4), "right"); else return "";
            }
        }, {
            field: "currprice",
            title: "Текущая цена",
            template: function (data) {
                if (data.currprice != null)
                    return ColorText(0, data.currprice.toFixed(4), "right"); else return "";
            }
        }, {
            field: "quantity",
            title: "Количество",
            template: function (data) {
                if (data.quantity != null)
                    return ColorText(0, data.quantity, "right"); else return "";
            }
        }, {
            field: "buycost",
            title: "Вложено",
            template: function (data) {
                if (data.buycost != null)
                    return ColorText(0, data.buycost.toFixed(2), "right"); else return "";
            }
        }, {
            field: "nowcost",
            title: "Текущая стоимость",
            template: function (data) {
                if (data.nowcost != null)
                    return ColorText(data.profit, data.nowcost.toFixed(2), "right"); else return "";
            }
        }, {
            field: "profit",
            title: "Прибыль",
            template: function (data) {
                if (data.profit != null)
                    return ColorText(data.profit, data.profit.toFixed(2), "right"); else return "";
            }
        }, {
            field: "profit",
            title: "Доходность",
            template: function (data) {
                if (data.buycost != null)
                    return ColorText(data.profit, (data.profit * 100 / Math.abs(data.buycost)).toFixed(2) + "%", "right");
                return "";
            }
        }]
    });
    kendo.ui.progress($(grid), false);
}
multiscale = isMobile2() ? 1.5 : 1;
function GetMultiSizes(multidiv) {
    if (window.innerWidth > window.innerHeight)
        return {
            w: Math.round((window.innerWidth - 30 / multiscale) / multidiv[0]),
            h: Math.round(Math.max(120, window.innerHeight - document.getElementById('graphics').getBoundingClientRect().top) / multidiv[1]) - 4
        }
    else
        return {
            w: Math.round((window.innerWidth - 30 / multiscale) / 2),
            h: Math.round(Math.max(120, window.innerHeight - document.getElementById('graphics').getBoundingClientRect().top) / 5) - 4
        }
}
function InitMultiPage(names, descritions) {
    dividers = [[1, 1], [1, 2], [1, 3], [2, 2], [3, 2], [3, 2], [3, 3], [3, 3], [3, 3], [4, 3], [4, 3], [4, 3], [4, 4], [4, 4], [4, 4], [4, 4]];
    var i = $('#period').val();
    var l = names.length;
    multidiv = dividers[Math.min(l, dividers.length) - 1];
    can = new Array(l);
    var graphics = "";
    var size = GetMultiSizes(multidiv);
    for (j = 0; j < l; j++)
        graphics += '<canvas id="myCanvas{0}" width="{1}" height="{2}" style="width:{3}px;height:{4}px;"></canvas>'.format(j, size.w * multiscale, size.h * multiscale, size.w, size.h);
    document.getElementById("graphics").innerHTML = '<center>{0}</center>'.format(graphics);
    for (j = 0; j < l; j++) {
        can[j] = InitCanvas('myCanvas{0}'.format(j), names[j], i, descritions[j]);
    }
}
function MultiResize() {
    var size = GetMultiSizes(multidiv);
    for (i = 0; i < can.length; i++) {
        can[i].resize(size.w, size.h, multiscale);
        can[i].ComputeSizes();
        can[i].drawcanvas();
    }
}
function ForbiddenTicker(ticker) {
    if (extraTickers.includes(ticker) && !IsPayedPlus)
        return true;
    return !(IsPayed || (ticker == 'GAZP' || ticker.indexOf('.') != -1));
}
function CheckPayedTicker() {
    return CheckPayedTickerString($('#ticker').val());
}
function CheckPayedTickerString(ticker) {
    if (ForbiddenTicker(ticker)) {
        var message = IsPayed ? 'Для использования западных рынков необходима доплата по <a href="/PaymentCME">ссылке</a>' :
            'Бесплатным пользователям <br> доступен только Газпром<br>Оформить подписку можно по <a href="/Payment">ссылке</a>';
        $.when(kendo.ui.ExtAlertDialog.show({
            title: "Платная функция",
            message: message,
            icon: "k-ext-information"
        }))
        return 'GAZP';
    }
    return ticker;
}
function ParmasFromCandle(dt, period) {
    var dt2 = new Date(dt.getTime() + (60000 * period - 1));
    var newperiod = 0;
    if (period >= 1440)
        newperiod = 5;
    else if (period >= 120)
        newperiod = 1;
    else
        newperiod = 0;
    var tickerparams =
    {
        startDate: dateTools.toStr(dt),
        endDate: dateTools.toStr(dt),
        period: newperiod,
        timeEnable: true,
        startTime: TimeFormat(dt),
        endTime: TimeFormat(dt2)
    }
    return tickerparams;
}
function periodToStr(period) {
    let p = parseInt(period);
    switch (p) {
        case 1440:
            return "1 день";
        case 1440 * 7:
            return "1 нед";
        case 30000:
        case 90000:
        case 180000:
            return p / 30000 + " мес";
        default:
            return (p < 60) ? (p + " мин") : (p / 60 + " час");
    }
}

function getMondayOfWeek(date) {
    const days = (date.getDay() + 6) % 7; // получаем номер дня недели (0 - воскресенье, 1 - понедельник, ..., 6 - суббота)
    const resultDate = new Date(date); // создаем новый объект даты для избежания изменения исходной даты
    resultDate.setDate(date.getDate() - days); // вычитаем указанное количество дней
    return resultDate;
}


function dateDelimeter(prevdate, date, period) {
   
    switch (parseInt(period)) {
        case 1440:
            return getMondayOfWeek(date).getTime() !== getMondayOfWeek(prevdate).getTime();
        case 1440 * 7:
            return date.getMonth() != prevdate.getMonth();
        case 30000:
        case 90000:
        case 180000:
            return date.getYear() != prevdate.getYear();
        default:
            return date.getDate() != prevdate.getDate();
    }
}

CanvasRenderingContext2D.prototype.setMatrix = function (mtx) {    
    this.mtx = mtx;
};

CanvasRenderingContext2D.prototype.mStorkeRect = function (x1,y1,x2,y2) {
    var p1 = this.mtx.applyToPoint(x1, y1);
    var p2 = this.mtx.applyToPoint(x2, y2);
    this.myStrokeRect(p1.x, p1.y, p2.x - p1.x, p2.y - p1.y);
};

CanvasRenderingContext2D.prototype.mFillRect = function (x1, y1, x2, y2) { 
    var p1 = this.mtx.applyToPoint(x1, y1);
    var p2 = this.mtx.applyToPoint(x2, y2);
    this.myFillRect({x: p1.x,y: p1.y,w: p2.x - p1.x,h: p2.y - p1.y });
};

CanvasRenderingContext2D.prototype.mFillRectangle = function (x1, y1, w, h) {
    this.mFillRect(x1, y1, x1 + w, y1 + h);
};


CanvasRenderingContext2D.prototype.ArrowHead = function (x1, y1, x2, y2, h, w) {
    var v = { x: x2 - x1, y: y2 - y1 };
    var len = Math.sqrt(v.x * v.x + v.y * v.y);
    if (len == 0)
        return;
    var norm = { x: v.x / len, y: v.y / len };
    var c = { x: x2 - norm.x * h, y: y2 - norm.y * h };
    var l = { x: c.x + norm.y * w, y: c.y - norm.x * w };
    var r = { x: c.x - norm.y * w, y: c.y + norm.x * w };
    this.moveTo(l.x, l.y);
    this.lineTo(x2, y2);
    this.lineTo(r.x, r.y);
};
CanvasRenderingContext2D.prototype.myStrokeRect = function (r) {
    var dw = Math.round(Math.round(r.w + r.x) - Math.round(r.x) - Math.round(r.w));
    var dh = Math.round(Math.round(r.h + r.y) - Math.round(r.y) - Math.round(r.h));
    this.strokeRect(Math.round(r.x) + 0.5, Math.round(r.y) + 0.5, Math.round(r.w) + dw, Math.round(r.h) + dh);
};
CanvasRenderingContext2D.prototype.myFillRect = function (r) {
    var dw = Math.round(Math.round(r.w + r.x) - Math.round(r.x) - Math.round(r.w));
    var dh = Math.round(Math.round(r.h + r.y) - Math.round(r.y) - Math.round(r.h));
    this.fillRect(Math.round(r.x), Math.round(r.y), Math.round(r.w) + dw, Math.round(r.h) + dh);
};
CanvasRenderingContext2D.prototype.myFillRectSmoothX = function (r) {
    //var dw = Math.round(Math.round(r.w + r.x) - Math.round(r.x) - Math.round(r.w));
    var dh = Math.round(Math.round(r.h + r.y) - Math.round(r.y) - Math.round(r.h));
    this.fillRect(Math.round(r.x), Math.round(r.y), r.w, Math.round(r.h) + dh);
};
CanvasRenderingContext2D.prototype.myStrokeRectXY = function (p1, p2) {
    this.myStrokeRect({ x: p1.x, y: p1.y, w: p2.x - p1.x, h: p2.y - p1.y });
}
CanvasRenderingContext2D.prototype.myFillRectXY = function (p1, p2) {
    this.myFillRect({ x: p1.x, y: p1.y, w: p2.x - p1.x, h: p2.y - p1.y });
}
CanvasRenderingContext2D.prototype.myRectXY = function (p1, p2) {
    this.myRect({ x: p1.x, y: p1.y, w: p2.x - p1.x, h: p2.y - p1.y });
}
CanvasRenderingContext2D.prototype.myMoveTo = function (x, y) { this.moveTo(Math.round(x) + 0.5, Math.round(y) + 0.5); };
CanvasRenderingContext2D.prototype.myLineTo = function (x, y) { this.lineTo(Math.round(x) + 0.5, Math.round(y) + 0.5); };
CanvasRenderingContext2D.prototype.myLine = function (x1, y1, x2, y2) { this.myMoveTo(x1, y1); this.myLineTo(x2, y2); };
CanvasRenderingContext2D.prototype.myFillRectSmooth = function (r) { this.fillRect(r.x, r.y, r.w, r.h); };
CanvasRenderingContext2D.prototype.myRect = function (r) {
    var dw = Math.round(Math.round(r.w + r.x) - Math.round(r.x) - Math.round(r.w));
    var dh = Math.round(Math.round(r.h + r.y) - Math.round(r.y) - Math.round(r.h));
    this.rect(Math.round(r.x) + 0.5, Math.round(r.y) + 0.5, Math.round(r.w) + dw, Math.round(r.h) + dh);
};
function base64ArrayBuffer(arrayBuffer) {
    var base64 = ''
    var encodings = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
    var bytes = new Uint8Array(arrayBuffer)
    var byteLength = bytes.byteLength
    var byteRemainder = byteLength % 3
    var mainLength = byteLength - byteRemainder
    var a, b, c, d
    var chunk
    // Main loop deals with bytes in chunks of 3
    for (var i = 0; i < mainLength; i = i + 3) {
        // Combine the three bytes into a single integer
        chunk = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2]
        // Use bitmasks to extract 6-bit segments from the triplet
        a = (chunk & 16515072) >> 18 // 16515072 = (2^6 - 1) << 18
        b = (chunk & 258048) >> 12 // 258048   = (2^6 - 1) << 12
        c = (chunk & 4032) >> 6 // 4032     = (2^6 - 1) << 6
        d = chunk & 63               // 63       = 2^6 - 1
        // Convert the raw binary segments to the appropriate ASCII encoding
        base64 += encodings[a] + encodings[b] + encodings[c] + encodings[d]
    }
    // Deal with the remaining bytes and padding
    if (byteRemainder == 1) {
        chunk = bytes[mainLength]
        a = (chunk & 252) >> 2 // 252 = (2^6 - 1) << 2
        // Set the 4 least significant bits to zero
        b = (chunk & 3) << 4 // 3   = 2^2 - 1
        base64 += encodings[a] + encodings[b] + '=='
    } else if (byteRemainder == 2) {
        chunk = (bytes[mainLength] << 8) | bytes[mainLength + 1]
        a = (chunk & 64512) >> 10 // 64512 = (2^6 - 1) << 10
        b = (chunk & 1008) >> 4 // 1008  = (2^6 - 1) << 4
        // Set the 2 least significant bits to zero
        c = (chunk & 15) << 2 // 15    = 2^4 - 1
        base64 += encodings[a] + encodings[b] + encodings[c] + '='
    }
    return base64
}
function uploadImage(blob) {
    var fileReader = new FileReader();
    fileReader.onload = function () {
        var base64String = base64ArrayBuffer(this.result);
        var formData = new FormData();
        formData.append('blob', base64String);
        var request = new XMLHttpRequest();
        request.open('POST', '/shots/UploadPng');
        request.send(formData);
        request.onreadystatechange = function () {
            if (request.readyState == XMLHttpRequest.DONE) {
                var s = request.responseText;
                $.when(kendo.ui.ExtAlertDialog.show({
                    title: "Скриншот получен",
                    message: '<a href="{0}" target="_blank">Cсылка на скриношот</a><br/>Вы можете вставлять ссылку на<br/> форумах и социальных сетях'.format(s, s),
                    icon: "k-ext-information"
                }));
                //    alert(request.responseText);
            }
        }
    };
    fileReader.readAsArrayBuffer(blob);
}