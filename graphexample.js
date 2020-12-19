
const graphjs = new Graph("graphjs");

graphjs.pointDrawingFunction = () => {};

graphjs.addPoints( [...Array(300).keys()]
				   .map( x => 15-x/10 )
				   .map( x => new vec2(x, 1.2**x) ) );