class viewScrollBars extends canvasPart {
    constructor(parent, ctx, view, mtx) {
        super(parent, ctx, view, mtx, null);
    }
    draw(parent, ctx, view, mtx) {
        if (!this.parent.IsStartVisible()) {
            var grd = ctx.createLinearGradient(view.x - GradientWidth, 0, view.x + GradientWidth, 0);
            grd.addColorStop(0, WhiteGradient);
            grd.addColorStop(1, "transparent");
            this.ctx.fillStyle = grd;
            this.ctx.fillRect(view.x, view.y, GradientWidth * 2, view.h);
        }
        if (!this.parent.IsPriceVisible()) {
            var grd2 = ctx.createLinearGradient(view.x + view.w - GradientWidth, 0, view.x + view.w + GradientWidth, 0);
            grd2.addColorStop(1, WhiteGradient);
            grd2.addColorStop(0, "transparent");
            this.ctx.fillStyle = grd2;
            this.ctx.fillRect(view.x + view.w - GradientWidth, view.y, GradientWidth, view.h);
        }
        if (this.parent.translateMatrix != null) {
            ctx.fillStyle = Gray4;
            var p1 = this.parent.mtxMain.inverse().applyToPoint(view.x, view.y);
            var p2 = this.parent.mtxMain.inverse().applyToPoint(view.x + view.w, view.h + view.y);
            var m1 = (new Matrix()).reassignX({ x1: 0, x2: this.parent.data.clusterData.length }, { x1: view.x, x2: view.x + view.w })
                .reassignY({ y1: 0, y2: view.h }, { y1: view.y, y2: view.y + view.h });
            var m2 = (new Matrix()).reassignY({ y1: this.parent.data.maxPrice, y2: this.parent.data.minPrice }, { y1: view.y, y2: view.y + view.h })
                .reassignX({ x1: 0, x2: view.w }, { x1: view.x, x2: view.x + view.w });
            var v1 = m1.applyToPoint(p1.x, 2);
            var v2 = m1.applyToPoint(p2.x, 4)
            if (v2.x - v1.x < view.w)
                ctx.myFillRectXY(v1, v2);
            var h1 = m2.applyToPoint(2, p1.y);
            var h2 = m2.applyToPoint(4, p2.y)
            if (h2.y - h1.y < view.h)
                ctx.myFillRectXY(h1, h2);
        }
        if (this.parent.markupEnabled)
            this.parent.markupManager.drawAll();

        ctx.strokeStyle = lineColor;
        ctx.myStrokeRect(this.view);

    /*    var x = this.view.x + 3 * scale;
        var y = this.view.y + this.view.h - 3 * scale;
        //   y=      GraphTopSpace + 30;
        ctx.font = 'bold 24px Fira Sans';
        ctx.fillStyle = 'rgba(221, 65, 42, 0.9)';
        ctx.fillText("Stock", x, y);
        x += 60;
        ctx.fillStyle = 'rgba(80, 80, 80, 0.9)';
        ctx.fillText("Chart", x, y);
        x += 60;
        ctx.fillStyle = 'rgba(221, 65, 42, 0.9)'
        ctx.fillText(".", x, y);
        x += 5;
        ctx.fillStyle = 'rgba(80, 80, 80, 0.9)';
        ctx.fillText("ru", x, y);*/
    }
}

