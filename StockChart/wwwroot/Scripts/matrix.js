Matrix.prototype.getTranslate = function (x, y) {
    var m = new Matrix();
    m.translate(x, y);
    m.multiply(this);
    return m;
}
Matrix.prototype.reassignX = function (from, to) {
    var m = Matrix.fromTriangles([from.x1, 0, from.x2, 0, from.x1, 1], [to.x1, 0, to.x2, 0, to.x1, 1]);
    m.b = this.b;
    m.d = this.d;
    m.f = this.f;
    return m;
}
Matrix.prototype.reassignY = function (from, to) {
    var m = Matrix.fromTriangles([0, from.y1, 0, from.y2, 1, from.y1], [0, to.y1, 0, to.y2, 1, to.y1]);
    m.a = this.a;
    m.c = this.c;
    m.e = this.e;
    return m;
}

export { Matrix }