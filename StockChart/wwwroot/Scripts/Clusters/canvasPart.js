class canvasPart {

    constructor(parent, ctx, view, mtx, draggable = null) {
        this.ctx = ctx;
        this.view = view;
        this.parent = parent;
        this.mtx = mtx;
        this.draggable = draggable;
    }

    drawVertical() {
        var parent = this.parent;
        if (FPsettings.ToolTip && !parent.hiddenHint && 'selectedPoint' in parent) {
            var e = parent.selectedPoint.center;
            this.ctx.strokeStyle = 'rgba(200, 200, 200, 0.7)';
            this.ctx.myLine(e.x, this.view.y, e.x, this.view.y + this.view.h);
            this.ctx.stroke();
        }
    }

    drawCanvas() {
        this.ctx.save();
        this.ctx.beginPath();
        this.ctx.myRect(this.view);
        this.ctx.clip();
        if ('draw' in this) {
            this.draw(this.parent, this.ctx, this.view, this.mtx)
        }
        this.ctx.restore();
    }
    checkPoint(point) {
        var view = this.view;
        return (point.x >= view.x && point.y >= view.y && point.x <= view.x + view.w && point.y <= view.y + view.h)
    }

    checkDraggable(point) {
        if (this.draggable == null)
            return false;
        var view;
        //var view1;
        switch (this.draggable) {
            case 'left':
                view = { x: this.view.x - 3, y: this.view.y, w: 6, h: this.view.h };
                break;
            case 'right':
                view = { x: this.view.x + this.view.w - 3, y: this.view.y, w: 6, h: this.view.h };
                break;
            case 'top':
                view = { x: this.view.x, y: this.view.y - 3, h: 6, w: this.view.w };
                break;
            case 'bottom':
                view = { x: this.view.x, y: this.view.h + this.view.y - 3, h: 6, w: this.view.w };
                break;
        }
        return (point.x >= view.x && point.y >= view.y && point.x <= view.x + view.w && point.y <= view.y + view.h);
    }

    DrawZebra(ctx, Left, Top, Width, Height, minPrice, maxPrice) {
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
            ctx.fillText(MoneyToStr(y), Width + Left + 10, yy);
            ctx.stroke();
        }

    }
}

