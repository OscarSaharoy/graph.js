
const graphjs = new Graph("graphjs");

graphjs.pointDrawingFunction = () => {};
graphjs.setXRange(-1.5, 1.5);
graphjs.setYRange(-1.5, 1.5);

setTimeout( () => graphjs.redraw(), 40 );

var t = 0;

function animation() {

	for(var u=0; u<628; ++u) {
		graphjs.points[u] = vec2.fromPolar( Math.cos(0.05*u-4*t)*Math.sin(0.03*u), 0.01*u );
	}

	t += 0.01;

	graphjs.redraw();
	requestAnimationFrame( animation );
}

requestAnimationFrame( animation );