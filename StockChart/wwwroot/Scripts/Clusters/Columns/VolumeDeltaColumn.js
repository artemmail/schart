class VolumeDeltaColumn extends ClusterCoumnBase {
    constructor(parent, ctx, view, mtx) {
        super(parent, ctx, view, mtx, null);
    }
    draw(column, number, mtx) {
        var ctx = this.ctx;
        this.drawOpenClose(ctx, column, number, mtx);
        var z = this.getZIndexDelta(column);
        var ww;
        var shift = FPsettings.OpenClose ? 2 : 0;
        for (var j = 0; j < column.cl.length; j++) {
            var i = z[j];
            if (column.cl[i].p >= this.startPrice && column.cl[i].p <= this.finishPrice) {
                var delta = 2 * column.cl[i].bq - column.cl[i].q;
                ctx.fillStyle = getGradientColorEx('#d61800', '#ffffff', '#04a344', this.data.maxDelta, delta);
                var r = this.clusterRect(column.cl[i].p, number, mtx);
                r.x += shift;
                r.w -= shift;
                r.w -= 1;
                r.w /= 2;
                r.x += r.w;
                ww = r.w;
                ctx.myFillRect(r);
                ctx.fillStyle = getGradientColorEx('#d61800', '#ffffff', '#6495ED', this.data.maxClusterQnt, column.cl[i].q);
                r.x -= r.w;
                ctx.myFillRect(r);
                r.w--;
                ctx.strokeStyle = '#c0c0c0';
                ctx.myStrokeRect(r);
                r.w++;
                r.x += r.w;
                if (column.maxDelta == Math.abs(delta))
                    ctx.strokeStyle = delta > 0 ? greencandlesat : redcandlesat;
                else
                    ctx.strokeStyle = '#c0c0c0';
                ctx.myStrokeRect(r);
                this.drawMaxVolumeRect(this.clusterRect(column.cl[i].p, number, mtx), column, i);
            }
        }
        var z = this.getZIndexVolfix(column);
        var z = z[z.length - 1];
        var r = this.clusterRect(column.cl[z].p, number, mtx);
        r.x += shift;
        r.w = ww - 1;
        ctx.strokeStyle = 'DodgerBlue';
        ctx.myStrokeRect(r);
        var bar = this.getBar(mtx);
        var fontSize = this.clusterFontSize(mtx, 9);
        if (fontSize > 7) {
            ctx.font = "" + fontSize + "px Verdana";
            ctx.textBaseline = "middle"; ctx.textBaseline = "middle";
            ctx.fillStyle = WhiteText;
            for (var i = 0; i < column.cl.length; i++) {
                var r = this.clusterRect(column.cl[i].p, number, mtx);
                var w = column.cl[i].q * r.w / this.data.maxClusterQnt;
                r.x += shift;
                var delta = 2 * column.cl[i].bq - column.cl[i].q;
                ctx.fillText(column.cl[i].q, r.x + 1.5, r.y + bar.h / 2);
                r.x += ww;
                ctx.fillText(delta, r.x + 1.5, r.y + bar.h / 2);
            }
        }
    }
}

