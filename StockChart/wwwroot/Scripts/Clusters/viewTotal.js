class viewTotal extends canvasPart {
    constructor(parent, ctx, view, mtx) {
        super(parent, ctx, view, mtx, 'right');
    }

    draw(parent, ctx, view, mtx) {
        var ColumnBuilder;
        switch (FPsettings.style) {
            case 'Ruticker':
        //    case 'Volume':
                ColumnBuilder = new ClassicColumnTotal(parent, ctx, view, mtx);
                break;
            default:
                ColumnBuilder = new VolfixColumnTotal(parent, ctx, view, mtx);
                break;
        }

        ColumnBuilder.draw(parent.data.totalColumn, 0, mtx);
        ctx.strokeStyle = lineColor;
        if (('totalMode' in FPsettings) && (FPsettings.totalMode === "Under") && parent.data.ableCluster())
            ctx.setLineDash([5, 5, 3, 5]);
        ctx.myStrokeRect(this.view);
        //   ctx.myLine(this.view.x, this.view.y, this.view.x + this.view.w, this.view.y + this.view.h);
        ctx.setLineDash([]);
    }
}

