// Oscar Saharoy 2020

// vec2 class really simple
class vec2 {

	constructor(x, y) {
		this.x = x;
		this.y = y;
	}

	scaleBy(S) {
		this.x *= S;
		this.y *= S;
	}

	set(x, y) {
		this.x = x;
		this.y = y;
	}
}

// vector arithmatic
const addv     = (vecA, vecB) => new vec2( vecA.x + vecB.x, vecA.y + vecB.y );
const subv     = (vecA, vecB) => new vec2( vecA.x - vecB.x, vecA.y - vecB.y );
const scalev   = (vec, S)     => new vec2( S * vec.x, S * vec.y );
const sqrDistv = (vecA, vecB) => ( vecA.x - vecB.x ) ** 2 + ( vecA.y - vecB.y ) ** 2;


function drawPoint(point, ctx) {

	ctx.strokeStyle = "#54f330";
	ctx.fillStyle   = "#ffffff"

	// draw circle on point
	ctx.beginPath();
	ctx.arc( point.x, point.y, rem/2, 0, 6.28 );
	
	ctx.fill();
	ctx.stroke();
}

class Graph {

	constructor() {

		// get canvas and drawing context
		this.canvas = document.getElementById("graph.js");
		this.ctx    = canvas.getContext("2d");

		// declare graph variables
		this.canvasSize = new vec2(0, 0);
		this.dpr = 0;
		this.viewportCorners = [new vec2(-5, -5), new vec2(5, 5)];

		get viewportBottomLeft() { return this.viewportCorners[0];                                   }
		get viewportTopRight()   { return this.viewportCorners[1];                                   }
		get viewportWidth()      { return this.viewportCorners[1].x - this.viewportCorners[0].x;     }
		get viewportHeight()     { return this.viewportCorners[0].y - this.viewportCorners[1].y;     }
		get viewportSize()       { return new vec2( this.viewportWidth, this.viewportHeight );       }
		get originOffset()       { return scalev( addv( viewportTopRight, viewportBottomLeft ), 0.5) }

		this.canvasWidth     = 0;
		this.canvasHeight    = 0;
		this.dpr             = 0;
		this.viewportCorners = [-5, -5, 5, 5];
		this.mouseclicked    = false;
		this.movedInClick    = false;
		this.xGridSpacing    = 1;
		this.yGridSpacing    = 1;
		this.zoomLevelX      = 0;
		this.zoomLevelY      = 0;
		this.gridLinesX      = 16;
		this.gridLinesY      = 16;
		this.rem             = parseInt(getComputedStyle(document.documentElement).fontSize);
		this.mousePosX       = 0;
		this.mousePosY       = 0;

		// data variables
		this.points     = [new vec2(-2.0, -0.5), new vec2(-0.8, 0.2), new vec2(0, -0.3), new vec2(0.6, 0.5), new vec2(2.0, 1.5)];
		this.closePoint = -1;

		// initial canvas resize & start draw loop
		this.resize();
		this.wheel(new WheelEvent(null));
		this.draw();

		// set graph to have 1:1 x scale and y scale
		this.viewportCorners[1] = this.viewportCorners[0] * this.canvasHeight / this.canvasWidth;
		this.viewportCorners[3] = this.viewportCorners[2] * this.canvasHeight / this.canvasWidth;
		this.gridLinesY         = this.gridLinesX * this.canvasHeight / this.canvasWidth;

		// functions to  translate from graph space to canvas space
		this.graphToCanvasX      = graphX  => (graphX - (viewportCorners[2] + viewportCorners[0]) / 2) * canvasWidth  / (viewportCorners[2] - viewportCorners[0]) + canvasWidth  / 2;
		this.graphToCanvasY      = graphY  => (graphY - (viewportCorners[1] + viewportCorners[3]) / 2) * canvasHeight / (viewportCorners[1] - viewportCorners[3]) + canvasHeight / 2;
		this.canvasToGraphX      = canvasX => (canvasX - canvasWidth  / 2) * (viewportCorners[2] - viewportCorners[0]) / canvasWidth  + (viewportCorners[2] + viewportCorners[0]) / 2;
		this.canvasToGraphY      = canvasY => (canvasY - canvasHeight / 2) * (viewportCorners[1] - viewportCorners[3]) / canvasHeight + (viewportCorners[1] + viewportCorners[3]) / 2;
		this.graphToCanvasScaleX = graphX  => graphX * canvasWidth  / (viewportCorners[2] - viewportCorners[0]);
		this.graphToCanvasScaleY = graphY  => graphY * canvasHeight / (viewportCorners[1] - viewportCorners[3]);
		this.canvasToGraphScaleX = canvasX => canvasX * (viewportCorners[2] - viewportCorners[0]) / canvasWidth;
		this.canvasToGraphScaleY = canvasY => canvasY * (viewportCorners[1] - viewportCorners[3]) / canvasHeight;

		this.graphToCanvas = point => scalev( subv(point, this.originOffset), this.canvasSize )  / (viewportCorners[2] - viewportCorners[0]) + canvasWidth / 2;

		// event listeners
		window.addEventListener("resize",    resize);
		canvas.addEventListener("mousemove", mousemove);
		canvas.addEventListener("mousedown", mousedown);
		canvas.addEventListener("mouseup",   mouseup);

		// prevents page scrolling when mouse in canvas
		canvas.onwheel = (e) => {e.preventDefault();};
		canvas.addEventListener("wheel", wheel);
	}

