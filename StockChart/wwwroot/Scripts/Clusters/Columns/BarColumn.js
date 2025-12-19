class BarColumn extends ClusterCoumnBase {
    constructor(parent, ctx, view, mtx) {
        super(parent, ctx, view, mtx, null);
    }
    draw(column, number, mtx) {
        var ctx = this.ctx;
        var r1 = mtx.price2Height(column.h, number, mtx);
        var r2 = mtx.price2Height(column.l, number, mtx);
        let w = this.getBar(mtx).w;
        ctx.strokeStyle = (column.o > column.c) ? redcandle : greencandle;
        let ww = Math.max(1, Math.min(5, 1 + (w - 5) / 10.0));
        if (ww > 3 || ww < 1.4) ww = Math.round(ww);
        ctx.lineWidth = ww;
        ctx.beginPath();
        let cent = r1.x + w / 2;
        ctx.myLine(cent, r1.y, cent, r2.y);
        var r1 = mtx.price2Height(column.o, number, mtx);
        var r2 = mtx.price2Height(column.c, number, mtx);
        ctx.myLine(r1.x, r1.y, cent, r1.y);
        ctx.myLine(r1.x + w, r2.y, cent, r2.y);
        ctx.stroke();
        ctx.lineWidth = 1;
        if (!!column.cl)
        for (var i = 0; i < column.cl.length; i++) {
            var r = this.clusterRect(column.cl[i].p, number, mtx);
            r.x += r.w / 2 - ww / 2;
            this.drawMaxVolumeRect(r, column, i);
        }
    }
}

