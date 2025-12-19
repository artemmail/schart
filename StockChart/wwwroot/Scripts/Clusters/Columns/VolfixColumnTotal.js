class VolfixColumnTotal extends ClusterCoumnBase {
    constructor(parent, ctx, view, mtx) {
        super(parent, ctx, view, mtx, null);
    }

    draw(column, number, mtx) {
        var ctx = this.ctx;
        var z = this.getZIndexVolfix(column);
        for (var j = 0; j < column.cl.length; j++) {
            var i = z[j];
            var isMaxVol = column.cl[i].q == column.qntMax;
            ctx.strokeStyle = isMaxVol ? '#e45200' : 'DodgerBlue';
            ctx.fillStyle = isMaxVol ? 'Coral' : 'CornflowerBlue';
            var r = this.clusterRect(column.cl[i].p, number, mtx);

            var mul = FPsettings.Contracts ? 1 : this.data.VolumePerQuantity * column.cl[i].p;

            if (FPsettings.Contracts)
                r.w = column.cl[i].q * r.w / column.qntMax;
            else
                r.w = mul * column.cl[i].q * r.w / column.volMax;
                          
            r.w *= this.clusterWidthScale;
            ctx.myFillRect(r);
            ctx.myStrokeRect(r);
        }
        this.drawColumnText(ctx, column, number, mtx);
    }
}

