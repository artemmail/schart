class viewAnim extends canvasPart {
    constructor(parent, ctx, view, mtx) {
        super(parent, ctx, view, mtx, null);
        this.imgToEnd = new Image;
        this.imgToEnd.src = '/images/toend.png';
    }

    draw(parent, ctx, view, mtx) {
        var h = (view.h - this.imgToEnd.height) / 2;
        var w = (view.w - this.imgToEnd.width) / 4;
        ctx.drawImage(this.imgToEnd, view.x + w, view.y + h);
    }
    onTap(e) {
        this.animation();
    }

    animation() {
        var c = this.parent.mtx.clone();
        var init = this.parent.getInitMatrix(this.parent.clusterView, this.parent.data);
        var me = this.parent;
        var stime = (new Date()).getTime();
        var myTimer = setInterval(function () {
            var t = ((new Date()).getTime() - stime) / 800;
            t = t > 1 ? 1 : t;
            me.mtx = c.interpolateAnim(init, t);
            me.drawClusterView();
            if (t == 1)
                clearInterval(myTimer);
            t += 0.01;
        }, 25);
    }
}