	resize() {

		// set canvas to have 1:1 canvas pixel to screen pixel ratio
		this.dpr = window.devicePixelRatio || 1;
		const rect = canvas.getBoundingClientRect();
		this.canvasSize.set( rect.width * this.dpr, rect.height * this.dpr );

		canvas.width  = this.canvasSize.x;
		canvas.height = this.canvasSize.y;
	}

	function wheel(event) {

		// zoom in and out on the graph
		var centerX = canvasToGraphX( event.offsetX * dpr );
		var centerY = canvasToGraphY( event.offsetY * dpr );

		// move viewport corners towards or away from cursor
		var viewportCornerDeltas = [viewportCorners[0] - centerX, viewportCorners[1] - centerY, viewportCorners[2] - centerX, viewportCorners[3] - centerY];
		var scale   = 1 + event.deltaY / 1000;
		viewportCorners = [centerX + viewportCornerDeltas[0] * scale, centerY + viewportCornerDeltas[1] * scale, centerX + viewportCornerDeltas[2] * scale, centerY + viewportCornerDeltas[3] * scale];

		// calculate which gridlines to draw
		var xLength = viewportCorners[2] - viewportCorners[0];
		var yLength = viewportCorners[3] - viewportCorners[1];

		// this is awful
		if(xLength > gridLinesX*xGridSpacing) {
			xGridSpacing *= ((zoomLevelX%3)+3)%3 == 1 ? 2.5 : 2; // weird modulo fixes negative result for negative numbers
			++zoomLevelX;
		}
		else if(xLength < (((zoomLevelX%3)+3)%3 == 2 ? gridLinesX/2.5 : gridLinesX/2)*xGridSpacing) {
			xGridSpacing /= ((zoomLevelX%3)+3)%3 == 2 ? 2.5 : 2;
			--zoomLevelX;
		}
		if(yLength > gridLinesY*yGridSpacing) {
			yGridSpacing *= ((zoomLevelY%3)+3)%3 == 1 ? 2.5 : 2;
			++zoomLevelY;
		}
		else if(yLength < (((zoomLevelY%3)+3)%3 == 2 ? gridLinesY/2.5 : gridLinesY/2)*yGridSpacing) {
			yGridSpacing /= ((zoomLevelY%3)+3)%3 == 2 ? 2.5 : 2;
			--zoomLevelY;
		}
	}

	function mousedown(event) {

		mousemove(event);

		// set mouseclicked flag
		mouseclicked = true;
	}

	function mousemove(event) {

		// get mousepos for display at top of graph and close data point
		mousePosX = canvasToGraphX(event.offsetX*dpr);
		mousePosY = canvasToGraphY(event.offsetY*dpr);

		// handle panning the graph
		if(mouseclicked && closeDataPoint == -1) {

			// set cursor to grabbing
			canvas.style.cursor = "grabbing";

			// set moved in click flag
			movedInClick = true;

			// shift corners of viewport
			viewportCorners[0] -= canvasToGraphScaleX(event.movementX);
			viewportCorners[2] -= canvasToGraphScaleX(event.movementX);
			viewportCorners[1] -= canvasToGraphScaleY(event.movementY);
			viewportCorners[3] -= canvasToGraphScaleY(event.movementY);
		}

		// handle moving close data point
		else if(mouseclicked) {

			// set moved in click flag
			movedInClick = true;

			// move close data point to under cursor
			dataPoints[closeDataPoint].x = mousePosX;
			dataPoints[closeDataPoint].y = mousePosY;
		}

		else {

			// update close data point
			closeDataPoint = getCloseDataPoint(mousePosX, mousePosY);

			// if mouse is close to a point then change cursor to movey
			canvas.style.cursor = closeDataPoint == -1 ? "auto" : "move";
		}
	}

