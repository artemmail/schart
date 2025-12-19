
rounder = function (num) {
    let x = Math.pow(10, Math.round(Math.log10(num)));
    return (2 * x - num < num - x) ? 2 * x : (num - 0.5 * x < x - num) ? x * 0.5 : x;
}

class viewBackground1 extends canvasPart {
    constructor(parent, ctx, view, mtx) {
        super(parent, ctx, view, mtx, null);
    }
    draw(parent, ctx, view, mtx) {

        var maxx = parent.data.totalColumn.qntMax / parent.clusterWidthScale;

        if (!FPsettings.Contracts)
            maxx = parent.data.totalColumn.volMax / parent.clusterWidthScale;

        mtx =   mtx.reassignX({ x1: 0, x2: maxx }, { x1: view.x, x2: view.x + view.w });
        var parts = view.w / 25;
        var step = rounder(maxx / parts);     
        ctx.beginPath();
        var x = 0;
        for (var i = 0; i < maxx; i += step )
        {            
            ctx.fillStyle = (x++ % 2 == 0) ?Gray1:'white';
            var p1 = mtx.applyToPoint(i, 0);                        
            var p2 = mtx.applyToPoint(i + step, 0);                                           
            ctx.myFillRect({ x: p1.x, y: view.y, w: p2.x - p1.x, h: view.h });


        }
        ctx.stroke();

        /*
        
        ctx.save();
        ctx.reset();
        */

        ctx.clip();

        ctx.restore();

        ctx.strokeStyle = "#aaa";
        ctx.beginPath();

        for (var i = 0; i < maxx; i += step) {
            var p1 = mtx.applyToPoint(i, 0);
            ctx.myMoveTo(p1.x, view.y + view.h - 3);
            ctx.myLineTo(p1.x, view.y + view.h + 5);
            ctx.myLineTo(p1.x-3, view.y + view.h + 8);
           
         
                ctx.save();
                ctx.translate(p1.x, view.y + view.h + 5);
                ctx.rotate(-Math.PI / 3.5);
                ctx.textAlign = "right";
                ctx.fillStyle = '#222';
                ctx.fillText(MoneyToStr(i), -10, 0);
                ctx.restore();            
        }

        ctx.stroke();
        //ctx.restore();

    }

    onMouseMove(e) {



        //   canvas.style.cursor = 'move';// selectedPoint == null ? (mode == 'Edit' ? 'move' : 'default') : 'pointer';
        if (this.parent.markupEnabled)
            this.parent.markupManager.onMouseMove({ x: e.offsetX, y: e.offsetY });
        var p = this.mtx.inverse().applyToPoint(e.center.x, e.center.y).y;
        p = Math.round(p / this.parent.data.priceScale) * this.parent.data.priceScale;
        p = drob(p, 4);


        if (e.buttons == 0 && this.parent.selectedPrice !== p) {
            this.parent.selectedPrice = p;
            this.parent.drawClusterView();
        }

        
        /*

        var point = this.mtx.inverse().applyToPoint(e.offsetX, e.offsetY);


        var n = Math.floor(point.x);
        var col = this.parent.data.clusterData[n];



        


        this.parent.selectedCoumn = col;




        this.drawHint(e);



        if (e.buttons == 0)
            this.parent.drawClusterView();*/
    }


}

