var greenCandleBorder = '#225437';
var redCandleBorder = '#5b1a13';
var LastPriceColor = "Linen";
var lineColor = '#ceced2';
//var horizStyle = true;
//if (typeof(settings) == 'undefined')
settings = { horizStyle: true };
var candlesObjects = {};
var CandlesAsBars = false;
try {
    CandlesAsBars = JSON.parse(window.localStorage.getItem("visualSettings")).Bars;
} catch (e) {
    // alert("!!!!!!!!!!");
}
function ViewPort(Context, UserView, ScreenView) {
    this.UserView = UserView;
    this.ScreenView = ScreenView;
    this.Context = Context;
    this.xscale = (ScreenView.x2 - ScreenView.x1) / (UserView.x2 - UserView.x1);
    this.xdelta = ScreenView.x1 - UserView.x1 * this.xscale;
    this.yscale = (ScreenView.y2 - ScreenView.y1) / (UserView.y2 - UserView.y1);
    this.ydelta = ScreenView.y1 - UserView.y1 * this.yscale;
    this.PointProection = function (point) {
        return {
            x: Math.round(point.x * this.xscale + this.xdelta) + 0.5,
            y: Math.round(point.y * this.yscale + this.ydelta) + 0.5
        };
    }
    this.moveTo = function (x, y) {
        var p = this.PointProection({
            x: x,
            y: y
        });
        Context.moveTo(p.x, p.y);
    }
    this.lineTo = function (x, y) {
        var p = this.PointProection({
            x: x,
            y: y
        });
        Context.lineTo(p.x, p.y);
    }
    this.line = function (x1, y1, x2, y2) {
        this.moveTo(x1, y1);
        this.lineTo(x2, y2);
    }
    this.fillRect = function (x, y, w, h) {
        Context.myFillRect({ x: x * this.xscale + this.xdelta, y: y * this.yscale + this.ydelta, w: w * this.xscale, h: h * this.yscale });
    }
    this.fillRectSmooth = function (x, y, w, h) {
        if (Math.abs(w * this.xscale) >= 4)
            return this.fillRect(x, y, w, h);
        var p = this.PointProection({
            x: x,
            y: y
        });
        Context.fillRect(p.x, p.y, w * this.xscale, h * this.yscale);
    }
    this.rect = function (x, y, w, h) {
        if (Math.abs(w * this.xscale) < 2.5)
            Context.rect(x * this.xscale + this.xdelta, y * this.yscale + this.ydelta, w * this.xscale, h * this.yscale);
        else
            Context.myRect({ x: x * this.xscale + this.xdelta, y: y * this.yscale + this.ydelta, w: w * this.xscale, h: h * this.yscale });
    }
    this.rectSmooth = function (x, y, w, h) {
        Context.rect(x * this.xscale + this.xdelta, y * this.yscale + this.ydelta, w * this.xscale, h * this.yscale);
    }
}
function CandleChart(CanvasName, minimode) {
    this.minimode = minimode;
    var paramNames = ['ticker', 'ticker1', 'ticker2', 'period', 'rperiod', 'startDate', 'endDate', 'startTime', 'endTime'];
    var checkBoxNames = ['timeEnable', 'oiEnable', 'visualVolume'];
    this.scale = 1;
    this.canvasname = CanvasName;
    this.canvasid = "#" + CanvasName;
    this.canvas = document.getElementById(CanvasName);
    this.ctx = this.canvas.getContext('2d');
    //    this.CandleViewWidth2 = this.CandleViewWidth + 20;
    this.CandleViewHeight = 900;
    this.DateTimeHeight = 50;
    this.Top = this.minimode ? 20 : 0;
    this.selmode = 0;
    needLogo = false;
    this.last_mousex = -1;
    this.last_mousey = -1;
    this.lastCandleIndex = -1;
    this.resizeTimer;
    this.deflen = this.minimode ? 60 : (isMobile2() ? 70 : 200);
    this.sliderHeight = isMobile2() ? 3 : 20;
    this.counter = 0;
    this.text = '';
    var me = this;
    var mergedid = false;
    this.addhint = function () {
        if (document.getElementById('hint') == null) {
            var element = document.createElement('div');
            element.id = 'hint';
            document.body.appendChild(element);
            //         this.canvas.parentNode.appendChild(element);
        }
    }
    //if (!this.hintMode)
    this.addhint();
    function CloneObject(obj) {
        return JSON.parse(JSON.stringify(obj));
    }
    this.recaclRelPrices = function (coef1, coef2) {
        for (var i = 0; i < this.candles.Cls.length; i) {
            this.candles.Min[i] = this.candles.Opn[i] / this.candles.Opn[0];
            this.candles.Max[i] = this.candles.Cls[i] / this.candles.Cls[0];
            this.candles.Vol[i] = coef1 * this.candles.Opn[i] + coef2 * this.candles.Cls[i];
        }
    }
    this.arrlen = function () {
        return me.candles.Date.length;
    }
    this.lencandle = function () {
        return me.endcandle - me.begincandle;
    }
    rounder = function (num) {
        let x = Math.pow(10, Math.round(Math.log10(num)));
        return (2 * x - num < num - x) ? 2 * x : (num - 0.5 * x < x - num) ? x * 0.5 : x;
    }
    rrounder = function (x, r) {
        return Math.floor(x / r) * r;
    };
    this.CompHScroll = function () {
        var r = (this.CandleViewWidth2 - this.newLeft()) / (this.arrlen());
        this.hscrollbarB = this.newLeft() + r * this.begincandle;
        this.hscrollbarE = this.newLeft() + r * this.endcandle;
    }
    this.DrawScrollBar = function (x, y) {
        if (this.hintMode)
            return;
        var canvas = this.canvas;
        this.ctx.beginPath();
        if ((x > this.hscrollbarB) && (y > canvas.height - this.sliderHeight + 1) && (x < this.hscrollbarE)) this.ctx.fillStyle = "rgba(180, 180, 200, 0.5)"; // "#aaaabb";
        else
            this.ctx.fillStyle = "rgba(120, 120, 150, 0.5)"; // "#888899";
        //alert(this.hscrollbarB + ' ' + this.hscrollbarE);
        this.ctx.rect(this.hscrollbarB, canvas.height - this.sliderHeight + 1, this.hscrollbarE - this.hscrollbarB, this.sliderHeight - 1);
        this.ctx.stroke();
        this.ctx.fill();
    }
    this.DrawZebra = function (ctx, Top, Left, Width, Height, minPrice, maxPrice, lastPriceOn, digSuffix) {
        if (Height <= 0)
            return;
        var d = Height / (minPrice - maxPrice);
        var f = Top - d * maxPrice;
        var period = maxPrice - minPrice;
        var h = Height;
        var r = rounder(period * 25 / h);
        var s = rrounder(minPrice, r);
        var y = 0;
        ctx.font = '12px sans-serif';
        ctx.textBaseline = 'middle';
        ctx.strokeStyle = lineColor;
        ctx.lineWidth = 1;
        ctx.fillStyle = "#f5f5f5";
        var odd = 0;
        for (var y = s + r; y < maxPrice + r * 2; y += r * 2) {
            var yy = Math.floor(y * d + f) + 0.5;
            var y1 = yy;
            var y2 = yy + (Math.abs((r) * d));
            if (y1 < Top) y1 = Top;
            if (y2 > Top) {
                if (y2 > (Height + Top)) y2 = Height + Top;
                ctx.fillRect(0.5 + Left, y1, Width, y2 - y1);
            }
        }
        ctx.fillStyle = "#000000";
        for (var y = s + r; y < maxPrice; y += r) {
            var yy = Math.floor(y * d + f) + 0.5;
            ctx.moveTo(Width + Left - 7, yy);
            ctx.lineTo(Width + Left + 7, yy);
            ctx.fillText(MoneyToStr(y) + digSuffix, Width + Left + 10, yy);
            ctx.stroke();
        }
        // Last price
        if (lastPriceOn) {
            var lastPrice = Number(this.candles.Cls[this.candles.Cls.length - 1]);
            yy = Math.floor(lastPrice * d + f) + 0.5;
            ctx.moveTo(Width + Left - 15, yy);
            ctx.lineTo(Width + Left + 9, yy);
            ctx.stroke();
            ctx.fillStyle = LastPriceColor;
            let ll = lastPrice.toString().length * 7 + 3;
            ctx.fillRect(Width + Left + 8.5, yy - 9, ll, 18);
            ctx.rect(Width + Left + 8.5, yy - 9, ll, 18);
            ctx.stroke();
            ctx.fillStyle = "#000000";
            ctx.fillText(lastPrice.toString(), Width + Left + 10, yy + 1);
        }
    }
    this.drawprices = function (mousey, minprice, maxprice) {
        var ctx = this.ctx;
        var Top = this.Top;
        var left2 = 25;
        var parrlen = this.prices2.Prc.length;
        var horizStyle = settings.horizStyle;
        var X1, X2;
        if (settings.horizStyle) {
            X1 = this.Left;
            X2 = left2;
        }
        else {
            X1 = this.Left;
            X2 = 0;
        }
        var maxv = Math.max.apply(Math, this.prices2.Vol) * 1.03;
        if (!settings.Contracts) {
            maxv = 0;
            for (var i = 0; i < parrlen; i++) {
                var tmpv = this.prices2.Vol[i] * this.prices2.Prc[i] * this.prices2.VolumePerQuantity * 1.03;
                maxv = Math.max(maxv, tmpv);
            }
        }
        var dd = (X1 - X2) / maxv;
        var ff = X2;
        var period = maxv;
        var h = X1 - X2;
        var r = rounder(period * 25 / h);
        var s = rrounder(0, r);
        var y = 0;
        var ctx = this.ctx;
        ctx.font = "11px sans-serif";
        var minstep = this.prices2.priceStep;
        var PricesViewPort = new ViewPort(ctx, {
            y2: minprice,
            y1: maxprice,
            x1: 0,
            x2: maxv
        }, {
                x1: X2,
                x2: X1,
                y1: this.Top,
                y2: this.CandleViewHeight + this.Top
            });
        ctx.save()
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(0,0,0,0)';
        PricesViewPort.rect(0, maxprice, maxv, minprice - maxprice)
        ctx.clip();
        if (settings.horizStyle) {
            ctx.fillStyle = '#f5f5f5';
            var odd = 0;
            for (var y = s; y < maxv; y += r) {
                var yy = Math.floor(y * dd + ff) + 0.5;
                if ((odd++) % 2 != 0)
                    ctx.fillRect(yy, Top, r * dd, this.CandleViewHeight);
            }
            ctx.stroke();
        }
        for (var i = 0; i < parrlen; i++) {
            var price = this.prices2.Prc[i];
            var val = this.prices2.Vol[i];
            var buyval = this.prices2.bVol[i];
            if (!settings.Contracts) {
                val = (val * price * this.prices2.VolumePerQuantity);//.toFixed(2);
                buyval = (buyval * price * this.prices2.VolumePerQuantity);//.toFixed(2);
            }
            var bary = PricesViewPort.PointProection({
                x: 0,
                y: price - minstep / 2
            }).y;;
            var baryn = PricesViewPort.PointProection({
                x: 0,
                y: price + minstep / 2
            }).y;;
            var selectedprice = ((baryn <= mousey) && (bary >= mousey));
            ctx.beginPath();
            ctx.fillStyle = selectedprice ? (horizStyle ? redcandlesat : redcandlesatA) : horizStyle ? redcandle : redcandleA;
            ctx.strokeStyle = horizStyle ? '#5b1a13' : 'rgba(91,26,19,0.4)';
            PricesViewPort.rect(0, price - minstep / 2, val, minstep);
            ctx.fill();
            ctx.stroke();
            ctx.beginPath();
            ctx.fillStyle = selectedprice ? (horizStyle ? greencandlesat : greencandlesatA) : horizStyle ? greencandle : greencandleA;
            ctx.strokeStyle = horizStyle ? '#225437' : 'rgba(34,84,55,0.4)';
            PricesViewPort.rect(0, price - minstep / 2, buyval, minstep);
            ctx.fill();
            ctx.stroke();
            if (selectedprice) {
                ctx.save();
                ctx.font = "12px sans-serif";
                ctx.beginPath();
                ctx.translate(X2 + 4, this.CandleViewHeight - 22);
                ctx.fillStyle = '#333';
                ctx.fillText(((settings.Contracts) ? ("Cont:" + drob(val, 3)) : ("Vol:" + drob(val, 3))) + " Buy " + Math.floor(buyval / val * 100) + "%", 0, 0);
                ctx.fillText("Prc:" + drob(price - minstep / 2, 4) + " - " + drob(price + minstep / 2, 4), 0, 13);
                ctx.restore();
            }
        }
        ctx.restore();
        if (horizStyle) {
            ctx.beginPath();
            for (var y = s; y < maxv; y += r) {
                var yy = Math.floor(y * dd + ff) + 0.5;
                ctx.moveTo(yy, Top + this.CandleViewHeight - 3);
                ctx.lineTo(yy, Top + this.CandleViewHeight + 10);
                ctx.stroke();
                if (y > 0) {
                    ctx.save();
                    ctx.translate(yy, Top + this.CandleViewHeight + 10);
                    ctx.rotate(-Math.PI / 3.5);
                    ctx.textAlign = "right";
                    ctx.fillStyle = '#000000';
                    ctx.fillText(MoneyToStr(y), -10, 0);
                    ctx.restore();
                }
            }
            ctx.stroke();
        }
        ctx.beginPath();
        ctx.strokeStyle = lineColor;
        if (horizStyle)
            PricesViewPort.rect(0, maxprice, maxv, minprice - maxprice)
        else {
            ctx.setLineDash([5, 5, 3, 5]);
            PricesViewPort.line(maxv, maxprice, maxv, minprice)
        }
        ctx.stroke();
        ctx.setLineDash([]);
    }
    this.ComputeSizes = function (preserveScroll) {
        try {
            this.CandleViewWidth = this.canvas.width - (this.candles.Cls[0] < 0.001 ? 120 : 85);
        }
        catch (e) {
            this.CandleViewWidth = this.canvas.width - 85;
        }
        this.CandleViewWidth2 = this.CandleViewWidth + 20;
        this.deflen = Math.round(this.CandleViewWidth / 5);
        var maxvol = 0;
        if (this.IsPairTrading)
            maxvol = 1;
        else
            for (var i = 0; i < this.arrlen(); i++)
                if (maxvol < this.candles.Vol[i])
                    maxvol = this.candles.Vol[i];
        if (maxvol > 0.001) {
            this.ValuesViewHeight = this.canvas.height - this.Top - this.CandleViewHeight - this.sliderHeight - this.DateTimeHeight;
            if (this.ValuesViewHeight < 100) {
                this.ValuesViewHeight = Math.max(this.ValuesViewHeight, 100);
                this.CandleViewHeight = this.canvas.height - this.Top - this.ValuesViewHeight - this.sliderHeight - this.DateTimeHeight;
            }
        } else {
            this.ValuesViewHeight = 0;
            this.CandleViewHeight = this.canvas.height - this.Top - this.sliderHeight - this.DateTimeHeight;
        }
        if (!(this.paramshorizontal != null && this.prices2 && (this.prices2.Prc.length > 0))) this.Left = 0;
        this.CompHScroll();
    }
    this.updateCanvasWidth = function () {
        if (isMobile2()) {
            me.MobileResize();
            me.ComputeSizes();
            me.drawcanvas();
            return;
        }
        value = window.innerWidth; //this.IsPairTrading? 10 : 10;
        value = me.canvas.parentElement.clientWidth;
        //    value -= 18;
        if (!this.minimode) {
            h = Math.max(220, window.innerHeight - me.canvas.getBoundingClientRect().top);
            me.canvas.height = h;
            me.canvas.width = value;
        }
        me.ComputeSizes();
        me.drawcanvas();
    }
    this.MobileResize = function () {
        me.CandleViewHeight = Math.floor(window.innerHeight * me.scale * 0.6);
        me.Left = Math.floor((window.innerWidth / 6 + 40) * me.scale);
        me.scale = 1.5;
        if (me.minimode) {
            /* if (window.innerWidth < window.innerHeight)
                 me.resize(window.innerWidth, window.innerHeight / 3 - 4, me.scale);
             else
                 me.resize(window.innerWidth / 2 - 3, window.innerHeight / 2 - 5, me.scale);*/
        } else {
            {
                var parent = me.canvas.parentElement.getBoundingClientRect();
                var w = Math.floor(parent.width);
                //            var h = Math.floor(parent.height);
                var h = Math.floor(window.innerHeight - parent.top);
                me.resize(w, h, me.scale);
            }
        }
    }
    this.resize = function (w, h, scale) {
        me.scale = scale
        me.canvas.style.height = h + 'px';
        me.canvas.style.width = w + 'px';
        me.canvas.height = Math.floor(h * scale);
        me.canvas.width = Math.floor(w * scale);
    }
    this.drawcanvas = function (mousex, mousey) {
        this.hintMode = 'exParams' in this;
        if (typeof (this.params.period) == 'undefined') {
            let zu = 1000000;
            for (var i = 0; i < this.arrlen() - 1; i++)
                zu = Math.min(zu, this.candles.Date[i + 1] - this.candles.Date[i]);
            this.params['period'] = zu;
        }
        var Left1 = this.Left;
        if (!settings.horizStyle)
            Left1 = 0;
        if (typeof (settings.Bars) == 'undefined')
            settings = { Contracts: false, Delta: false, oiEnable: true, Bars: CandlesAsBars };
        if (settings.Contracts)
            this.VisibleVolume = this.candles.Qnt;
        else
            this.VisibleVolume = this.candles.Vol;
        periodSelector = "Candles";
        var padding = 0.20;
        var ctx = this.ctx;
        if (this.minimode) {
            this.CandleViewHeight = this.canvas.height - this.Top;
            this.DateTimeHeight = 0;
            this.ValuesViewHeight = this.canvas.height / 5;
        }
        if (!this.candles || this.candles.Date.length == 0) {
            if (!this.minimode) {
                w = window.innerWidth;
                w = me.canvas.parentElement.clientWidth;
                me.canvas.width = w - 10;
            }
            var w = Math.max(me.canvas.width, me.CandleViewWidth);
            var h = this.CandleViewHeight + me.ValuesViewHeight;
            h = Math.max(me.canvas.height, h);
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(0, 0, w, h);
            ctx.font = "bold 16px Verdana";
            ctx.fillStyle = "#000000";
            ctx.fillText("Не найдены данные по данному тикеру и периоду", w / 2 - 200, 30);
            return;
        }
        this.last_mousex = mousex;
        this.last_mousey = mousey;
        ctx.beginPath();
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        ctx.fill();
        vW = this.CandleViewWidth;
        vH = this.CandleViewHeight;
        minP = 999999999;
        maxP = -999999999;
        var maxvol = 0;
        var minvol = 0;
        var min_oi = 10000000;
        var max_oi = 0;
        var DeltaArr;
        var cumDelta = 0;
        if (this.IsPairTrading) {
            for (var i = 0; i < this.arrlen(); i++) {
                minP = Math.min(minP, this.candles.relprice1[i], this.candles.relprice2[i]);
                maxP = Math.max(maxP, this.candles.relprice1[i], this.candles.relprice2[i]);
                maxvol = Math.max(maxvol, this.candles.profit[i]);
                minvol = Math.min(minvol, this.candles.profit[i]);
            }
            minvol = minvol - (maxvol - minvol) / 10;
            maxvol = maxvol + (maxvol - minvol) / 10;
        } else {
            for (var i = this.begincandle; i < this.endcandle; i++) {
                minP = Math.min(minP, this.candles.Min[i], this.candles.Max[i]);
                maxP = Math.max(maxP, this.candles.Min[i], this.candles.Max[i]);
                maxvol = Math.max(maxvol, this.VisibleVolume[i]);
                if (this.candles.OpIn && settings.oiEnable) {
                    max_oi = Math.max(max_oi, this.candles.OpIn[i]);
                    min_oi = Math.min(min_oi, this.candles.OpIn[i]);
                }
            }
            if (max_oi > 0) {
                var mdd = (max_oi - min_oi) / 20;
                max_oi += mdd;
                min_oi -= mdd;
            }
            if (settings.Delta) {
                DeltaArr = new Array(this.arrlen());
                for (var i = 0; i < this.arrlen(); i++) {
                    var Bid = this.VisibleVolume[i] / 1000 * this.candles.Bid[i];
                    var Ask = this.VisibleVolume[i] - Bid;
                    var delta = Bid - Ask;
                    cumDelta += delta;
                    DeltaArr[i] = cumDelta;
                }
                maxvol = 0;
                minvol = 100000000000;
                for (var i = this.begincandle; i < this.endcandle; i++) {
                    maxvol = Math.max(maxvol, DeltaArr[i]);
                    minvol = Math.min(minvol, DeltaArr[i]);
                }
                var md = (maxvol - minvol) / 20;
                maxvol += md;
                minvol -= md;
            }
            /*            if ((this.paramshorizontal != null && this.prices2 && (this.prices2.Prc.length > 0))) {
                            minP = Math.min(minP, Math.min.apply(Math, this.prices2.Prc));
                            maxP = Math.min(maxP, Math.max.apply(Math, this.prices2.Prc));
                        }*/
        }
        if ((this.paramshorizontal != null && this.prices2 && (this.prices2.Prc.length > 0))) {
            for (var i = 0; i < this.prices2.Prc.length; i++) {
                minP = Math.min(minP, this.prices2.Prc[i]);
                maxP = Math.max(maxP, this.prices2.Prc[i]);
            }
            maxP += this.prices2.priceStep;
        }
        if (minP != maxP) {
            var mmp = (maxP - minP) / 20;
            maxP += mmp;
            minP -= mmp;
        } else {
            minP = this.candles.Min[0] * 0.95;
            maxP = this.candles.Max[0] * 1.05;
        }
        var drawVolumes = (!this.minimode && (maxvol - minvol) > 0.001);
        var CandlesViewPort = new ViewPort(ctx, {
            x1: this.begincandle,
            y1: minP,
            x2: this.endcandle,
            y2: maxP
        }, {
                x1: Left1,
                y2: this.Top,
                x2: vW,
                y1: this.Top + vH
            });
        var VolumesViewPort;
        var OIViewPort;
        this.DrawZebra(ctx, this.Top, Left1, this.CandleViewWidth2 - Left1, this.CandleViewHeight, minP, maxP, !this.IsPairTrading && this.endcandle == this.arrlen(), this.IsPairTrading ? '%' : '');
        if ((maxvol - minvol) > 0.001) {
            if (this.minimode)
                VolumesViewPort = new ViewPort(ctx, {
                    x1: this.begincandle,
                    y1: minvol,
                    x2: this.endcandle,
                    y2: maxvol
                }, {
                        x1: Left1,
                        x2: vW,
                        y2: this.Top + vH - 40,
                        y1: this.Top + vH
                    });
            else {
                if (max_oi) {
                    VolumesViewPort = new ViewPort(ctx, {
                        x1: this.begincandle,
                        y1: minvol,
                        x2: this.endcandle,
                        y2: maxvol
                    }, {
                            x1: Left1,
                            x2: vW,
                            y1: this.Top + vH + this.ValuesViewHeight / 2 + this.DateTimeHeight,
                            y2: this.Top + vH + this.DateTimeHeight
                        });
                    OIViewPort = new ViewPort(ctx, {
                        x1: this.begincandle,
                        y1: min_oi,
                        x2: this.endcandle,
                        y2: max_oi
                    }, {
                            x1: Left1,
                            x2: vW,
                            y1: this.Top + vH + this.ValuesViewHeight + this.DateTimeHeight,
                            y2: this.Top + vH + this.ValuesViewHeight / 2 + this.DateTimeHeight
                        });
                    this.DrawZebra(ctx, this.CandleViewHeight + this.Top + this.DateTimeHeight, Left1, this.CandleViewWidth2 - Left1, this.ValuesViewHeight / 2, minvol, maxvol, false, this.IsPairTrading ? '%' : '');
                    this.DrawZebra(ctx, this.CandleViewHeight + this.Top + this.DateTimeHeight + this.ValuesViewHeight / 2, Left1, this.CandleViewWidth2 - Left1, this.ValuesViewHeight / 2, min_oi, max_oi, false, '');
                } else {
                    VolumesViewPort = new ViewPort(ctx, {
                        x1: this.begincandle,
                        y1: minvol,
                        x2: this.endcandle,
                        y2: maxvol
                    }, {
                            x1: Left1,
                            x2: vW,
                            y1: this.Top + vH + this.ValuesViewHeight + this.DateTimeHeight,
                            y2: this.Top + vH + this.DateTimeHeight
                        });
                    this.DrawZebra(ctx, this.CandleViewHeight + this.Top + this.DateTimeHeight, Left1, this.CandleViewWidth2 - Left1, this.ValuesViewHeight, minvol, maxvol, false, this.IsPairTrading ? '%' : '');
                }
            }
        }
        var dateneed = true;
        ctx.font = '11px sans-serif';
        ctx.strokeStyle = lineColor;
        var date, prevdate;
        var olddatepos = CandlesViewPort.PointProection({
            x: this.endcandle,
            y: 0
        }).x;
        var oldtimepos = olddatepos;
        for (var i = this.endcandle - 1; i >= this.begincandle; i--) {
            date = MoscowTimeShift(inttodate(this.candles.Date[i]));
            prevdate = MoscowTimeShift(inttodate(this.candles.Date[i - 1]));
            var currdatepos = CandlesViewPort.PointProection({
                x: i,
                y: 0
            }).x;
            if ((date.getDate() != prevdate.getDate()) || (date.getMonth() != prevdate.getMonth())) {
                if (dateDelimeter(prevdate, date, this.params.period)) {
                    ctx.beginPath();
                    CandlesViewPort.line(i, CandlesViewPort.UserView.y1, i, CandlesViewPort.UserView.y2);
                    ctx.stroke();
                }
                if (!this.minimode) {
                    if (olddatepos - currdatepos > 55) {
                        ctx.beginPath();
                        ctx.fillStyle = '#000000';
                        ctx.fillText(dateTools.toStr(date), currdatepos + 1, this.Top + this.CandleViewHeight + 15);
                        /*	if (dateDelimeter(prevdate,date,this.params.period))
                            {
                                        ctx.moveTo(currdatepos, this.CandleViewHeight + this.Top);
                                        ctx.lineTo(currdatepos, this.CandleViewHeight + this.Top + this.DateTimeHeight / 2);
                            }         */
                        ctx.stroke();
                        olddatepos = currdatepos;
                        dateneed = false;
                    }
                }


            }

            if( this.params.period>=1)
            { 

            if (oldtimepos - currdatepos > 30) {
                ctx.beginPath();
                ctx.fillStyle = '#000000';
                ctx.fillText(TimeFormat(date), currdatepos + 1, this.Top + this.CandleViewHeight + 40);
                ctx.stroke();
                oldtimepos = currdatepos;
            }
		}

             else
              {

                                    if (oldtimepos - currdatepos > 50) {
                ctx.beginPath();
                ctx.fillStyle = '#000000';
                ctx.fillText(TimeFormat2(date), currdatepos + 1, this.Top + this.CandleViewHeight + 40);
                ctx.stroke();
                oldtimepos = currdatepos;
            }


		}
        }
        if (!this.minimode && dateneed) {
            ctx.beginPath();
            ctx.strokeStyle = '#666';
            ctx.fillStyle = '#666';
            ctx.fillText(dateTools.toStr(date), Left1 + 2, this.Top + this.CandleViewHeight + 15);
            ctx.stroke();
        }
        /////////////  перекрестие мыши
        ctx.fillStyle = '#ffffff';
        if (mousex > -1 && this.GetSelectionMode(mousex, mousey) == 4) {
            var mx = mousex - Left1;
            var my = mousey - this.Top;
            if ((me.selmode == 0) && (mx > 0) && (my > 0) && (mx < this.CandleViewWidth - Left1) && (my < this.CandleViewHeight)) {
                ctx.beginPath();
                ctx.lineWidth = 1;
                ctx.strokeStyle = '#999';
                ctx.moveTo(mousex + 0.5, this.Top + 0.5);
                ctx.lineTo(mousex + 0.5, this.CandleViewHeight + this.Top + 0.5);
                ctx.stroke();
                if ((maxvol - minvol) > 0.001) {
                    ctx.moveTo(mousex + 0.5, this.CandleViewHeight + this.Top + this.DateTimeHeight + 0.5);
                    ctx.lineTo(mousex + 0.5, this.canvas.height - 20.5);
                    ctx.stroke();
                }
                ctx.moveTo(Left1, mousey + 0.5);
                ctx.lineTo(this.CandleViewWidth2 + 10, mousey + 0.5);
                let lastPrice = drob(maxP - (maxP - minP) * my / this.CandleViewHeight, 4);
                let ll = lastPrice.toString().length * 7 + 3;
                ctx.rect(this.CandleViewWidth2 + 10.5, mousey - 9.5, ll, 18);
                ctx.stroke();
                ctx.fill();
                ctx.fillStyle = '#000';
                ctx.font = "12px sans-serif";
                ctx.fillText(lastPrice, this.CandleViewWidth2 + 13, mousey + 0.5);
                ctx.restore();
                ctx.stroke();
                this.DrawLegend(mousex, mousey);
            }
            else
                this.DrawLegend();
        }
        else {
            this.selectedcandle = null;
            this.DrawLegend();
        }
        //////////////////
        if (this.IsPairTrading) {
            // Line 1
            ctx.beginPath();
            ctx.lineWidth = 1;
            ctx.strokeStyle = 'DarkGoldenRod';
            for (var i = this.begincandle; i < this.endcandle; i++)
                if (i == this.begincandle)
                    CandlesViewPort.moveTo(i + 0.5, this.candles.relprice1[i]);
                else
                    CandlesViewPort.lineTo(i + 0.5, this.candles.relprice1[i]);
            ctx.stroke();
            // Line 2
            ctx.beginPath();
            ctx.strokeStyle = 'DarkBlue';
            for (var i = this.begincandle; i < this.endcandle; i++)
                if (i == this.begincandle)
                    CandlesViewPort.moveTo(i + 0.5, this.candles.relprice2[i]);
                else
                    CandlesViewPort.lineTo(i + 0.5, this.candles.relprice2[i]);
            ctx.stroke();
            // Points 1&2
            for (var i = this.begincandle; i < this.endcandle; i++) {
                var p1 = CandlesViewPort.PointProection({
                    x: i + 0.5,
                    y: this.candles.relprice1[i]
                });
                var p2 = CandlesViewPort.PointProection({
                    x: i + 0.5,
                    y: this.candles.relprice2[i]
                });
                ctx.fillStyle = i == this.selectedcandle ? '#ff8888' : 'DarkGoldenRod';
                ctx.fillRect(p1.x - 2.5, p1.y - 2.5, 5, 5);
                ctx.fillStyle = i == this.selectedcandle ? '#ff8888' : 'DarkBlue';
                ctx.fillRect(p2.x - 2.5, p2.y - 2.5, 5, 5);
            }
        } else
            if (this.isTickerGraph()) {
                ctx.beginPath();
                ctx.lineWidth = 1;
                ctx.strokeStyle = '#000000';
                for (var i = this.begincandle; i < this.endcandle; i++) {
                    if (i == this.begincandle)
                        CandlesViewPort.moveTo(i + 0.5, this.candles.Opn[i]);
                    else
                        CandlesViewPort.lineTo(i + 0.5, this.candles.Opn[i]);
                }
                ctx.stroke();
                for (var i = this.begincandle; i < this.endcandle; i++) {
                    var p = CandlesViewPort.PointProection({
                        x: i + 0.5,
                        y: this.candles.Opn[i]
                    });
                    if (this.candles.Bid[i] > 0)
                        ctx.fillStyle = i == this.selectedcandle ? greencandlesat : greencandle;
                    else
                        ctx.fillStyle = i == this.selectedcandle ? redcandlesat : redcandle;
                    ctx.fillRect(p.x - 2.5, p.y - 2.5, 5, 5);
                }
            } else
                for (var i = this.begincandle; i < this.endcandle; i++) {
                    ctx.beginPath();
                    ctx.lineWidth = 1;
                    if (settings.Bars) {
                        if (this.candles.Opn[i] - this.candles.Cls[i] < 0)
                            ctx.strokeStyle = (i == this.selectedcandle) ? greencandlesat : greencandle;
                        else
                            ctx.strokeStyle = (i == this.selectedcandle) ? redcandlesat : redcandle;
                        let ww = Math.max(1, Math.min(4, 1 + (CandlesViewPort.xscale - 5) / 10.0));
                        if (ww > 3 || ww < 1.2) ww = Math.round(ww);
                        ctx.lineWidth = ww;//(i == this.selectedcandle) ? 2 : CandlesViewPort.xscale > 10 ? 2: CandlesViewPort.xscale > 5? 1.5:1;
                        CandlesViewPort.line(i + 0.5, this.candles.Min[i], i + 0.5, this.candles.Max[i])
                        CandlesViewPort.line(i + 0.08, this.candles.Opn[i], i + 0.5, this.candles.Opn[i])
                        CandlesViewPort.line(i + 0.92, this.candles.Cls[i], i + 0.5, this.candles.Cls[i])
                    }
                    else {
                        ctx.strokeStyle = '#666';
                        CandlesViewPort.line(i + 0.5, this.candles.Min[i], i + 0.5, this.candles.Max[i])
                        ctx.stroke();
                        ctx.strokeStyle = (this.candles.Opn[i] - this.candles.Cls[i] < 0) ? '#225437' : '#5b1a13';
                        ctx.beginPath();
                        if (this.candles.Opn[i] - this.candles.Cls[i] < 0)
                            ctx.fillStyle = (i == this.selectedcandle) ? greencandlesat : greencandle;
                        else
                            ctx.fillStyle = (i == this.selectedcandle) ? redcandlesat : redcandle;
                        CandlesViewPort.rect(i + padding, this.candles.Opn[i], 1 - padding * 2, this.candles.Cls[i] - this.candles.Opn[i]);
                        ctx.fill();
                    }
                    ctx.stroke();
                }
        //////////////////                     
        this.DrawDelta = function (array) {
            ctx.beginPath();
            ctx.strokeStyle = lineColor;
            VolumesViewPort.moveTo(this.begincandle, 0);
            VolumesViewPort.lineTo(this.endcandle, 0);
            ctx.stroke();
            for (var step = 0; step < 2; step++) {
                ctx.save();
                ctx.beginPath();
                ctx.strokeStyle = "rgba(0, 0, 0, 0)"
                VolumesViewPort.rect(this.begincandle, 0, this.endcandle - this.begincandle, step == 0 ? maxvol : minvol);
                ctx.clip();
                ctx.stroke();
                ctx.beginPath();
                ctx.strokeStyle = step == 0 ? greencandlesat : redcandlesat;
                ctx.lineWidth = 1.5;
                for (var i = this.begincandle; i < this.endcandle; i++) {
                    if (i == this.begincandle)
                        VolumesViewPort.moveTo(i + 0.5, array[i]);
                    else
                        VolumesViewPort.lineTo(i + 0.5, array[i]);
                }
                ctx.stroke();
                ctx.restore();
            }
        }
        //
        if ((maxvol - minvol) > 0.001) {
            if (this.IsPairTrading)
                this.DrawDelta(this.candles.profit);
            else {
                if (settings.Delta)
                    this.DrawDelta(DeltaArr);
                else
                    for (var i = this.begincandle; i < this.endcandle; i++) {
                        ctx.beginPath();
                        ctx.fillStyle = (i == this.selectedcandle) ? redcandlesat : redcandle;
                        VolumesViewPort.fillRectSmooth(i + padding, 0, 1 - padding * 2, this.VisibleVolume[i]);
                        ctx.fillStyle = (i == this.selectedcandle) ? greencandlesat : greencandle;
                        VolumesViewPort.fillRectSmooth(i + padding, 0, 1 - padding * 2, this.candles.Bid[i] * this.VisibleVolume[i] / 1000);
                    }
                ctx.beginPath();
                if (!this.minimode && max_oi)
                    for (var i = this.begincandle; i < this.endcandle; i++) {
                        ctx.beginPath();
                        ctx.fillStyle = (i == this.selectedcandle) ? '#000000' : '#2050A8';
                        OIViewPort.fillRectSmooth(i + padding, min_oi, 1 - padding * 2, this.candles.OpIn[i] - min_oi);
                    }
                ctx.stroke();
            }
        }
        /////////////
        ctx.beginPath();
        ctx.lineWidth = 1;
        ctx.strokeStyle = lineColor;
        ctx.rect(0.5 + Left1, this.Top, this.CandleViewWidth2 - Left1, this.CandleViewHeight);
        if (maxvol > 0.001) ctx.rect(0.5 + Left1, this.CandleViewHeight + this.Top + this.DateTimeHeight, this.CandleViewWidth2 - Left1, this.ValuesViewHeight);
        /*if (minvol != 0) {
            ctx.moveTo(0.5 + Left1, this.CandleViewHeight + this.Top + this.DateTimeHeight + this.ValuesViewHeight * maxvol / (maxvol - minvol) - 0.5);
            ctx.lineTo(this.CandleViewWidth2, this.CandleViewHeight + this.Top + this.DateTimeHeight + this.ValuesViewHeight * maxvol / (maxvol - minvol) - 0.5);
        }*/
        ctx.rect(0.5 + Left1, 0.5 + this.CandleViewHeight + this.Top, this.CandleViewWidth2 - Left1, this.DateTimeHeight);
        ctx.rect(0.5 + Left1, 0.5 + this.CandleViewHeight + this.Top, this.CandleViewWidth2 - Left1, this.DateTimeHeight / 2);
        ctx.stroke();
        this.DrawScrollBar(mousex, mousey);
        // Values/OI separator
        if (!this.minimode && max_oi) {
            ctx.beginPath();
            ctx.lineWidth = 1;
            ctx.strokeStyle = '#808080';
            var yy = this.CandleViewHeight + this.Top + this.DateTimeHeight + this.ValuesViewHeight / 2;
            ctx.moveTo(Left1, yy);
            ctx.lineTo(this.CandleViewWidth2, yy);
            ctx.stroke();
        }
        if (needLogo) {
            ctx.font = '18px sans-serif';
            ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            var y = 15;
            ctx.fillText("http://ru-ticker.com", (this.paramshorizontal != null && this.prices2 && (this.prices2.Prc.length > 0)) ? 50 : 10, y);
            y += 20;
            if (this.IsPairTrading) {
                ctx.fillStyle = 'rgba(0, 128, 0, 0.5)';
                ctx.fillText('Тикер 1: ' + document.getElementById('ticker1').value, 10, y);
                y += 20;
                ctx.fillStyle = 'rgba(0, 0, 128, 0.5)';
                ctx.fillText('Тикер 2: ' + document.getElementById('ticker2').value, 10, y);
                y += 20;
                ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            } else {
                ctx.fillText('Тикер: ' + document.getElementById('ticker').value, (this.paramshorizontal != null && this.prices2 && (this.prices2.Prc.length > 0)) ? 50 : 10, y);
                y += 20;
            }
            /*
            var idx = document.getElementById('period').selectedIndex
            var periodText = document.getElementById('period').children[idx].childNodes[0].textContent
            ctx.fillText('Период: ' + periodText, (this.paramshorizontal != null && this.prices2 && (this.prices2.Prc.length > 0)) ? 50 : 10, y);
            y += 20;
            var startDateText = document.getElementById('startDate').value;
            var endDateText = document.getElementById('endDate').value;
            ctx.fillText('Дата: ' + (startDateText == endDateText ? startDateText : startDateText + ' - ' + endDateText), (this.paramshorizontal != null && this.prices2 && (this.prices2.Prc.length > 0)) ? 50 : 10, y);
            y += 20;*/
        }
        if (this.minimode) {
            ctx.save();
            ctx.beginPath();
            var lastprice = this.candles.Cls[this.candles.Cls.length - 1];
            var date = inttodate(this.candles.Date[this.candles.Date.length - 1]);
            text = this.text; // .params.ticker;
            lastclose = this.candles.Opn[0];
            for (var i = this.candles.Cls.length - 1; i >= 1; i--)
                if (inttodate(this.candles.Date[i]).getDate() != inttodate(this.candles.Date[i - 1]).getDate()) {
                    lastclose = this.candles.Cls[i - 1];
                    break;
                }
            ctx.font = "16px Arial";
            var perc = Math.round((lastprice / lastclose - 1) * 10000) / 100;
            if (this.hintMode)
                perc = this.exParams.percent;
            ctx.fillStyle = "#333";
            ctx.textAlign = 'left';
            ctx.fillText(text, Left1, 10);
            ctx.fillStyle = perc < 0 ? redcandlesat : greencandlesat;
            ctx.textAlign = 'right';
            ctx.fillText("{0}({1}%)".format(parseFloat(MyFixed(lastprice)), perc), this.CandleViewWidth2, 10);
            ctx.font = "12px Arial";
            ctx.fillStyle = "#333";
            ctx.textAlign = 'center';
            ctx.fillText(dateTools.toShortStr(date), this.CandleViewWidth2 / 2, 12);
            ctx.closePath();
            ctx.restore();
            if (this.hintMode) {
                let left = 6;
                let top = 15;
                let step = 15;
                ctx.fillStyle = '#333';
                ctx.fillText("ПЕРИОД:" + periodToStr(this.params.period), left, top += step);
                ctx.fillText("ОБОРОТ:" + kendo.toString(this.exParams.volume, "n0") + ' руб.', left, top += step);
                ctx.fillText("ASK:" + this.exParams.ask + '%', left, top += step);
            }
        }
        if ((this.paramshorizontal != null && this.prices2 && (this.prices2.Prc.length > 0)))
            this.drawprices(mousey, minP, maxP);
    }
    this.SetTouchCallBacks = function () {
        var me = this;
        var h = Hammer(this.canvas);
        h.get('pinch').set({
            enable: true
        });
        h.on("pan panstart", function (event) {
            if (event.type == 'panstart') {
                me.hbb = me.begincandle;
                me.hee = me.endcandle;
            } else {
                if (event.pointerType != "touch") return;
                var dx = -Math.floor(event.deltaX * me.scale) * ((me.endcandle - me.begincandle) / (me.CandleViewWidth2 - me.Left));
                me.begincandle = Math.floor(me.hbb + dx);
                me.endcandle = Math.floor(me.hee + dx);
                if (me.begincandle < 0) {
                    me.endcandle -= me.begincandle;
                    me.begincandle = 0;
                }
                if (me.arrlen() - me.endcandle < 3) {
                    l = me.endcandle - me.begincandle;
                    me.endcandle = me.arrlen();
                    me.begincandle = me.endcandle - l;
                }
                me.CompHScroll();
                me.drawcanvas();
            }
        });
        h.on("pinchstart", function (event) {
            if (event.pointerType != "touch") return;
            me.bl = me.begincandle;
            me.el = me.endcandle;
        });
        h.on("pinchmove pinchend", function (event) {
            if (event.pointerType != "touch") return;
            if (me.bl) {
                k = Math.floor((me.el - me.bl) * (1 - 1 / event.scale) / 2);
                me.begincandle = Math.max(0, me.bl + k);
                me.endcandle = Math.min(me.el - k, me.arrlen() - 1);
                if (me.endcandle <= me.begincandle)
                    alert(0);
                me.CompHScroll();
                me.drawcanvas();
            }
        });
    }
    this.SetMouseCallBacks = function () {
        this.SetTouchCallBacks();
        var me = this;
        $(this.canvasid).bind('mousewheel', function (e) {
            if ((!e.shiftKey && me.minimode) || me.GetSelectionMode(e.offsetX, e.offsetY) != 4)
                return true;
            w = Math.floor(-e.originalEvent.wheelDelta / 10);
            if (e.originalEvent.wheelDelta > 0) {
                if (me.lencandle() > 30) {
                    me.begincandle -= w;
                    if (me.endcandle < me.arrlen())
                        me.endcandle += w;
                }
            } else {
                me.begincandle -= w;
                me.endcandle += w;
            }
            if (me.begincandle < 0) me.begincandle = 0;
            if (me.endcandle >= me.arrlen()) me.endcandle = me.arrlen();
            me.CompHScroll();
            me.drawcanvas(me.last_mousex, me.last_mousey);
            return false;
        });
        $(this.canvasid).mouseup(function (ev) {
            me.ev_mouseup(ev)
        });
        document.querySelector(this.canvasid).addEventListener("keydown", function (event) {
            console.log("canvas element level key down: " + me.endcandle, event);
        }, false);
        document.addEventListener("keydown", function (event) {
            if (event.key == "ArrowLeft" && me.begincandle > 0) {
                me.begincandle--;
                me.endcandle--;
            }
            else
                if (event.key == "ArrowRight" && me.endcandle < me.arrlen()) {
                    me.begincandle++;
                    me.endcandle++;
                }
                else
                    return;
            if (me.begincandle < 0) me.begincandle = 0;
            if (me.endcandle >= me.arrlen()) me.endcandle = me.arrlen();
            me.CompHScroll();
            me.drawcanvas(me.last_mousex, me.last_mousey);
            //console.log("document level key down: " + me.endcandle, event);
        }, false);
        $(this.canvasid).mousedown(function (ev) {
            me.ev_mousedown(ev)
        });
        $(this.canvasid).mousemove(function (ev) {
            if ((ev.which || ev.button) != 1)
                me.selmode = 0;
            me.ev_mousemove(ev);
        });
        $(this.canvasid).mouseout(function (ev) {
            me.selectedcandle = -1;
            me.drawcanvas();
            hint.style.overflow = "hidden";
            hint.style.display = "none";
        });
        $(this.canvasid).dblclick(function (ev) {
            if (!me.IsPairTrading) {
                if (me.minimode)
                    OpenCandles({ rperiod: me.params.rperiod, period: me.params.period, ticker: me.params.ticker });
                else
                    if (me.candles.Cls.length && me.lastCandleIndex > -1 && me.params.period > 0 && me.params.period <= 1440) {
                        var cp = ParmasFromCandle(inttodate(me.candles.Date[me.lastCandleIndex]), me.params.period);
                        cp.ticker = me.params.ticker,
                            cp.visualVolume = (me.paramshorizontal != null),
                            cp.oiEnable = me.params.oiEnable,
                            OpenCandles(cp);
                    }
            }
        });
    }
    this.SetWindowCallBacks = function () {
        $(window).resize(function () {
            if (!isMobile2())
                me.updateCanvasWidth();
            /*
            clearTimeout(me.resizeTimer);
            if (!isMobile2())
                me.resizeTimer = setTimeout(me.updateCanvasWidth, 100);*/
        });
    }
    this.conv_mouse_ev = function (ev) {
        var r = this.canvas.getBoundingClientRect();
        ev.offsetX = Math.round(ev.clientX - r.left);
        ev.offsetY = Math.round(ev.clientY - r.top);
        return ev;
    }
    this.newLeft = function () {
        if (typeof (settings) == 'undefined' || (settings.horizStyle))
            return this.Left;
        return 0;
    }
    this.ev_mouseup = function (ev) {
        ev = this.conv_mouse_ev(ev);
        var x, y;
        x = Math.floor(ev.offsetX * me.scale);
        y = Math.floor(ev.offsetY * me.scale);
        if (me.selmode == 4) {
            me.selmode = 0;
            var l = Math.min(this.arrlen(), Math.max(20, Math.floor((1 + (x - px) / (this.CandleViewWidth - this.newLeft()) / 2) * this.lencandle())));
            this.begincandle = Math.max(0, this.endcandle - l);
            this.endcandle = Math.min(this.begincandle + l, this.arrlen());
            this.CompHScroll();
            this.drawcanvas(x, y);
        }
        me.selmode = 0;
    }
    this.GetSelectionMode = function (x, y) {
        //    var r = CandleViewWidth/(this.candles.Cls.length/7 );
        var Top = this.Top;
        if ((x > this.hscrollbarB) && (y > this.canvas.height - 18) && (x < this.hscrollbarE)) return 1;
        if ((y - Top > this.CandleViewHeight - 3) && (y - Top < this.CandleViewHeight + 3)) return 2;
        if ((y - Top > this.DateTimeHeight + this.CandleViewHeight - 3) && (y - Top < this.DateTimeHeight + this.CandleViewHeight + 3)) return 2;
        if ((this.paramshorizontal != null && this.prices2 && (this.prices2.Prc.length > 0)) && (x > this.Left - 3) && (x < this.Left + 3)) return 3;
        if ((x > this.newLeft()) && (y > Top) && (x < this.CandleViewWidth) && (y < this.CandleViewHeight + Top)) return 4;
        return 0;
    }
    this.ev_mousedown = function (ev) {
        var x, y;
        x = Math.floor(ev.offsetX * me.scale);
        y = Math.floor(ev.offsetY * me.scale);
        ev = this.conv_mouse_ev(ev);
        me.selmode = this.GetSelectionMode(x, y);
        px = x;
        py = y;
        //this.beginp = this.begincandle;
    }
    this.ev_mousemove = function (ev) {
        if (this.candles == false)
            return;
        var canvas = this.canvas;
        var ctx = this.ctx;
        ev = this.conv_mouse_ev(ev);
        var x, y;
        x = Math.floor(ev.offsetX * me.scale);
        y = Math.floor(ev.offsetY * me.scale);
        var sm = this.GetSelectionMode(x, y);
        if (sm != 4) {
            hint.style.overflow = "hidden";
            hint.style.display = "none";
        }
        if (sm == 2) canvas.style.cursor = 's-resize';
        else if (sm == 3) canvas.style.cursor = 'w-resize';
        else canvas.style.cursor = 'default';
        if (me.selmode == 2) {
            this.CandleViewHeight += (y - py);
            if (this.CandleViewHeight < 100) this.CandleViewHeight = 100;
            //if (CandleViewHeight > canvas.height - 120) CandleViewHeight = canvas.height - 120;
            this.CandleViewHeight = Math.min(this.CandleViewHeight, canvas.height - this.Top - this.sliderHeight - this.DateTimeHeight - 1);
            py = y;
            this.ComputeSizes(); // Init();
        } else if (me.selmode == 3) {
            this.Left += (x - px);
            if (this.Left < 100) this.Left = 100;
            if (this.Left > canvas.width - 200) this.Left = canvas.width - 200;
            px = x;
            this.ComputeSizes();
            //this.Init();
        } else if (me.selmode == 1) {
            var dx = x - px;
            var len = this.hscrollbarE - this.hscrollbarB;
            this.hscrollbarB += dx;
            this.hscrollbarE += dx;
            if (this.hscrollbarB < this.newLeft()) {
                this.hscrollbarB = this.newLeft();
                this.hscrollbarE = this.hscrollbarB + len;
            }
            if (this.hscrollbarE > this.CandleViewWidth2) {
                this.hscrollbarE = this.CandleViewWidth2;
                this.hscrollbarB = this.hscrollbarE - len;
            }
            var r = (this.CandleViewWidth2 - this.newLeft()) / (this.arrlen());
            this.begincandle = Math.floor((this.hscrollbarB - this.newLeft()) / r);
            this.endcandle = Math.floor((this.hscrollbarE - this.newLeft()) / r);
            if (this.arrlen() - this.endcandle < 3)
                this.endcandle = this.arrlen();
            px = x;
        }
        this.drawcanvas(x, y);
        if (me.selmode == 4) {
            ctx.beginPath();
            ctx.strokeStyle = "#888";
            ctx.moveTo(x, y);
            ctx.lineTo(px, py);
            ctx.stroke();
        }
    }
    this.DrawLegend = function (x, y) {
        if (this.hintMode)
            return;
        function item(i, val) {
            return "<li style='font-size: 12px;'><b>{0}: </b>{1}</li>".format(i, val);
        }
        var hint = document.getElementById("hint");
        if (hint == null)
            return;
        if (x && x > 0) {
            var legenddiv = "<ul style='font-size: 8px;margin: 0; padding: 0px;list-style-type:none'>{0} </ul>";
            var i = Math.floor((x - this.newLeft()) * this.lencandle() / (this.CandleViewWidth - this.newLeft())) + this.begincandle;
            this.lastCandleIndex = i;
            this.selectedcandle = i;
            var v = inttodate(this.candles.Date[i]);
            v = MoscowTimeShift(v);
            var c = this.candles;
            var data = "";
            if (this.IsPairTrading) {
                data += item('<font color="DarkGoldenRod ">Портф1</font>', parseFloat(MyFixed(c.price1[i])));
                data += item('<font color="DarkBlue">Портф2</font>', parseFloat(MyFixed(c.price2[i])));
                data += item('<font color="DarkGoldenRod ">Доход 1</font>', ColorText(c.relprice1[i] - 1, c.relprice1[i] + '%'), 'left');
                data += item('<font color="DarkBlue">Доход 2</font>', ColorText(c.relprice2[i] - 1, c.relprice2[i] + '%'), 'left');
                data += item('Дельта', ColorText(c.profit[i], parseFloat(MyFixed(c.profit[i])) + '%'), 'left');
            } else {
                if (this.params['period'] == 0) {
                    data += item('Price', parseFloat(MyFixed(c.Opn[i])));
                } else {
                    data += item('Opn', c.Opn[i].toString());
                    data += item('Cls', c.Cls[i].toString());
                    data += item('High', c.Max[i].toString());
                    data += item('Low', c.Min[i].toString());
                }
                if (c.Vol[i] != 0) {
                    data += item('Vol', MoneyToStr(c.Vol[i]));
                    data += item('Contracts', c.Qnt[i]);
                    data += item('Buy', c.Bid[i] / 10 + "%");
                    if (this.candles.OpIn)
                        data += item('OpIn', this.candles.OpIn[i]);
                }
            }
            data += item('Date', dateTools.toStr(v));
            if (this.params['period'] < 1440)
                data += item('Time', TimeFormat2(v));
            hint.innerHTML = legenddiv.format(data);
            hint.style.overflow = "visible";
            hint.style.display = "block";
            function getOffset(el) {
                // return   $(this.canvasname).offset();
                //return                   el.offset();
                var _x = 0;
                var _y = 0;
                while (el && !isNaN(el.offsetLeft) && !isNaN(el.offsetTop)) {
                    _x += el.offsetLeft - el.scrollLeft;
                    _y += el.offsetTop - el.scrollTop;
                    el = el.offsetParent;
                }
                return { top: me.canvas.offsetTop, left: me.canvas.offsetLeft };
            }
            var offset = getOffset(me.canvas);
            /*
                   console.log(x22);
               console.log(me.canvas.offsetLeft);
            */
            /*
                       hint.style.left = me.canvas.offsetLeft + x + 5 + "px";
                        hint.style.top = me.canvas.offsetTop  + y + 5 + "px";
              */
            hint.style.left = offset.left + x / me.scale + 5 + "px";
            hint.style.top = offset.top + y / me.scale + 5 + "px";
            //console.log(me.canvas.offsetTop);
        }
        else {
            //  hint.style.overflow = "hidden";
            // hint.style.display = "none";
        }
    }
    this.queryCandlesFullParams = function (p) {
        this.Unsubscribe();
        this.params = p;
        this.queryCandlesFull();
    }
    this.Unsubscribe = function () {
        try {
            //var broadCast = $.connection.candlesHub;
            let key = JSON.stringify({ ticker: this.params.ticker, period: Number(this.params.period) });
            connection.invoke("unSubscribeCandle", key);
            //broadCast.server.unSubscribeCandle(key);
            if (key in candlesObjects)
                delete candlesObjects[key];
        }
        catch (e) {
            console.log('Unsubscribe exception ' + e);
        }
    }
    this.GetParams = function () {
        this.Unsubscribe();
        var params = {};
        for (var key in paramNames)
            if (document.getElementById(paramNames[key])) params[paramNames[key]] = document.getElementById(paramNames[key]).value;
        for (var key in checkBoxNames) {
            //eval(checkBoxNames[key] + ' = ' + document.getElementById(checkBoxNames[key]).checked);
            if (document.getElementById(checkBoxNames[key]))
                params[checkBoxNames[key]] = document.getElementById(checkBoxNames[key]).checked;
        }
        this.params = params;
        if (document.getElementById('visualVolume') && document.getElementById('visualVolume').checked) {
            this.paramshorizontal = CloneObject(params);
            this.paramshorizontal.period = 0;
        }
        else
            this.paramshorizontal = null;
    }
    this.isTickerGraph = function () {
        return this.params.period == 0;
    }
    this.queryPair2 = function () {
        me = this;
        this.prices2 = false;
        this.candles = false;
        this.IsPairTrading = true;
        this.exp1 = this.params.ticker1;
        this.exp2 = this.params.ticker2;
        me = this;
        $.get(sitePrefix + 'api/candles/getRangeSet', CloneObject(this.params), function (data) {
            me.candles = data;
            me.candles.relprice1 = new Array(me.candles.Date.length);
            me.candles.relprice2 = new Array(me.candles.Date.length);
            me.candles.profit = new Array(me.candles.Date.length);
            for (var i = 0; i < me.candles.Date.length; i++) {
                me.candles.relprice1[i] = ((me.candles.price1[i] - me.candles.price1[0]) / Math.abs(me.candles.price1[0]) * 100).toFixed(2);
                me.candles.relprice2[i] = ((me.candles.price2[i] - me.candles.price2[0]) / Math.abs(me.candles.price2[0]) * 100).toFixed(2);
                me.candles.profit[i] = (me.candles.relprice1[i] - me.candles.relprice2[i]);
            }
            me.endcandle = me.candles.Date.length;
            me.begincandle = me.endcandle - me.deflen;
            if (me.begincandle < 0)
                me.begincandle = 0;
            me.updateCanvasWidth();
        });
    }
    this.HR = function () {
        var me = this;
        var x_o = me.last_mousex;
        var y_o = me.last_mousey;
        if (me.paramshorizontal != null) {
            $.get(sitePrefix + 'api/clusters/getRangeOld', this.paramshorizontal, function (data) {
                if ('forbidden' in data) {
                    me.paramshorizontal = null;
                    if (document.getElementById('visualVolume'))
                        document.getElementById('visualVolume').checked = false;
                    $.when(kendo.ui.ExtAlertDialog.show({
                        title: "Платная функция",
                        message: data.message,
                        icon: "k-ext-information"
                    }))
                    return;
                }
                if (data.clusterData.length > 0) {


                    var Prc = new Array(data.clusterData[0].cl.length);
                    var Vol = new Array(data.clusterData[0].cl.length);
                    var bVol = new Array(data.clusterData[0].cl.length);

                    for (var i = 0; i < Prc.length; i++) {
                        Prc[i] = data.clusterData[0].cl[i].p;
                        Vol[i] = data.clusterData[0].cl[i].q;
                        bVol[i] = data.clusterData[0].cl[i].bq;
                    }

                    me.prices2 = { Prc: Prc, Vol: Vol, bVol: bVol, VolumePerQuantity: data.VolumePerQuantity, priceStep: data.priceScale };
                    if (me.Left == 0)
                        me.Left = 200;
                    if (me.candles && me.candles.Opn)
                        me.updateCanvasWidth();
                    me.drawcanvas(x_o, y_o);
                } else {
                    /*
                    document.getElementById('visualVolume').checked = false;
                    if (isMobile2())
                        $("#visualVolume").data("kendoMobileSwitch").check(false);
                    me.visualVolume = false;
                    */
                }
            })
        }
    }
    this.SwitchHR = function (state) {
        if (state)
            me.HR();
        else {
            this.prices2 = false;
            this.Left = 0;
            me.updateCanvasWidth();
        }
    }
    this.queryCandlesFull = function () {
        me = this;
        this.prices2 = false;
        this.candles = false;
        this.busy = true;
        var params = CloneObject(this.params);
        //        params.packed = true;
        if (params['period'] == '0')
            params['count'] = 8000;
        $.get(sitePrefix + 'api/candles/getRange', params, function (data) {
            try {

                var a = Number(params.period);

                if (a !== undefined) {

                    let key = JSON.stringify({ ticker: params.ticker, period: Number(params.period) });
                    candlesObjects[key] = me;
                    connection.invoke("SubscribeCandle", key);
                }

                /*
                if (((typeof (me.params.rperiod) != 'undefined') && me.params.rperiod != 'custom') || (lastDateStr == me.params.endDate)) {
                    let key = JSON.stringify({ ticker: params.ticker, period: Number(params.period) });
                    candlesObjects[key] = me;
                    
                    connection.invoke("SubscribeCandle",key);
                }*/
            }
            catch (e) { }
            if (data.Opn.length == 0) {
                me.candles = data;
                me.drawcanvas();
                me.busy = false;
                return;
            }
            me.candles = data;
            if (!me.minimode)
                document.title = me.params.ticker + ' Свечной график';
            /*
            if (!data.OpIn && document.getElementById('oiEnable')) {
                document.getElementById('oiEnable').checked = false;
                if (isMobile2())
                    $("#oiEnable").data("kendoMobileSwitch").check(false);
            }*/
            //    UnPackCandles(me.candles);
            me.endcandle = me.candles.Date.length;
            me.begincandle = me.endcandle - me.deflen;
            if (me.begincandle < 0)
                me.begincandle = 0;
            me.updateCanvasWidth();
            me.HR();
            me.busy = false;
        });
    }
    this.queryCandlesUpdate = function () {
        if (this.busy || !TickerWorks(this.params.ticker))
            return;
        me = this;
        var params = CloneObject(this.params);
        if (params.timeEnable) {
            var d = params.endDate.split(".");
            var t = params.endTime.split(":");
            if (new Date() > new Date(d[2], d[1] - 1, d[0], t[0], t[1]))
                return;
        }
        if ((params.rperiod == 'custom' || (typeof (params.rperiod) == "undefined")) && kendo.toString(MoscowTime(), "dd.MM.yyyy") != params.endDate) {
            console.log('Not updated ' + JSON.stringify(params) + " _ " + kendo.toString(MoscowTime(), "dd.MM.yyyy"));
            return;
        }
        params.from_stamp = this.candles.Date[this.candles.Date.length - 1];
        //var x_o = me.last_mousex;
        //var y_o = me.last_mousey;
        if (params.period > 0)
            $.get(sitePrefix + 'api/candles/getRangeUpd', params, function (data) {
                if (data == "error")
                    return;
                if (params.packed)
                    UnPackCandles(data);
                me.updateMerge(data);
                /*      me.counter++;
                      if (mergedid) {
                          if (me.paramshorizontal != null && ( me.counter % 15 == 0 || me.params.rperiod =='day' ))
                              me.HR();
                          else
                              me.drawcanvas(x_o, y_o);
                      }*/
            });
    }
    this.updateMerge = function (data) {
        me.mergeCandlesLast(data);
        me.counter++;
        if (mergedid) {
            if (me.paramshorizontal != null && (me.counter % 15 == 0 || me.params.rperiod == 'day'))
                me.HR();
            else
                me.drawcanvas(me.last_mousex, me.last_mousey);
        }
    }
    this.reloadCandles = function () {
        if (!this.busy) {
            me = this;
            this.busy = true;
            if (this.params.period > 0)
                $.get(sitePrefix + 'api/candles/getRange', this.params, function (data) {
                    me.candles = data;
                    me.busy = false;
                    console.log('RELOAD');
                });
        }
        else
            console.log('BUSY BUSY');
    }
    this.mergeCandlesLast = function (candlesLast) {
        //return;
        if (this.candles.Date && candlesLast && candlesLast.Date && candlesLast.Date.length > 0) {
            while (candlesLast.Date.length > 0 && this.candles.Date[this.candles.Date.length - 1] > candlesLast.Date[0]) {
                candlesLast.Date.shift();
                candlesLast.Min.shift();
                candlesLast.Max.shift();
                candlesLast.Opn.shift();
                candlesLast.Cls.shift();
                candlesLast.Vol.shift();
                candlesLast.Qnt.shift();
                candlesLast.Bid.shift();
            }
            if (candlesLast.Date.length > 0 && this.candles.Date[this.candles.Date.length - 1] == candlesLast.Date[0]) {
                var LastCandle = this.candles.Date.length - 1;
                ////
                mergedid = (this.candles.Min[LastCandle] != candlesLast.Min[0]);
                mergedid |= (this.candles.Min[LastCandle] != candlesLast.Min[0]);
                mergedid |= (this.candles.Max[LastCandle] != candlesLast.Max[0]);
                mergedid |= (this.candles.Opn[LastCandle] != candlesLast.Opn[0]);
                mergedid |= (this.candles.Cls[LastCandle] != candlesLast.Cls[0]);
                mergedid |= (this.candles.Vol[LastCandle] != candlesLast.Vol[0]);
                mergedid |= (this.candles.Qnt[LastCandle] != candlesLast.Qnt[0]);
                mergedid |= (this.candles.Bid[LastCandle] != candlesLast.Bid[0]);
                ///
                this.candles.Min[LastCandle] = candlesLast.Min[0];
                this.candles.Max[LastCandle] = candlesLast.Max[0];
                this.candles.Opn[LastCandle] = candlesLast.Opn[0];
                this.candles.Cls[LastCandle] = candlesLast.Cls[0];
                this.candles.Vol[LastCandle] = candlesLast.Vol[0];
                this.candles.Qnt[LastCandle] = candlesLast.Qnt[0];
                this.candles.Bid[LastCandle] = candlesLast.Bid[0];
                if (candlesLast.OpIn && candlesLast.OpIn[0] > 0)
                    this.candles.OpIn[LastCandle] = candlesLast.OpIn[0];
                if (candlesLast.Opn.length > 1) {
                    mergedid = true;
                    for (var i = 1; i < candlesLast.Opn.length; i++) {
                        this.candles.Min.push(candlesLast.Min[i]);
                        this.candles.Max.push(candlesLast.Max[i]);
                        this.candles.Opn.push(candlesLast.Opn[i]);
                        this.candles.Cls.push(candlesLast.Cls[i]);
                        this.candles.Vol.push(candlesLast.Vol[i]);
                        this.candles.Qnt.push(candlesLast.Qnt[i]);
                        this.candles.Bid.push(candlesLast.Bid[i]);
                        this.candles.Date.push(candlesLast.Date[i]);
                        if (candlesLast.OpIn) {
                            this.candles.OpIn.push(candlesLast.OpIn[i]);
                        }
                    }
                    if (this.arrlen() - this.endcandle < 3) {
                        var k = this.arrlen() - this.endcandle; //- 1;
                        this.begincandle += k;
                        this.endcandle += k;
                        this.CompHScroll();
                    }
                }
                //console.log('UPD:' + inttodate(candlesLast.Date[0]));
            } else {
                if (candlesLast.Date.length > 0)
                    this.reloadCandles();
              //  console.log('Can not update');
             //   console.log(inttodate(candlesLast.Date[0]));
//console.log(inttodate(this.candles.Date[this.candles.Date.length - 1]));
            }
        }
    }
    this.freezeCanvas = function () {
        needLogo = true;
        this.drawcanvas();
        this.canvas.toBlob(
            function (blob) {
                uploadImage(blob);
                //saveAs(blob, me.params.ticker + "_" + me.params.period + ".png");
            }, "image/png");
        needLogo = false;
        this.updateCanvasWidth();
        return;
    }
    this.GetCSV = function () {
        var out = "Date;Opn;High;Low;Close;Volume;BidVolume;Quantity;";
        if (this.candles.OpIn)
            out += "OpenPositions;"
        out += "\n";
        for (var i = 0; i < this.arrlen(); i++) {
            out += jDateToStr(inttodate(this.candles.Date[i])) + ";";
            out += this.candles.Opn[i] + ";";
            out += this.candles.Max[i] + ";";
            out += this.candles.Min[i] + ";";
            out += this.candles.Cls[i] + ";";
            out += this.candles.Vol[i] + ";";
            out += MyFixed(this.candles.Vol[i] / 1000 * this.candles.Bid[i]) + ";"
            //            out += this.candles.Qnt[i] + ";";
            //          out += MyFixed(this.candles.Qnt[i] / 1000 * this.candles.Bid[i]) + ";"
            if (this.candles.OpIn)
                out += this.candles.OpIn[i] + ";";
            out += "\n";
        }
        if (!IsPayed)
            alert('Доступно в Для премиум пользователей');
        else
            if (confirm("Сохранить свечи в формате CSV (Можно использовать в Excel)?"))
                saveAs(new Blob([out], {
                    type: "text/plain;charset=" + document.characterSet
                }), me.params.ticker + "_" + me.params.period + ".csv");
    }
}
function CandleScreen() {
    $(document).ready(function () {
        MenuAddCandles(menu);
        c = new CandleChart('myCanvas');
        c.SetMouseCallBacks();
        c.SetWindowCallBacks();
        c.GetParams();
        c.queryCandlesFull();
        setInterval(function () {
            if (document.getElementById('autoUpd') && document.getElementById('autoUpd').checked)
                c.queryCandlesUpdate();
        }, 1000);
        $("#ticker").autocomplete({
            source: function (request, response) {
                $.get(
                    sitePrefix + '/api/common/findbymask', {
                        type: "Candles",
                        mask: request.term
                    },
                    function (data) {
                        response(data);
                    });
            },
            select: function (event, ui) {
                MouseAutoComplete('ticker', event, ui);
                c.GetParams();
                c.queryCandlesFull();
                return false;
            },
            minLength: 1
        });
        //      MenuAddCandles(menu);
    });
}

