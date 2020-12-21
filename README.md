# graph.js

A little library I made to put graphs on web pages. It runs quickly for me (>1ms to draw a graph with a few thousand points on it) and is written pretty clearly so you can mess with the internal properties to adjust the behaviour. It comes with a Graph class, which controls a single canvas and turns it into a graph, and a simple vec2 class which is used for the points on the graph and for rendering calculations internally. You can drag the graph around with the mouse, zoom in and out with the scrollwheel, or zoom the x and y axes independantly using ctrl and shift. You can place and remove points on the graph by clicking and drag them around, or this functionality can be turned off. You can also easily supply custom point and curve drawing functions to customise the appearance.

Something I made quite quickly using the graph:

![](https://github.com/OscarSaharoy/graph.js/blob/master/demo.gif)
