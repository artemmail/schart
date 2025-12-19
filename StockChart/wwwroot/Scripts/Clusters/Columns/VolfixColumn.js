class VolfixColumn extends ClusterCoumnBase {
    constructor(parent, ctx, view, mtx) {
        super(parent, ctx, view, mtx, null);

        this.filters = null;
        if (typeof (markset[getMarksKey()]) != 'undefined') {
            if (typeof (markset[getMarksKey()].filters.volume1) != 'undefined')
                this.filters = markset[getMarksKey()].filters;
        }

    }
    draw(column, number, mtx) {

        

        var ctx = this.ctx;
        this.drawOpenClose(ctx, column, number, mtx);
        var z = this.getZIndexVolfix(column);
        var bar = this.getBar(mtx);
        var drawBorder = Math.abs(bar.w) > 20 && Math.abs(bar.h) > 6;

        for (var j = 0; j < column.cl.length; j++) {
            var i = z[j];
            if (column.cl[i].p >= this.startPrice && column.cl[i].p <= this.finishPrice) {

                var mul = FPsettings.Contracts ? 1 : this.data.VolumePerQuantity * column.cl[i].p;

                if (this.filters != null && (this.filters.volume1 != 0 || this.filters.volume2 != 0)) {
                    ctx.strokeStyle = 'DodgerBlue';
                    ctx.fillStyle = 'CornflowerBlue';
                    if (column.cl[i].q >= this.filters.volume1) {
                        ctx.strokeStyle = '#e45200';
                        ctx.fillStyle = 'Coral';
                        if (this.filters.volume2 > 0 && column.cl[i].q >= this.filters.volume2) {
                            ctx.strokeStyle = 'GoldenRod';
                            ctx.fillStyle = 'Gold';
                        }
                    }
                }
                else {
                    var isMaxVol = column.cl[i].q == column.qntMax;
                    ctx.strokeStyle = isMaxVol ? '#e45200' : 'DodgerBlue';
                    ctx.fillStyle = isMaxVol ? 'Coral' : 'CornflowerBlue';
                }
                var r = this.clusterRect(column.cl[i].p, number, mtx);

                if(FPsettings.Contracts)
                    r.w = column.cl[i].q * r.w / this.data.maxClusterQnt;
                else
                    r.w = mul * column.cl[i].q * r.w / this.data.maxClusterVol;

                r.w *= this.clusterWidthScale;
                if (drawBorder) {
                    ctx.myFillRect(r);
                    ctx.myStrokeRect(r);
                }
                else
                    ctx.myFillRectSmoothX(r);
                this.drawMaxVolumeRect(r, column, i);
            }
        }
        this.drawColumnText(ctx, column, number, mtx);
    }
}