	function mouseup(event) {

		// handle adding a point on click but only if the mouse didn't more during the click
		if(!movedInClick) {

			if(closeDataPoint != -1) {

				dataPoints.splice(closeDataPoint, 1);
			}
			else {
				dataPoints.push(new Point(mousePosX, mousePosY));
			}
		}

		// set mouse flags
		mouseclicked = false;
		movedInClick = false;

		// call mousemove to update cursor
		mousemove(event);
	}

	function draw() {

		// cler canvas
		ctx.clearRect(0, 0, canvasWidth, canvasHeight);

		// get origin x and y pos limited to viewport extents
		var originX = 0 <= viewportCorners[0] ? viewportCorners[0] : (0 >= viewportCorners[2] ? viewportCorners[2] : 0);
		var originY = 0 <= viewportCorners[1] ? viewportCorners[1] : (0 >= viewportCorners[3] ? viewportCorners[3] : 0);
		originX = graphToCanvasX(originX);
		originY = graphToCanvasY(originY);

		// draw the 2 axes
		ctx.lineWidth = 3;
		ctx.strokeStyle = "black";

		ctx.beginPath();
		ctx.moveTo(          0, originY);
		ctx.lineTo(canvasWidth, originY);
		ctx.stroke();
		ctx.moveTo(originX, 0);
		ctx.lineTo(originX, canvasHeight);
		ctx.stroke();

		// change strokestyle for gridlines
		ctx.lineWidth   = 1;
		ctx.strokeStyle = "rgba(0, 0, 0, 0.3)";
		ctx.fillStyle   = "black";

		// set font for numbers
		ctx.font = "1rem Comfortaa";

		// start point for drawing gridlines
		var xStart = Math.floor(viewportCorners[0]/xGridSpacing - 1) * xGridSpacing;
		var yStart = Math.floor(viewportCorners[1]/yGridSpacing - 1) * yGridSpacing;

		// get precision for numbers - use log10 of grid spacing to find number of sig figs needed
		var sigFigs = Math.max(-parseInt(Math.log10(xGridSpacing))+1, 0);
		console.log(xGridSpacing);

		// gridlines in x and y
		for(var x=xStart; x<viewportCorners[2]; x+=xGridSpacing) {

			x = Math.abs(x) < 1e-10 ? 0.0 : x;

			var lineAcross = graphToCanvasX(x);
			ctx.beginPath();
			ctx.moveTo(lineAcross,            0);
			ctx.lineTo(lineAcross, canvasHeight);
			ctx.stroke();

			// if number is offscreen shift it onscreen
			var textHeight = rem;

			// draw numbers
			ctx.fillText(x.toFixed(sigFigs), lineAcross+4, (originY-8-textHeight < 0 ? textHeight+4 : originY-4));
		}

		for(var y=yStart; y<viewportCorners[3]; y += yGridSpacing) {
			
			y = Math.abs(y)<1e-10 ? 0.0 : y;

			var lineHeight = graphToCanvasY(y);
			ctx.beginPath();
			ctx.moveTo(          0, lineHeight);
			ctx.lineTo(canvasWidth, lineHeight);
			ctx.stroke();

			// if number is offscreen shift it onscreen
			var textWidth = ctx.measureText(y.toFixed(sigFigs)).width;

			// draw number
			ctx.fillText(y.toFixed(sigFigs), (originX+8+textWidth > canvasWidth ? canvasWidth-4-textWidth : originX+4), lineHeight-4);
		}

		// set style for curve
		ctx.strokeStyle = "#54F330";
		ctx.lineWidth   = 2;

		// draw mouse position x and y in top corner
		ctx.font = "1.3rem Comfortaa";
		var text = mousePosX.toFixed(sigFigs) + ", " + mousePosY.toFixed(sigFigs);
		var textWidth = ctx.measureText(text).width;

		// draw white box behind
		ctx.fillStyle = "white";
		ctx.fillRect(canvasWidth-8-textWidth, 0, 8+textWidth, rem*1.3+8);

		// draw numbers
		ctx.fillStyle = "black";
		ctx.fillText(text, canvasWidth-4-textWidth, rem*1.3+4);

		// set style for data points
		ctx.fillStyle = "white";
		ctx.lineWidth = 3;

		// draw data points
		for(var point of dataPoints) {

			drawPoint( graphToCanvas(point), ctx);
		}
		
		requestAnimationFrame(draw);
	}

	// get index of close dataPoint in the dataPoints array or undefined if none are close
	function getCloseDataPoint(mousePos) {

		return this.points.find( point => sqrDistv(mousePos, point) < rem*rem/4 );
	}
}