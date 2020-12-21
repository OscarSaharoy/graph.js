
const graphjs = new Graph("graphjs");

graphjs.setXRange(0, 1e+5);
graphjs.setYRange(0, 0.001);

graphjs.pointDrawingFunction = () => {};

graphjs.addPoints( [...Array(300).keys()]
				   .map( x => 15 - x / 10 )
				   .map( x => new vec2( x * 1e+4, 1.2**x * 1e-4 ) ) );