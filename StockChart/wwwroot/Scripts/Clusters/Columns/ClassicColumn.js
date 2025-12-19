class ClassicColumn extends ClusterCoumnBase {
    constructor(parent, ctx, view, mtx) {
        super(parent, ctx, view, mtx, null);
    }
    draw(column, number, mtx, total) {
        this.drawClassicColumn_(column, number, mtx, false);
    }
}

