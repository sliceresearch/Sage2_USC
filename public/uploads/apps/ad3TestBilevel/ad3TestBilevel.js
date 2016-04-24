// SAGE2 is available for use under the SAGE2 Software License
//
// University of Illinois at Chicago's Electronic Visualization Laboratory (EVL)
// and University of Hawai'i at Manoa's Laboratory for Advanced Visualization and
// Applications (LAVA)
//
// See full text, terms and conditions in the LICENSE.txt included file
//
// Copyright (c) 2015


//https://bost.ocks.org/mike/bar/3/
//https://bl.ocks.org/mbostock/3885304



var ad3TestBilevel = SAGE2_App.extend( {

	init: function(data) {
		this.SAGE2Init("div", data);

		this.resizeEvents = "continuous";
		this.maxFPS = 30;
		this.debug = true;

		this.passSage2PointerAsMouseEvents = true;

		this.printIfDebug( "id of this.element" + this.element.id );
		this.element.id = "div" + data.id;
		this.printIfDebug( "id of this.element after set" + this.element.id );

		this.width  = this.element.clientWidth;
		this.height = this.element.clientHeight;


		this.fillFlareData();//create data before d3 

		this.fillWithHtml();
		this.d3ScriptFill();
	},

	printIfDebug : function(str) {
		if(this.debug) {
			console.log(str);
		}
	},

	fillWithHtml : function () {

		this.printIfDebug( "Attempting to add css tag" );
		// Load the CSS file
		this.addCSS(this.resrcPath + "scripts/styleBilevel.css", null);

	},

	addCSS : function(url, callback) {
	    var fileref = document.createElement("link")
		if( callback ) fileref.onload = callback;
	    fileref.setAttribute("rel", "stylesheet")
	    fileref.setAttribute("type", "text/css")
	    fileref.setAttribute("href", url)
		document.head.appendChild( fileref );
	},

	d3ScriptFill : function () {

		this.printIfDebug( "Attempting to add d3 elements" );

		var margin = {top: 350, right: 480, bottom: 350, left: 480},
		    radius = Math.min(margin.top, margin.right, margin.bottom, margin.left) - 10;

		var hue = d3.scale.category10();

		var luminance = d3.scale.sqrt()
		    .domain([0, 1e6])
		    .clamp(true)
		    .range([90, 20]);

		var svg = d3.select(this.element).append("svg")
		    .attr("width", margin.left + margin.right)
		    .attr("height", margin.top + margin.bottom)
		  .append("g")
		    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

		var partition = d3.layout.partition()
		    .sort(function(a, b) { return d3.ascending(a.name, b.name); })
		    .size([2 * Math.PI, radius]);

		var arc = d3.svg.arc()
		    .startAngle(function(d) { return d.x; })
		    .endAngle(function(d) { return d.x + d.dx ; })
		    .padAngle(.01)
		    .padRadius(radius / 3)
		    .innerRadius(function(d) { return radius / 3 * d.depth; })
		    .outerRadius(function(d) { return radius / 3 * (d.depth + 1) - 1; });

		// Compute the initial layout on the entire tree to sum sizes.
		// Also compute the full name and fill color for each node,
		// and stash the children so they can be restored as we descend.
		partition
			.value(function(d) { return d.size; })
			.nodes(this.flareData)
			.forEach(function(d) {
				d._children = d.children;
				d.sum = d.value;
				d.key = key(d);
				d.fill = fill(d);
			});

		// Now redefine the value function to use the previously-computed sum.
		partition
			.children(function(d, depth) { return depth < 2 ? d._children : null; })
			.value(function(d) { return d.sum; });

		var center = svg.append("circle")
			.attr("r", radius / 3)
			.on("click", zoomOut);

		center.append("title")
			.text("zoom out");

		var path = svg.selectAll("path")
			.data(partition.nodes(this.flareData).slice(1))
			.enter().append("path")
			.attr("d", arc)
			.style("fill", function(d) { return d.fill; })
			.each(function(d) { this._current = updateArc(d); })
			.on("click", zoomIn);

		function zoomIn(p) {
			if (p.depth > 1) p = p.parent;
			if (!p.children) return;
			zoom(p, p);
		}

		function zoomOut(p) {
			if (!p.parent) return;
			zoom(p.parent, p);
		}

		// Zoom to the specified new root.
		function zoom(root, p) {
			if (document.documentElement.__transition__) return;

			// Rescale outside angles to match the new layout.
			var enterArc,
			exitArc,
			outsideAngle = d3.scale.linear().domain([0, 2 * Math.PI]);

			function insideArc(d) {
				return p.key > d.key
				? {depth: d.depth - 1, x: 0, dx: 0} : p.key < d.key
				? {depth: d.depth - 1, x: 2 * Math.PI, dx: 0}
				: {depth: 0, x: 0, dx: 2 * Math.PI};
			}

			function outsideArc(d) {
				return {depth: d.depth + 1, x: outsideAngle(d.x), dx: outsideAngle(d.x + d.dx) - outsideAngle(d.x)};
			}

			center.datum(root);

			// When zooming in, arcs enter from the outside and exit to the inside.
			// Entering outside arcs start from the old layout.
			if (root === p) enterArc = outsideArc, exitArc = insideArc, outsideAngle.range([p.x, p.x + p.dx]);

			path = path.data(partition.nodes(root).slice(1), function(d) { return d.key; });

			// When zooming out, arcs enter from the inside and exit to the outside.
			// Exiting outside arcs transition to the new layout.
			if (root !== p) enterArc = insideArc, exitArc = outsideArc, outsideAngle.range([p.x, p.x + p.dx]);

			d3.transition().duration(d3.event.altKey ? 7500 : 750).each(function() {
				path.exit().transition()
				.style("fill-opacity", function(d) { return d.depth === 1 + (root === p) ? 1 : 0; })
				.attrTween("d", function(d) { return arcTween.call(this, exitArc(d)); })
				.remove();

				path.enter().append("path")
				.style("fill-opacity", function(d) { return d.depth === 2 - (root === p) ? 1 : 0; })
				.style("fill", function(d) { return d.fill; })
				.on("click", zoomIn)
				.each(function(d) { this._current = enterArc(d); });

				path.transition()
				.style("fill-opacity", 1)
				.attrTween("d", function(d) { return arcTween.call(this, updateArc(d)); });
			});
		}

		function key(d) {
		  var k = [], p = d;
		  while (p.depth) k.push(p.name), p = p.parent;
		  return k.reverse().join(".");
		}

		function fill(d) {
		  var p = d;
		  while (p.depth > 1) p = p.parent;
		  var c = d3.lab(hue(p.name));
		  c.l = luminance(d.sum);
		  return c;
		}

		function arcTween(b) {
		  var i = d3.interpolate(this._current, b);
		  this._current = i(0);
		  return function(t) {
		    return arc(i(t));
		  };
		}

		function updateArc(d) {
		  return {depth: d.depth, x: d.x, dx: d.dx};
		}

		d3.select(self.frameElement).style("height", margin.top + margin.bottom + "px");

	},




	fillFlareData : function() {
		this.flareData =  {
		 "name": "flare",
		 "children": [
		  {
		   "name": "analytics",
		   "children": [
		    {
		     "name": "cluster",
		     "children": [
		      {"name": "AgglomerativeCluster", "size": 3938},
		      {"name": "CommunityStructure", "size": 3812},
		      {"name": "HierarchicalCluster", "size": 6714},
		      {"name": "MergeEdge", "size": 743}
		     ]
		    },
		    {
		     "name": "graph",
		     "children": [
		      {"name": "BetweennessCentrality", "size": 3534},
		      {"name": "LinkDistance", "size": 5731},
		      {"name": "MaxFlowMinCut", "size": 7840},
		      {"name": "ShortestPaths", "size": 5914},
		      {"name": "SpanningTree", "size": 3416}
		     ]
		    },
		    {
		     "name": "optimization",
		     "children": [
		      {"name": "AspectRatioBanker", "size": 7074}
		     ]
		    }
		   ]
		  },
		  {
		   "name": "animate",
		   "children": [
		    {"name": "Easing", "size": 17010},
		    {"name": "FunctionSequence", "size": 5842},
		    {
		     "name": "interpolate",
		     "children": [
		      {"name": "ArrayInterpolator", "size": 1983},
		      {"name": "ColorInterpolator", "size": 2047},
		      {"name": "DateInterpolator", "size": 1375},
		      {"name": "Interpolator", "size": 8746},
		      {"name": "MatrixInterpolator", "size": 2202},
		      {"name": "NumberInterpolator", "size": 1382},
		      {"name": "ObjectInterpolator", "size": 1629},
		      {"name": "PointInterpolator", "size": 1675},
		      {"name": "RectangleInterpolator", "size": 2042}
		     ]
		    },
		    {"name": "ISchedulable", "size": 1041},
		    {"name": "Parallel", "size": 5176},
		    {"name": "Pause", "size": 449},
		    {"name": "Scheduler", "size": 5593},
		    {"name": "Sequence", "size": 5534},
		    {"name": "Transition", "size": 9201},
		    {"name": "Transitioner", "size": 19975},
		    {"name": "TransitionEvent", "size": 1116},
		    {"name": "Tween", "size": 6006}
		   ]
		  },
		  {
		   "name": "data",
		   "children": [
		    {
		     "name": "converters",
		     "children": [
		      {"name": "Converters", "size": 721},
		      {"name": "DelimitedTextConverter", "size": 4294},
		      {"name": "GraphMLConverter", "size": 9800},
		      {"name": "IDataConverter", "size": 1314},
		      {"name": "JSONConverter", "size": 2220}
		     ]
		    },
		    {"name": "DataField", "size": 1759},
		    {"name": "DataSchema", "size": 2165},
		    {"name": "DataSet", "size": 586},
		    {"name": "DataSource", "size": 3331},
		    {"name": "DataTable", "size": 772},
		    {"name": "DataUtil", "size": 3322}
		   ]
		  },
		  {
		   "name": "display",
		   "children": [
		    {"name": "DirtySprite", "size": 8833},
		    {"name": "LineSprite", "size": 1732},
		    {"name": "RectSprite", "size": 3623},
		    {"name": "TextSprite", "size": 10066}
		   ]
		  },
		  {
		   "name": "flex",
		   "children": [
		    {"name": "FlareVis", "size": 4116}
		   ]
		  },
		  {
		   "name": "physics",
		   "children": [
		    {"name": "DragForce", "size": 1082},
		    {"name": "GravityForce", "size": 1336},
		    {"name": "IForce", "size": 319},
		    {"name": "NBodyForce", "size": 10498},
		    {"name": "Particle", "size": 2822},
		    {"name": "Simulation", "size": 9983},
		    {"name": "Spring", "size": 2213},
		    {"name": "SpringForce", "size": 1681}
		   ]
		  },
		  {
		   "name": "query",
		   "children": [
		    {"name": "AggregateExpression", "size": 1616},
		    {"name": "And", "size": 1027},
		    {"name": "Arithmetic", "size": 3891},
		    {"name": "Average", "size": 891},
		    {"name": "BinaryExpression", "size": 2893},
		    {"name": "Comparison", "size": 5103},
		    {"name": "CompositeExpression", "size": 3677},
		    {"name": "Count", "size": 781},
		    {"name": "DateUtil", "size": 4141},
		    {"name": "Distinct", "size": 933},
		    {"name": "Expression", "size": 5130},
		    {"name": "ExpressionIterator", "size": 3617},
		    {"name": "Fn", "size": 3240},
		    {"name": "If", "size": 2732},
		    {"name": "IsA", "size": 2039},
		    {"name": "Literal", "size": 1214},
		    {"name": "Match", "size": 3748},
		    {"name": "Maximum", "size": 843},
		    {
		     "name": "methods",
		     "children": [
		      {"name": "add", "size": 593},
		      {"name": "and", "size": 330},
		      {"name": "average", "size": 287},
		      {"name": "count", "size": 277},
		      {"name": "distinct", "size": 292},
		      {"name": "div", "size": 595},
		      {"name": "eq", "size": 594},
		      {"name": "fn", "size": 460},
		      {"name": "gt", "size": 603},
		      {"name": "gte", "size": 625},
		      {"name": "iff", "size": 748},
		      {"name": "isa", "size": 461},
		      {"name": "lt", "size": 597},
		      {"name": "lte", "size": 619},
		      {"name": "max", "size": 283},
		      {"name": "min", "size": 283},
		      {"name": "mod", "size": 591},
		      {"name": "mul", "size": 603},
		      {"name": "neq", "size": 599},
		      {"name": "not", "size": 386},
		      {"name": "or", "size": 323},
		      {"name": "orderby", "size": 307},
		      {"name": "range", "size": 772},
		      {"name": "select", "size": 296},
		      {"name": "stddev", "size": 363},
		      {"name": "sub", "size": 600},
		      {"name": "sum", "size": 280},
		      {"name": "update", "size": 307},
		      {"name": "variance", "size": 335},
		      {"name": "where", "size": 299},
		      {"name": "xor", "size": 354},
		      {"name": "_", "size": 264}
		     ]
		    },
		    {"name": "Minimum", "size": 843},
		    {"name": "Not", "size": 1554},
		    {"name": "Or", "size": 970},
		    {"name": "Query", "size": 13896},
		    {"name": "Range", "size": 1594},
		    {"name": "StringUtil", "size": 4130},
		    {"name": "Sum", "size": 791},
		    {"name": "Variable", "size": 1124},
		    {"name": "Variance", "size": 1876},
		    {"name": "Xor", "size": 1101}
		   ]
		  },
		  {
		   "name": "scale",
		   "children": [
		    {"name": "IScaleMap", "size": 2105},
		    {"name": "LinearScale", "size": 1316},
		    {"name": "LogScale", "size": 3151},
		    {"name": "OrdinalScale", "size": 3770},
		    {"name": "QuantileScale", "size": 2435},
		    {"name": "QuantitativeScale", "size": 4839},
		    {"name": "RootScale", "size": 1756},
		    {"name": "Scale", "size": 4268},
		    {"name": "ScaleType", "size": 1821},
		    {"name": "TimeScale", "size": 5833}
		   ]
		  },
		  {
		   "name": "util",
		   "children": [
		    {"name": "Arrays", "size": 8258},
		    {"name": "Colors", "size": 10001},
		    {"name": "Dates", "size": 8217},
		    {"name": "Displays", "size": 12555},
		    {"name": "Filter", "size": 2324},
		    {"name": "Geometry", "size": 10993},
		    {
		     "name": "heap",
		     "children": [
		      {"name": "FibonacciHeap", "size": 9354},
		      {"name": "HeapNode", "size": 1233}
		     ]
		    },
		    {"name": "IEvaluable", "size": 335},
		    {"name": "IPredicate", "size": 383},
		    {"name": "IValueProxy", "size": 874},
		    {
		     "name": "math",
		     "children": [
		      {"name": "DenseMatrix", "size": 3165},
		      {"name": "IMatrix", "size": 2815},
		      {"name": "SparseMatrix", "size": 3366}
		     ]
		    },
		    {"name": "Maths", "size": 17705},
		    {"name": "Orientation", "size": 1486},
		    {
		     "name": "palette",
		     "children": [
		      {"name": "ColorPalette", "size": 6367},
		      {"name": "Palette", "size": 1229},
		      {"name": "ShapePalette", "size": 2059},
		      {"name": "SizePalette", "size": 2291}
		     ]
		    },
		    {"name": "Property", "size": 5559},
		    {"name": "Shapes", "size": 19118},
		    {"name": "Sort", "size": 6887},
		    {"name": "Stats", "size": 6557},
		    {"name": "Strings", "size": 22026}
		   ]
		  },
		  {
		   "name": "vis",
		   "children": [
		    {
		     "name": "axis",
		     "children": [
		      {"name": "Axes", "size": 1302},
		      {"name": "Axis", "size": 24593},
		      {"name": "AxisGridLine", "size": 652},
		      {"name": "AxisLabel", "size": 636},
		      {"name": "CartesianAxes", "size": 6703}
		     ]
		    },
		    {
		     "name": "controls",
		     "children": [
		      {"name": "AnchorControl", "size": 2138},
		      {"name": "ClickControl", "size": 3824},
		      {"name": "Control", "size": 1353},
		      {"name": "ControlList", "size": 4665},
		      {"name": "DragControl", "size": 2649},
		      {"name": "ExpandControl", "size": 2832},
		      {"name": "HoverControl", "size": 4896},
		      {"name": "IControl", "size": 763},
		      {"name": "PanZoomControl", "size": 5222},
		      {"name": "SelectionControl", "size": 7862},
		      {"name": "TooltipControl", "size": 8435}
		     ]
		    },
		    {
		     "name": "data",
		     "children": [
		      {"name": "Data", "size": 20544},
		      {"name": "DataList", "size": 19788},
		      {"name": "DataSprite", "size": 10349},
		      {"name": "EdgeSprite", "size": 3301},
		      {"name": "NodeSprite", "size": 19382},
		      {
		       "name": "render",
		       "children": [
		        {"name": "ArrowType", "size": 698},
		        {"name": "EdgeRenderer", "size": 5569},
		        {"name": "IRenderer", "size": 353},
		        {"name": "ShapeRenderer", "size": 2247}
		       ]
		      },
		      {"name": "ScaleBinding", "size": 11275},
		      {"name": "Tree", "size": 7147},
		      {"name": "TreeBuilder", "size": 9930}
		     ]
		    },
		    {
		     "name": "events",
		     "children": [
		      {"name": "DataEvent", "size": 2313},
		      {"name": "SelectionEvent", "size": 1880},
		      {"name": "TooltipEvent", "size": 1701},
		      {"name": "VisualizationEvent", "size": 1117}
		     ]
		    },
		    {
		     "name": "legend",
		     "children": [
		      {"name": "Legend", "size": 20859},
		      {"name": "LegendItem", "size": 4614},
		      {"name": "LegendRange", "size": 10530}
		     ]
		    },
		    {
		     "name": "operator",
		     "children": [
		      {
		       "name": "distortion",
		       "children": [
		        {"name": "BifocalDistortion", "size": 4461},
		        {"name": "Distortion", "size": 6314},
		        {"name": "FisheyeDistortion", "size": 3444}
		       ]
		      },
		      {
		       "name": "encoder",
		       "children": [
		        {"name": "ColorEncoder", "size": 3179},
		        {"name": "Encoder", "size": 4060},
		        {"name": "PropertyEncoder", "size": 4138},
		        {"name": "ShapeEncoder", "size": 1690},
		        {"name": "SizeEncoder", "size": 1830}
		       ]
		      },
		      {
		       "name": "filter",
		       "children": [
		        {"name": "FisheyeTreeFilter", "size": 5219},
		        {"name": "GraphDistanceFilter", "size": 3165},
		        {"name": "VisibilityFilter", "size": 3509}
		       ]
		      },
		      {"name": "IOperator", "size": 1286},
		      {
		       "name": "label",
		       "children": [
		        {"name": "Labeler", "size": 9956},
		        {"name": "RadialLabeler", "size": 3899},
		        {"name": "StackedAreaLabeler", "size": 3202}
		       ]
		      },
		      {
		       "name": "layout",
		       "children": [
		        {"name": "AxisLayout", "size": 6725},
		        {"name": "BundledEdgeRouter", "size": 3727},
		        {"name": "CircleLayout", "size": 9317},
		        {"name": "CirclePackingLayout", "size": 12003},
		        {"name": "DendrogramLayout", "size": 4853},
		        {"name": "ForceDirectedLayout", "size": 8411},
		        {"name": "IcicleTreeLayout", "size": 4864},
		        {"name": "IndentedTreeLayout", "size": 3174},
		        {"name": "Layout", "size": 7881},
		        {"name": "NodeLinkTreeLayout", "size": 12870},
		        {"name": "PieLayout", "size": 2728},
		        {"name": "RadialTreeLayout", "size": 12348},
		        {"name": "RandomLayout", "size": 870},
		        {"name": "StackedAreaLayout", "size": 9121},
		        {"name": "TreeMapLayout", "size": 9191}
		       ]
		      },
		      {"name": "Operator", "size": 2490},
		      {"name": "OperatorList", "size": 5248},
		      {"name": "OperatorSequence", "size": 4190},
		      {"name": "OperatorSwitch", "size": 2581},
		      {"name": "SortOperator", "size": 2023}
		     ]
		    },
		    {"name": "Visualization", "size": 16540}
		   ]
		  }
		 ]
		}
	},



	type : function (d) {
		d.frequency = +d.frequency;
		return d;
	},

	load: function(date) {
	},

	draw: function(date) {
	},


	resize: function(date) {
	},
	
	event: function(eventType, position, user_id, data, date) {
	} //end event function

});













