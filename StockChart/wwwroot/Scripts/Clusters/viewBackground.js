class viewBackground extends canvasPart {
    constructor(parent, ctx, view, mtx) {
        super(parent, ctx, view, mtx, null);
    }


    draw1(parent, ctx, view, mtx) {


        var finishPrice = mtx.Height2Price(view.y - 100);
        var startPrice = mtx.Height2Price(view.y + view.h + 100);
        finishPrice = Math.floor(finishPrice / parent.data.priceScale) * parent.data.priceScale;
        startPrice = Math.max(0, Math.floor(startPrice / parent.data.priceScale) * parent.data.priceScale);
        var r = parent.getBar(mtx);
        r.w = 80 * sscale;
        r.h = Math.abs(r.h);
        var fontSize = parent.clusterRectFontSize(r, 6);
        var hh = fontSize;
        fontSize = Math.max(fontSize, 9 * sscale);
        var textDrawStride = Math.round(Math.max(1, Math.abs((1 + fontSize) / hh)));
        ctx.fillStyle = Gray1;

        for (var price = finishPrice; price > startPrice; price -= parent.data.priceScale * textDrawStride * 2) {
            var r = mtx.price2Height(price, 0, mtx);
            var r2 = mtx.price2Height(price + parent.data.priceScale * textDrawStride, 0, mtx);
            ctx.myFillRect({ x: view.x, y: r.y, w: view.w, h: -r2.y + r.y });
            //  ctx.myLine(view.x, r.y, view.x+ view.w,r.y);
        }
    }

    draw(parent, ctx, view, mtx) {
        var CanvasWidth = this.parent.canvas.width;
        var data = parent.data.clusterData;
        /*ctx.fillStyle = Gray3;
        ctx.myFillRect(parent.clusterTotalViewFill);*/
        ctx.fillStyle = Gray1;
        ctx.setLineDash([5, 3, 5]);
        ctx.beginPath();

        var r1 = parent.clusterRect(data[parent.minIndex].o, parent.minIndex, mtx);



        var horiz = r1.w <= 20 || FPsettings.CandlesOnly;

        if (horiz)
            this.draw1(parent, ctx, view, mtx);

        for (var i = parent.minIndex; i <= parent.maxIndex; i++) {
            var r = parent.clusterRect(/*data[i].cl[0].p*/ data[i].o, i, mtx);


            if (!horiz && r1.w > 20 && i % 2 == 1 && r.w > 20)
                ctx.myFillRect({ x: r.x, y: view.y, w: r.w, h: view.h });

            if ((i > 0) && dateDelimeter(MoscowTimeShift((data[i - 1].x)), MoscowTimeShift((data[i].x)), params.period))
                ctx.myLine(r.x, view.y, r.x, view.y + view.h);

        }


        if (typeof (markset[getMarksKey()]) != 'undefined' && typeof (markset[getMarksKey()].dates) != 'undefined') {
            var mset = markset[getMarksKey()].dates;
            var values = Object.keys(mset);
            var len = values.length;
            for (var i = 0; i < len; i++) {
                var date = values[i];
                var line = mset[date];
                var rgbcolor = hexToRgb(line.color);
                var grd = ctx.createLinearGradient(0, 0, 0, parent.canvas.height);
                grd.addColorStop(0, "rgba({0},{1},{2},0.05)".format(rgbcolor.r, rgbcolor.g, rgbcolor.b));
                grd.addColorStop(1, "rgba({0},{1},{2},0.5)".format(rgbcolor.r, rgbcolor.g, rgbcolor.b));
                ctx.fillStyle = grd;
                var r = parent.clusterRect(100, parent.data.ColumnNumberByDate[date], mtx);
                r.y = 0;
                r.h = parent.canvas.height;
                ctx.myFillRect(r);
            }
        }
        ctx.stroke();
        ctx.restore();
        ctx.save();
        ctx.beginPath();
        ctx.myRect({ x: 0, w: CanvasWidth, y: parent.clusterView.y, h: parent.clusterView.h });
        ctx.clip();
        if (!FPsettings.ToolTip && this.parent.translateMatrix == null && this.parent.selectedPrice != null) {
            var rgbcolor = hexToRgb('#80c4de');
            var grd = ctx.createLinearGradient(0, 0, CanvasWidth, 0);
            grd.addColorStop(0, "rgba({0},{1},{2},0.3)".format(rgbcolor.r, rgbcolor.g, rgbcolor.b));
            grd.addColorStop(1, "rgba({0},{1},{2},0.3)".format(rgbcolor.r, rgbcolor.g, rgbcolor.b));
            ctx.fillStyle = grd;
            var r = parent.clusterRect(Number(this.parent.selectedPrice), 0, mtx);
            r.x = 0;
            r.w = CanvasWidth;
            ctx.myFillRect(r);
        }

        if (FPsettings.ToolTip && !parent.hiddenHint && 'selectedPoint' in parent)
        //if (this.checkPoint(parent.selectedPoint))
        {
            var e = parent.selectedPoint.center;
            ctx.strokeStyle = 'rgba(200, 200, 200, 0.7)';
            ctx.myLine(this.view.x, e.y, this.view.x + this.view.w ,e.y);
            ctx.myLine(e.x, this.view.y,e.x, this.view.y + this.view.h);
            


            var pp = "" + drob( this.mtx.inverse().applyToPoint(e.x, e.y).y,4);

            var lpRect = { x: this.view.x + this.view.w + 5, y: e.y - 9 * sscale, w: (3 + pp.toString().length * 8) * sscale, h: 18 * sscale };


            ctx.fillStyle = "Linen"
            ctx.myFillRect(lpRect);
            ctx.myStrokeRect(lpRect);
            ctx.font = Math.round(12 * sscale) + "px Verdana";
            ctx.fillStyle = '#333';
            ctx.fillText(pp, lpRect.x + 3, lpRect.y + 10);
            ctx.stroke();
        }



        if (typeof (markset[getMarksKey()]) != 'undefined') {
            if (typeof (markset[getMarksKey()].levels) != 'undefined') {
                var mset = markset[getMarksKey()].levels
                var values = Object.keys(mset);
                var fontSize = Math.min(maxFontSize, Math.abs(parent.getBar(mtx).h));
                ctx.font = fontSize + "px Verdana";
                ctx.textAlign = "right";
                ctx.textBaseline = "middle";
                for (var i = 0; i < values.length; i++) {
                    var price = parseFloat(values[i]);
                    var line = mset[price];
                    var rgbcolor = hexToRgb(line.color);
                    var grd = ctx.createLinearGradient(0, 0, CanvasWidth, 0);
                    grd.addColorStop(0, "rgba({0},{1},{2},0.6)".format(rgbcolor.r, rgbcolor.g, rgbcolor.b));
                    grd.addColorStop(1, "rgba({0},{1},{2},0.8)".format(rgbcolor.r, rgbcolor.g, rgbcolor.b));
                    ctx.fillStyle = grd;
                    var r = parent.clusterRect(price, 0, mtx);
                    r.x = 0;
                    r.w = CanvasWidth;
                    ctx.myFillRect(r);
                    if (fontSize > 7 && line.comment != '') {
                        ctx.fillStyle = 'rgba(0,0,0,0.8)';
                        var y = r.y + parent.getBar(mtx).h / 2;
                        ctx.fillText(line.comment, r.w - LegendPriceWidth - 5, y);
                    }
                }
            }
        }
        ctx.restore();
    }
}

