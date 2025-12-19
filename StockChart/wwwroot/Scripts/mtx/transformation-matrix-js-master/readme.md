2D Affine Transformation Matrix
===============================

An affine transformation matrix (3x3) class for JavaScript that performs various transformations such as rotate, scale, translate, skew, shear, add, subtract, multiply, divide, inverse, decomposing, animation, converting to and from a SVG matrix, creating matrix from triangles and more (full HTML documentation is included).

It's primarily intended for situations where you need to track or create transforms and want to apply it permanently/manually to your own points and polygons.

The matrix can optionally synchronize a canvas 2D context so that the transformations on the canvas matches pixel perfect the local transformations of the Matrix object. It can be used to synchronize DOM elements using the toCSS() / toCSS3D() methods.

For browsers which support DOMMatrix and/or SVGMatrix it can be used as a supplementary framework to increase flexibility such as working directly with transformed points, perform addition transformation, interpolate animation and so forth.

Optional Node support.

No dependencies.


Install
=======

Download zip and extract to folder.

git via HTTPS:

    $ git clone https://github.com/epistemex/transformation-matrix-js.git

git via SSH:

    $ git clone git@github.com:epistemex/transformation-matrix-js.git

Using Bower:

    $ bower install transformation-matrix-js

Using NPM

    $ npm install transformation-matrix-js


Usage
=====

Browser
-------

Just include the script and create a new instance:

    var matrix = new Matrix([context]);

You can supply an optional canvas 2D context as argument, which will be synchronized with the transformations that are applied to the matrix object.


Node
----

Using it with Node: use **npm** to install the package first (see above), then

    var Matrix = require("transformation-matrix-js").Matrix;
    var m = new Matrix();


Quick overview
--------------

**Constructor**

    var m = new Matrix();
    
**Static methods (alternatives to the constructor):**

	Matrix.fromTriangles( t1, t2 );   		// returns matrix needed to produce t2 from t1
    Matrix.from(a, b, c, d, e, f, ctx);     // create and initialize a matrix, or from DOMMatrix/SVGMatrix/Matrix
	Matrix.fromSVGTransformList( tList );	// create new matrix from a SVG transform list
	Matrix.fromDOMMatrix( domMatrix ); 	 	// OBSOLETE, see from() - create new matrix from DOMMatrix
	Matrix.fromSVGMatrix( svgMatrix ); 	 	// OBSOLETE, see from() - create new matrix from SVGMatrix

**Methods:**

	applyToArray(points)
	applyToContext(context)
	applyToPoint(x, y)
	applyToTypedArray(points, use64)
	clone(noContext)
	concat(cm)
	decompose(useLU)					// breaks down the transform into individual components
	determinant()
	divide(m)
	divideScalar(d)
	flipX()
	flipY()
	interpolate(m2, t, context)
	interpolateAnim(m2, t, context) 	// decomposed interpolation (prevents flipping)
	inverse(cloneContext)
	isEqual(m)
	isIdentity()
	isInvertible()
	isValid()
	multiply(m)
	reflectVector(x, y)
	reset()
	rotate(angle)
	rotateDeg(angle)
	rotateFromVector(x, y)
	scale(sx, sy)
	scaleU(f)							// uniform scale
	scaleX(sx)
	scaleY(sy)
	setTransform(a, b, c, d, e, f)
	shear(sx, sy)
	shearX(sx)
	shearY(sy)
	skew(ax, ay)
	skewDeg(ax, ay)
	skewX(ax)
	skewY(ay)
	toArray()
	toCSS()
	toCSS3D()
	toCSV()
	toJSON()
	toString()
	toDOMMatrix()                       // creates a DOMMatrix from current transforms
	toSVGMatrix()						// creates a SVGMatrix from current transforms
	toTypedArray(use64)
	transform(a2, b2, c2, d2, e2, f2)
	translate(tx, ty)
	translateX(tx)
	translateY(ty)

**Properties:**

    a									// scale x
    b									// shear y
    c									// shear x
    d									// scale y
    e									// translate x
    f									// translate y

Examples
--------

Apply to a point:

    tPoint = m.applyToPoint( x, y );

Apply to an Array with point objects or point pair values:

    tPoints = m.applyToArray( [{x: x1, y: y1}, {x: x2, y: y2}, ...] );
    tPoints = m.applyToArray( [x1, y1, x2, y2, ...] );
    tPoints = m.applyToTypedArray(...);

or apply to a canvas context (other than optionally referenced in constructor):

    m.applyToContext( myContext );

Get inverse transformation matrix (the matrix you need to apply to get back to an identity matrix from whatever the matrix contains):

    invMatrix = m.inverse();

or

    var invMatrix;

    if (m.isInvertible()) {             // check if we can inverse
        invMatrix = m.inverse();
    }

You can interpolate between current and a new matrix. The function
returns a new matrix:

    im = m.interpolate( m2, t );   		// t = [0.0, 1.0]
    im = m.interpolateAnim( m2, t );

The former does a naive interpolation which works fine with translate and scale. The latter is better suited when there is for example rotation involved to avoid "flipping" (and is what the browsers are using) utilizing decomposition.

Check if there is any transforms applied:

    state = m.isIdentity();        		// true if identity

Check if two matrices are identical:

    state = m.isEqual( matrix2 );      	// true if equal

Reset matrix to an identity matrix:

    m.reset();

Methods are chainable:

    // rotate, then translate
    m.rotateDeg(45).translate(100, 200);

To synchronize a DOM element:

    elem.style.transform = m.toCSS();  	// some browsers may need prefix

See documentation for full overview and usage.


Contributors
============

- Ken "Fyrstenberg" Nilsen (creator) (https://github.com/epistemex)
- Leon Sorokin (https://github.com/leeoniya)
- Henry Ruhs (https://github.com/redaxmedia)
- Matthieu Dumas (https://github.com/solendil)

See Change.log for details.


License
=======

Released under [MIT license](http://choosealicense.com/licenses/mit/). You can use this class in both commercial and non-commercial projects provided that full header (minified and developer versions) is included.

*&copy; 2014-2016 Epistemex*

![Epistemex](http://i.imgur.com/wZSsyt8.png)
