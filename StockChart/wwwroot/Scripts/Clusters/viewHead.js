class viewHead extends canvasPart {
    constructor(parent, ctx, view, mtx) {
        super(parent, ctx, view, mtx, 'bottom');       
    }
    draw(parent, ctx, view, mtx) {
        var r = mtx.applyToPoint(0, 0);
        var r2 = mtx.applyToPoint(0 + 1, 1);
        r.w = r2.x - r.x;
        r.h = r2.y - r.y;
        this.fontSize = parent.clusterRectFontSize(r, 6);
        if (this.fontSize < 8)
            this.drawDelta(parent, ctx, view, mtx);
        else
            for (var i = parent.minIndex; i <= parent.maxIndex; i++)
                this.drawHeadColumn(parent, ctx, view, mtx, i);
        ctx.restore();
        if (('totalMode' in FPsettings) && (FPsettings.totalMode == "Left") && parent.data.ableCluster()) {
            ctx.save();
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.font = "bold " + Math.round(11 * sscale) + "px Verdana";
            mtx = this.mtx.reassignX({ x1: 0, x2: 1 }, { x1: 0, x2: view.x });
            var im = parent.topLinesCount();
            if (this.fontSize < 8) {
                var p1 = mtx.applyToPoint(0, 0);
                var p2 = mtx.applyToPoint(1, im);
                ctx.fillStyle = "Linen";//Color1;
                ctx.myFillRectXY(p1, p2);
                ctx.myStrokeRectXY(p1, p2);
                ctx.fillStyle = WhiteText;
                ctx.fillText('Накопл. Дельта', (p1.x + p2.x) / 2, (p1.y + p2.y) / 2);
            }
            else {
                var labels = ['Накопл. Дельта', 'Дельта(ASK-BID)'];
                if (parent.topVolumes()) labels.push('Объем');
                if (parent.oiEnable()) labels.push('ОИ дельта/2');
                for (var i = 0; i < im; i++) {
                    var p1 = mtx.applyToPoint(0, i);
                    var p2 = mtx.applyToPoint(1, i + 1);
                    ctx.fillStyle = "Linen";//Color1;
                    ctx.myFillRectXY(p1, p2);
                    ctx.myStrokeRectXY(p1, p2);
                    ctx.fillStyle = WhiteText;
                    ctx.fillText(labels[i], (p1.x + p2.x) / 2, (p1.y + p2.y) / 2);
                }
            }
        }
    }
    drawDelta(parent, ctx, view, mtx) {
        var d = (parent.data.maxCumDelta - parent.data.minCumDelta) / 10;
        var m = mtx.reassignY({ y1: parent.data.minCumDelta - d, y2: d + parent.data.maxCumDelta }, { y1: view.h + view.y, y2: view.y });
        function dr() {
            ctx.beginPath();
            for (var i = parent.minIndex; i <= parent.maxIndex; i++) {
                var y = parent.data.clusterData[i].cumDelta;
                var p = m.applyToPoint(i + 0.5, y);
                if (i != parent.minIndex)
                    ctx.lineTo(p.x, p.y);
                else
                    ctx.moveTo(p.x, p.y);
            }
            ctx.stroke();
        }
        var p1 = m.applyToPoint(parent.minIndex + 0.5, 0);
        var p2 = m.applyToPoint(parent.maxIndex + 0.5, 0);
        ctx.strokeStyle = "#ddd";
        ctx.beginPath();
        ctx.myLine(p1.x, p1.y, p2.x, p2.y);
        ctx.stroke();
        ctx.restore();
        ctx.save();
        ctx.strokeStyle = greencandle;
        ctx.beginPath();
        ctx.myRectXY({ x: view.x, y: view.y }, { x: view.x + view.w, y: p1.y });
        ctx.clip();
        dr();
        ctx.restore();
        ctx.save();
        ctx.strokeStyle = redcandle;
        ctx.beginPath();
        ctx.myRectXY({ x: view.x, y: p1.y }, { x: view.x + view.w, y: view.h + view.y });
        ctx.clip();
        dr();
        ctx.restore();
    }
    drawText(r,text) {
        if (this.fontSize > 7) {
            this.ctx.fillStyle = WhiteText;
            this.ctx.fillText(text, r.x + r.w / 2, r.y + r.h / 2);
        }
        r.y += r.h;
    }
    drawTextS(r,v) {
        /*if (text > 1000)
            drawText(Math.Round(text));
        else*/
        this.drawText(r,drob(v));
    }
    drawHeadColumn(parent, ctx, view, mtx, number) {
        var column = parent.data.clusterData[number];
        var r = mtx.applyToPoint(number, 0);
        var r2 = mtx.applyToPoint(number + 1, 1);
        r.w = r2.x - r.x;
        r.h = r2.y - r.y;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.font = this.fontSize + "px Verdana";
        ctx.fillStyle = getGradientColorEx('#d61800', '#ffffff', '#04a344', Math.max(Math.abs(parent.data.maxCumDelta), Math.abs(parent.data.minCumDelta)), column.cumDelta);
        ctx.strokeStyle = lineColor;
        ctx.myFillRect(r);
        ctx.myStrokeRect(r);
        this.drawTextS(r,column.cumDelta);
        ctx.fillStyle = getGradientColorEx('#d61800', '#ffffff', '#04a344', Math.max(Math.abs(parent.data.maxColumnDelta), Math.abs(parent.data.minColumnDelta)), column.deltaTotal);
        ctx.strokeStyle = lineColor;
        ctx.myFillRect(r);
        ctx.myStrokeRect(r);
        this.drawTextS(r,column.deltaTotal);
        if (this.parent.topVolumes()) {
            ctx.myStrokeRect(r);
            this.drawTextS(r,column.q);
        }
        if (this.parent.oiEnable()) {
            // ctx.myStrokeRect(r);
            ctx.fillStyle = getGradientColorEx('#d61800', '#ffffff', '#04a344', parent.data.maxAbsOIDelta, column.oiDelta);
            ctx.strokeStyle = lineColor;
            ctx.myFillRect(r);
            ctx.myStrokeRect(r);
            this.drawText(r,column.oiDelta);
        }
        ctx.textAlign = "left";
    }
}
