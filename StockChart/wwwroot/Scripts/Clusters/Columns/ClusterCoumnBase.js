class ClusterCoumnBase  {
    constructor(parent, ctx, view, mtx) {
        this.ctx = ctx;
        this.view = view;
        this.parent = parent;
        this.mtx = mtx;
        this.data = parent.data;

        this.startPrice = parent.startPrice;
        this.finishPrice = parent.finishPrice;
        this.clusterWidthScale = parent.clusterWidthScale;
    }
    drawMaxVolumeRect(r, column, i) {
        if (('MaxTrades' in FPsettings) && FPsettings.MaxTrades) {
            let x = r.x;
            let y = r.y + r.h / 2;
            let ctx = this.ctx;
            if (Math.abs(column.cl[i].mx) > this.data.maxt2) {
                ctx.fillStyle = column.cl[i].mx > 0 ? greencandlesat : redcandlesat;
                ctx.strokeStyle = column.cl[i].mx > 0 ? greenCandleBorder : redCandleBorder;
                var rh = Math.max(10, Math.abs(r.h));
                var hh = Math.abs(Math.sqrt(Math.abs(column.cl[i].mx) / this.data.maxt1) * rh);
                ctx.beginPath();
                ctx.moveTo(x, y);
                ctx.lineTo(x - hh, y - hh * 0.66);
                ctx.lineTo(x - hh, y + hh * 0.66);
                ctx.lineTo(x, y);
                ctx.fill();
                ctx.stroke();
            }
        }
    }
    getZIndexDelta(column) {
        return this.getZIndex(column, function (a, b) { return Math.abs(2 * column.cl[a].bq - column.cl[a].q) - Math.abs(2 * column.cl[b].bq - column.cl[b].q) });
    }
    getZIndex(column, lambda) {
        var arr = new Array(column.cl.length);
        for (var i = 0; i < arr.length; i++) arr[i] = i;
        arr.sort(lambda);
        return arr;
    }
    getZIndexVolfix(column) {
        return this.getZIndex(column, function (a, b) { return column.cl[a].q - column.cl[b].q });
    }
    getZIndexDensity(column) {
        return this.getZIndex(column, function (a, b) { return Math.abs(column.cl[a].mx) - Math.abs(column.cl[b].mx) });
    }
    drawOpenClose(ctx, column, number, mtx) {
        if (FPsettings.OpenClose && ('o' in column) && column.o > 0) {
            let wide = FPsettings.style != 'ASKxBID' && !(FPsettings.style == 'VolumeDelta' && FPsettings.deltaStyle == 'Delta');
            if (wide)
                ctx.fillStyle = (column.o > column.c) ? redcandleAA : greencandleAA;
            else
                ctx.fillStyle = (column.o > column.c) ? redcandle : greencandle;
            var r1 = mtx.price2Height(column.o, number, mtx);
            var r2 = mtx.price2Height(column.c, number, mtx);
            ctx.fillRect(r1.x, r1.y, !wide ? 2 : this.getBar(mtx).w, r2.y - r1.y);
        }
    }
    
    getBar(mtx) {
        var p1 = mtx.applyToPoint(0, 0);
        var p2 = mtx.applyToPoint(1, this.data.priceScale);
        return { w: p2.x - p1.x, h: p2.y - p1.y };
    }
    clusterRect(price, columnNumber, mtx) {
        var p1 = mtx.applyToPoint(columnNumber, price - this.data.priceScale / 2);
        var p2 = mtx.applyToPoint(columnNumber + 1, price + this.data.priceScale / 2);
        return { x: p1.x, y: p1.y, w: p2.x - p1.x, h: p2.y - p1.y };
    }
    clusterRect2(price, columnNumber, w, mtx) {
        var p1 = mtx.applyToPoint(columnNumber, price - this.data.priceScale / 2);
        var p2 = mtx.applyToPoint(columnNumber + w, price + this.data.priceScale / 2);
        return { x: p1.x, y: p1.y, w: p2.x - p1.x, h: p2.y - p1.y };
    }
    clusterFontSize(mtx, textLen) {
        return this.clusterRectFontSize(this.clusterRect(0, 0, mtx), textLen)
    }
    clusterRectFontSize(rect, textLen) {
        var w = Math.abs(rect.w);
        var h = Math.abs(rect.h);
        return Math.min(h - 1, w / textLen, maxFontSize);
    }

    drawColumnText(ctx, column, number, mtx) {
        var fontSize = this.clusterFontSize(mtx, (FPsettings.style == 'ASKxBID') ? 9 : 5);
        if (fontSize > 8) {
            ctx.font = "" + fontSize + "px Verdana";
            ctx.textBaseline = "middle";
            ctx.fillStyle = WhiteText;
            for (var i = 0; i < column.cl.length; i++) {
                if (column.cl[i].p >= this.startPrice && column.cl[i].p <= this.finishPrice) {
                    var r = this.clusterRect(column.cl[i].p, number, mtx);

                    var mul = FPsettings.Contracts? 1 : this.data.VolumePerQuantity * column.cl[i].p;

                  //  var w = column.cl[i].q * this.getBar(mtx).w / this.data.maxClusterQnt;
                    var text = Math.round(column.cl[i].q * mul);
                    if (FPsettings.style == 'Ruticker') {
                        if (FPsettings.classic == 'ASK')
                            text = Math.round(column.cl[i].bq * mul);
                        if (FPsettings.classic == 'BID')
                            text = Math.round(mul *(column.cl[i].q - column.cl[i].bq));
                        if (FPsettings.classic == 'ASK-BID')
                            text = Math.round(mul *( 2 * column.cl[i].bq - column.cl[i].q));
                    }
                    ctx.fillText(MoneyToStr(text), r.x + 1.5, r.y + this.getBar(mtx).h / 2);
                }
            }
        }
    }
    drawColumnTextTree(ctx, column, number, mtx) {
        var fontSize = this.clusterFontSize(mtx, (FPsettings.style == 'ASKxBID') ? 9 : 5);
        if (fontSize > 8) {
            ctx.font = "" + fontSize + "px Verdana";
            ctx.textBaseline = "middle";
            ctx.fillStyle = WhiteText;
            for (var i = 0; i < column.cl.length; i++) {
                if (column.cl[i].p >= this.startPrice && column.cl[i].p <= this.finishPrice) {
                    var r = this.clusterRect(column.cl[i].p, number, mtx);

                    var mul = FPsettings.Contracts ? 1 : this.data.VolumePerQuantity * column.cl[i].p;
                  
                    ctx.textAlign = "right";
                    if (Math.round(column.cl[i].q - column.cl[i].bq) != 0)
                        ctx.fillText(Math.round(mul *(column.cl[i].q - column.cl[i].bq)), r.w / 2 + r.x - 1.5, r.y + this.getBar(mtx).h / 2);
                    ctx.textAlign = "left";
                    if (Math.round(column.cl[i].bq) != 0)
                        ctx.fillText(Math.round(mul*column.cl[i].bq), r.w / 2 + r.x + 1.5, r.y + this.getBar(mtx).h / 2);
                }
            }
        }
    }
    drawColumnTextDeltaTree(ctx, column, number, mtx) {
        var fontSize = this.clusterFontSize(mtx, (FPsettings.style == 'ASKxBID') ? 9 : 5);
        if (fontSize > 8) {
            ctx.font = "" + fontSize + "px Verdana";
            ctx.textBaseline = "middle";
            ctx.fillStyle = WhiteText;
            for (var i = 0; i < column.cl.length; i++) {
                if (column.cl[i].p >= this.startPrice && column.cl[i].p <= this.finishPrice) {
                    var r = this.clusterRect(column.cl[i].p, number, mtx);

                    var mul = FPsettings.Contracts ? 1 : this.data.VolumePerQuantity * column.cl[i].p;
                  
                    let t = Math.round(mul*column.cl[i].q);
                    ctx.textAlign = "right";
                    if (t != 0)
                        ctx.fillText(t, r.w / 2 + r.x - 1.5, r.y + this.getBar(mtx).h / 2);
                    t = Math.round(mul *(2 * column.cl[i].bq - column.cl[i].q));
                    ctx.textAlign = "left";
                    if (t != 0)
                        ctx.fillText(t, r.w / 2 + r.x + 1.5, r.y + this.getBar(mtx).h / 2);
                }
            }
        }
    }
    drawClassicColumn_(column, number, mtx, total) {
        var ctx = this.ctx;
        this.drawOpenClose(ctx, column, number, mtx);
        
        var maxDelta = !total ? this.data.maxDelta : column.maxDelta;
        var maxVol = !total ? this.data.maxClusterQnt : column.qntMax;
        var maxVolAsk = !total ? this.data.maxClusterQntAsk : column.qntAskMax;
        var maxVolBid = !total ? this.data.maxClusterQntBid : column.qntBidMax;

        if (!FPsettings.Contracts) {
            maxVol = !total ? this.data.maxClusterVol : column.volMax;
            maxVolAsk = !total ? this.data.maxClusterVolAsk : column.volAskMax;
            maxVolBid = !total ? this.data.maxClusterVolBid : column.volBidMax;
            maxDelta = !total ? this.data.maxDeltaV : column.maxDeltaV;
        }


        var maxVolAskBid = Math.max(maxVolAsk, maxVolBid);
        var bar = this.getBar(mtx);
        var drawBorder = Math.abs(bar.w) > 20 && Math.abs(bar.h) > 6;
        var z = this.getZIndexVolfix(column);
        for (var j = 0; j < column.cl.length; j++) {
            var i = z[j];
            if (column.cl[i].p >= this.startPrice && column.cl[i].p <= this.finishPrice) {

                var mul = FPsettings.Contracts ? 1 : this.data.VolumePerQuantity * column.cl[i].p;

                var r = this.clusterRect(column.cl[i].p, number, mtx);
                if (FPsettings.classic == 'ASK+BID') {
                    r.w = mul * column.cl[i].q * bar.w / maxVol;
                    r.w *= this.clusterWidthScale;
                    //  var rr = CloneObject(r);
                    ctx.strokeStyle = redCandleBorder;
                    ctx.fillStyle = redcandle;
                    if (drawBorder) {
                        ctx.myFillRect(r);
                        ctx.myStrokeRect(r);
                    }
                    else
                        ctx.myFillRectSmoothX(r);
                    r.w = mul * column.cl[i].bq * bar.w / maxVol;
                    r.w *= this.clusterWidthScale;
                    ctx.strokeStyle = greenCandleBorder;
                    ctx.fillStyle = greencandle;
                    if (drawBorder) {
                        ctx.myFillRect(r);
                        ctx.myStrokeRect(r);
                    }
                    else
                        ctx.myFillRectSmoothX(r);
                }
                if (FPsettings.classic == 'ASK-BID') {
                    let qbq = 2 * column.cl[i].bq - column.cl[i].q;
                    let absqbq = Math.abs(mul * qbq);
                    r.w = absqbq * bar.w / Math.abs(maxDelta);
                    r.w *= this.clusterWidthScale;
                    //var rr = CloneObject(r);
                    ctx.strokeStyle = redCandleBorder;
                    ctx.fillStyle = qbq < 0 ? redcandle : greencandle;
                    if (drawBorder) {
                        ctx.myFillRect(r);
                        ctx.myStrokeRect(r);
                    }
                    else
                        ctx.myFillRectSmoothX(r);
                }
                if (FPsettings.classic == 'ASK/BID') {
                    ctx.strokeStyle = redCandleBorder;
                    ctx.fillStyle = redcandle;
                    var w = (column.cl[i].q - column.cl[i].bq) * bar.w / maxVolAskBid;
                    w *= mul *  this.clusterWidthScale;
                    ctx.myFillRect({ x: r.x, y: r.y + r.h / 2, w: w, h: r.h / 2 });
                    var w2 = mul *  column.cl[i].bq * bar.w / maxVolAskBid;
                    w2 *= this.clusterWidthScale;
                    ctx.fillStyle = greencandle;
                    ctx.myFillRect({ x: r.x, y: r.y, w: w2, h: r.h / 2 });
                    ctx.strokeStyle = '#aaa';
                    if (drawBorder)
                        ctx.myStrokeRect({ x: r.x, y: r.y, w: Math.max(w, w2), h: r.h });
                }
                if (FPsettings.classic == 'Tree') {
                    ctx.strokeStyle = redCandleBorder;
                    ctx.fillStyle = redcandle;
                    var w = mul *  (column.cl[i].q - column.cl[i].bq) * bar.w / maxVolAskBid;
                    w *= this.clusterWidthScale;
                    ctx.myFillRect({ x: r.x + bar.w / 2, y: r.y, w: -w / 2, h: r.h });
                    var w2 = mul *  column.cl[i].bq * bar.w / maxVolAskBid;
                    w2 *= this.clusterWidthScale;
                    ctx.fillStyle = greencandle;
                    ctx.myFillRect({ x: r.x + bar.w / 2, y: r.y, w: w2 / 2, h: r.h });
                    ctx.strokeStyle = '#aaa';
                    if (drawBorder)
                        ctx.myStrokeRect({ x: r.x + bar.w / 2 - w / 2, y: r.y, w: (w + w2) / 2, h: r.h });
                }
                if (FPsettings.classic == 'ASK') {
                    r.w = mul *  column.cl[i].bq * bar.w / maxVolAsk;
                    r.w *= this.clusterWidthScale;
                    ctx.strokeStyle = greenCandleBorder;
                    ctx.fillStyle = greencandle;
                    if (drawBorder) {
                        ctx.myFillRect(r);
                        ctx.myStrokeRect(r);
                    }
                    else
                        ctx.myFillRectSmoothX(r);
                }
                if (FPsettings.classic == 'BID') {
                    r.w = mul *  (column.cl[i].q - column.cl[i].bq) * bar.w / maxVolBid;
                    r.w *= this.clusterWidthScale;
                    ctx.strokeStyle = redCandleBorder;
                    ctx.fillStyle = redcandle;
                    ctx.myFillRect(r);
                    if (drawBorder) {
                        ctx.myFillRect(r);
                        ctx.myStrokeRect(r);
                    }
                    else
                        ctx.myFillRectSmoothX(r);
                }
                if (!total)
                    this.drawMaxVolumeRect(r, column, i);
            }
        }
        if (FPsettings.classic == 'Tree')
            this.drawColumnTextTree(ctx, column, number, mtx);
        else
            this.drawColumnText(ctx, column, number, mtx);
    }
}

