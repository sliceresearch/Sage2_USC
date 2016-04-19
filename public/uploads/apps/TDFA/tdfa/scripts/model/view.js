define(["lib/knockout", "three", "core/disposable", "util/uid", "util/misc"], function (ko, THREE, disposable, uid, misc) {


	/**
	* Enum Orientation
	*
	* @class Orientation
	*/
	var Orientation = {
		HORIZONTAL: 0,
		VERTICAL: 1
	}



	/**
	 * @brief Interface Tile
	 * @param Tile parent Parent View object.
	 * @param {left,top,right,bottom} initialGeom Geometry object.
	 */
	var Tile = function (parent, initialGeom) {
		var _self = this;


		// props

		_self.parent = parent;
		_self.index = ko.observable(0);
		_self.uid = uid.Next();
		_self.left = ko.observable(initialGeom.left || 0);
		_self.top = ko.observable(initialGeom.top || 0);
		_self.right = ko.observable(initialGeom.right || 0);
		_self.bottom = ko.observable(initialGeom.bottom || 0);


		_self.width = ko.pureComputed(function () {
			return _self.right() - _self.left();
		});

		_self.height = ko.pureComputed(function () {
			return _self.bottom() - _self.top();
		});

		// upper-right corner of this Tile
		_self.UR = ko.pureComputed(function () {
			return {
				right: _self.right(),
				top: _self.top()
			};
		});


		// public methods

		/**
		* Return this Tile's geometry
		*
		* @method Geometry
		* @return {left,top,right,bottom} Describes boundaries of this Tile
		*/
		_self.Geometry = function () {
			return {
				left: _self.left(),
				top: _self.top(),
				right: _self.right(),
				bottom: _self.bottom()
			};
		}

		/**
		* Set this Tile's boundaries to values provided by geom
		*
		* @method SetGeometry
		* @param {left,top,right,bottom} geom
		*/
		_self.SetGeometry = function (geom) {
			_self.left(geom.left);
			_self.top(geom.top);
			_self.right(geom.right);
			_self.bottom(geom.bottom);
		}

	   /**
		* Return True if value of x is contained between left and right
		*
		* @method ContainsX
		* @param float x
		* @return boolean True if value x falls on or between left and right boundaries
		*/
		_self.ContainsX = function (x) {
			return _self.left() <= x && _self.right() >= x;
		}

	   /**
		* Return True if value of y is contained between top and bottom
		*
		* @method ContainsY
		* @param float y
		* @return boolean True if value y falls on or between top and bottom boundaries
		*/
		_self.ContainsY = function (y) {
			return _self.top() <= y && _self.bottom() >= y;
		}


		// below must be implemented by subclasses

		_self.Split = _self.Split || misc.ImplDeferred;
		_self.Merge = _self.Merge || misc.ImplDeferred;
		_self.isSink = _self.isSink || fmisc.ImplDeferred;

		_self.LeftMost = _self.LeftMost || misc.ImplDeferred;
		_self.RightMost = _self.RightMost || misc.ImplDeferred;
		_self.TopMost = _self.TopMost || misc.ImplDeferred;
		_self.BottomMost = _self.BottomMost || misc.ImplDeferred;


		var _init = function () {

		}

		_init();
	}



	/**
	 * @brief Class Sink factory function
	 * @param View parent Parent View object.
	 * @param {left,top,right,bottom} initialGeom Geometry object.
	 * @return Sink instance
	 */
	var Sink = function (parent, initialGeom) {
		var _newGeom = new THREE.Vector4();
		var _lerpedGeom = new THREE.Vector4();


		// model for sink
		var _self = {
			background: new THREE.Color(0x222222),
			isSink: function () {
				return true;
			},


		   /**
			* Request parent View to perform split to insert new Sink
			*
			* @method Split
			* @param {Object} orientation
			*/
			Split: function (orientation) {
				_self.parent.Split(orientation, _self);
			},


		   /**
			* Request parent View to perform merge
			*
			* @method Merge
			* @param {Object} orientation
			*/
			Merge: function (orientation) {
				_self.parent.Merge(_self, orientation);
			},


		   /**
			* Returns self since Sinks are leaf nodes
			*
			* @method LeftMost
			* @return Sink self
			*/
			LeftMost: function () {
				return _self;
			},

		   /**
			* Returns self since Sinks are leaf nodes
			*
			* @method RightMost
			* @return Sink self
			*/
			RightMost: function () {
				return _self;
			},

		   /**
			* Returns self since Sinks are leaf nodes
			*
			* @method TopMost
			* @return Sink self
			*/
			TopMost: function () {
				return _self;
			},

		   /**
			* Returns self since Sinks are leaf nodes
			*
			* @method BottomMost
			* @return Sink self
			*/
			BottomMost: function () {
				return _self;
			},

		   /**
			* Description for LerpedGeom
			*
			* @method LerpedGeom
			* @return THREE.Vector4 vector representing geometry
			*/
			LerpedGeom: function () {
				var a = 0.5;
				_newGeom.set(_self.left(), _self.bottom(), _self.width(), _self.height());
				return _lerpedGeom.lerp(_newGeom, 0.58);
			}
		}


		_self.Update = _self.Update || misc.ImplDeferred;
		_self.PreRender = _self.PreRender || misc.ImplOptional;
		_self.PostRender = _self.PostRender || misc.ImplOptional;


		var _init = function () {
			// decorate with Tile interface
			Tile.call(_self, parent, initialGeom);
			_lerpedGeom.set(_self.left(), _self.bottom(), _self.width(), _self.height());
		}

		_init();



		return _self;
	}



	/**
	 * @brief Class View factory function
	 * @param View parent Parent View object.
	 * @param {left,top,right,bottom} initialGeom Geometry object.
	 * @param Tile child0 Child Tile or null
	 * @param Tile child1 Child Tile or null
	 * @param Orientation orientation Configures children's layout
	 * @return View instance
	 */
	var View = function (parent, initialGeom, child0, child1, orientation) {

		var _parentsLeftMost = function (prev, curr) {
			var pd = prev.right() - prev.parent.left();
			var cd = curr.right() - curr.parent.left();
			return pd < cd ? prev : curr;
		}

		var _parentsRightMost = function (prev, curr) {
			var pd = prev.parent.right() - prev.left();
			var cd = curr.parent.right() - curr.left();
			return pd < cd ? prev : curr;
		}

		var _parentsTopMost = function (prev, curr) {
			var pd = prev.bottom() - prev.parent.top();
			var cd = curr.bottom() - curr.parent.top();
			return pd < cd ? prev : curr;
		}

		var _parentsBottomMost = function (prev, curr) {
			var pd = prev.parent.bottom() - prev.top();
			var cd = curr.parent.bottom() - curr.top();
			return pd < cd ? prev : curr;
		}

	   /**
		* Divide given geometry into two new geometries: one for
		* present child and one for new child (newSink)
		*
		* @private
		* @method _splitGeometry
		* @param {left,top,right,bottom} geom
		* @param {Object} orientation
		* @return {child,newSink} Two geometries
		*/
		var _splitGeometry = function (geom, orientation) {
			if (orientation === Orientation.HORIZONTAL) {

				return {
					child: {
						left: geom.left,
						top: geom.top,
						right: geom.right - 30,
						bottom: geom.bottom
					},
					newSink: {
						left: geom.right - 29,
						top: geom.top,
						right: geom.right,
						bottom: geom.bottom
					}
				};

			} else {

				return {
					child: {
						left: geom.left,
						top: geom.top + 30,
						right: geom.right,
						bottom: geom.bottom
					},
					newSink: {
						left: geom.left,
						top: geom.top,
						right: geom.right,
						bottom: geom.top + 29
					}

				};
			}
		}

	   /**
		* Given two geometry objects, figure out their extrema and
		* return them as a geometry object
		* @private
		* @method _combinedGeometry
		* @param {left,top,right,bottom} g1
		* @param {left,top,right,bottom} g2
		* @return {left,top,right,bottom} combined geometry
		*/
		var _combinedGeometry = function (g1, g2) {
			return {
				left: g1.left < g2.left ? g1.left : g2.left,
				top: g1.top < g2.top ? g1.top : g2.top,
				right: g1.right > g2.right ? g1.right : g2.right,
				bottom: g1.bottom > g2.bottom ? g1.bottom : g2.bottom
			};
		}


		var _init = function () {
			// decorate self with Tile interface and disposable
			Tile.call(_self, parent, initialGeom);
			disposable.Decorate(_self);

			// when there is a change in children array, all children need to get reindexed
			_self.addDisposable(_self.children.subscribe(function (children) {
				for (var idx = 0; idx < children.length; ++idx) {
					children[idx].parent = _self;
					children[idx].index(idx);
				}
			}));

			if (child0 != null) _self.children.push(child0);
			if (child1 != null) _self.children.push(child1);

			// only root View will so this
			if (_self.children().length == 0) _self.children.push(Sink(_self, initialGeom));

			// below subscriptions will ensure proper size propagation among children and below
			_self.addDisposable(_self.left.subscribe(function (v) {
				if (_self.orientation == Orientation.HORIZONTAL) {
					_self.firstChild().left(v);
				} else {
					for (var idx = 0; idx < _self.children().length; ++idx) {
						_self.children()[idx].left(v);
					}
				}
			}));
			_self.addDisposable(_self.right.subscribe(function (v) {
				if (_self.orientation == Orientation.HORIZONTAL) {
					_self.lastChild().right(v);
				} else {
					for (var idx = 0; idx < _self.children().length; ++idx) {
						_self.children()[idx].right(v);
					}
				}
			}));
			_self.addDisposable(_self.bottom.subscribe(function (v) {
				if (_self.orientation == Orientation.HORIZONTAL) {
					for (var idx = 0; idx < _self.children().length; ++idx) {
						_self.children()[idx].bottom(v);
					}
				} else {
					_self.lastChild().bottom(v);
				}
			}));
			_self.addDisposable(_self.top.subscribe(function (v) {
				if (_self.orientation == Orientation.HORIZONTAL) {
					for (var idx = 0; idx < _self.children().length; ++idx) {
						_self.children()[idx].top(v);
					}
				} else {
					_self.firstChild().top(v);
				}
			}));
		}


		var _self = {

			orientation: orientation || Orientation.HORIZONTAL,
			children: ko.observableArray([]),
			firstChild: ko.pureComputed(function () {
				return _self.children()[0];
			}),
			lastChild: ko.pureComputed(function () {
				return _self.children()[_self.children().length - 1];
			}),


		   /**
			* Given horizontal and vertical factors, scale view size and
			* propagate the change to children
			*
			* @method ScaleGeom
			* @param float horizontalFactor
			* @param float verticalFactor
			*/
			ScaleGeom: function (horizontalFactor, verticalFactor) {
				_self.right(_self.right() * horizontalFactor);
				_self.bottom(_self.bottom() * verticalFactor);

				for (var idx = 0; idx < _self.children().length; ++idx) {
					var child = _self.children()[idx];

					if (child.isSink()) {
						var geom = child.Geometry();

						// TODO
						geom.left *= horizontalFactor;
						geom.right *= horizontalFactor;
						geom.top *= verticalFactor;
						geom.bottom *= verticalFactor;

						child.SetGeometry(geom);
					} else {
						child.ScaleGeom(horizontalFactor, verticalFactor);
					}
				}
			},

		   /**
			* Is view oriented horizontally?
			*
			* @method IsHorizontal
			* @return boolean True if the view is oriented horizontally
			*/
			IsHorizontal: function () {
				return _self.orientation === Orientation.HORIZONTAL;
			},

		   /**
			* Is view oriented vertically?
			*
			* @method IsVertical
			* @return boolean True if the view is oriented vertically
			*/
			IsVertical: function () {
				return _self.orientation === Orientation.VERTICAL;
			},

			isSink: function () {
				return false;
			},

		   /**
			* Recursively find the left-most descendant
			*
			* @method LeftMost
			* @return Tile leftmost descendant
			*/
			LeftMost: function () {
				if (_self.IsHorizontal()) {
					return _self.firstChild().LeftMost();
				} else {
					var result = _self.children().map(function (c) {
						return c.LeftMost();
					});
					return result.reduce(_parentsLeftMost);
				}
			},

		   /**
			* Recursively find the right-most descendant
			*
			* @method RightMost
			* @return Tile right-most descendant
			*/
			RightMost: function () {
				if (_self.IsHorizontal()) {
					return _self.lastChild().RightMost();
				} else {
					var result = _self.children().map(function (c) {
						return c.RightMost();
					});
					return result.reduce(_parentsRightMost);
				}
			},

		   /**
			* Recursively find the top-most descendant
			*
			* @method TopMost
			* @return Tile top-most descendant
			*/
			TopMost: function () {
				if (_self.IsVertical()) {
					return _self.firstChild().TopMost();
				} else {
					var result = _self.children().map(function (c) {
						return c.TopMost();
					});
					return result.reduce(_parentsTopMost);
				}
			},

		   /**
			* Recursively find the bottom-most descendant
			*
			* @method BottomMost
			* @return Tile bottom-most descendant
			*/
			BottomMost: function () {
				if (_self.IsVertical()) {
					return _self.lastChild().BottomMost();
				} else {
					var result = _self.children().map(function (c) {
						return c.BottomMost();
					});
					return result.reduce(_parentsBottomMost);
				}
			},

		   /**
			* Given the requested orientation, either split the
			* requesting Sink if the orientation matches this
			* view's orientation or replace the requesting Sink
			* with a new View oriented differently
			*
			* @method Split
			* @param {Object} orientation
			* @param Sink child
			*/
			Split: function (orientation, child) {
				var geom = child.Geometry();
				var idx = child.index();

				// if only one child is present, let's switch to requested orientation
				// this should only happen in case of the root node
				if (_self.children().length == 1) {
					_self.orientation = orientation;
				}

				if (_self.orientation == orientation) {
					// requested orientation matches our own
					// split requesting child's geometry
					var splitGeom = _splitGeometry(geom, orientation);
					var newChild = Sink(_self, splitGeom.newSink);
					var spliceDir = orientation == Orientation.HORIZONTAL ? 1 : 0;

					// appropriately set old child's geometry to make room for new child
					child.SetGeometry(splitGeom.child);

					// insert new child above (vertical orientation) or after (horizontal orientation)
					_self.children().splice(idx + spliceDir, 0, newChild);
				} else {
					// requested orientation is diferent
					var splitGeom = _splitGeometry(geom, orientation);
					var newChild = Sink(null, splitGeom.newSink);
					child.SetGeometry(splitGeom.child);

					// make old and new Sinks children of the new View
					var newView = orientation == Orientation.HORIZONTAL ?
						View(_self, geom, child, newChild, orientation) :
						View(_self, geom, newChild, child, orientation);

					// insert new View in place of requesting child
					_self.children()[idx] = newView;
				}

				_self.children.notifySubscribers(_self.children());
			},

			/**
			*
			*
			* @method Merge
			* @param Sink childToKeep
			* @param {Object} orientation
			*/
			Merge: function (childToKeep, orientation) {
				if (orientation != _self.orientation) return;
				if (childToKeep == null) return;

				// request cannot come from first or last child (depending on the orientation)
				var prohibitedChild = _self.orientation == Orientation.HORIZONTAL ?
					_self.lastChild() : _self.firstChild();
				if (childToKeep === prohibitedChild) return;

				// will determine which child to remove in the array of children
				var mergeDir = _self.orientation == Orientation.HORIZONTAL ? 1 : -1;

				if (_self.children().length <= 2) {
					var geom = _self.Geometry();
					var idx = _self.index();

					// remove appropriate child, depending on orientation
					_self.children().splice(childToKeep.index() + mergeDir, 1);
					childToKeep.SetGeometry(geom);

					// if not a root node
					if (_self.parent != null) {
						// insert the child in our position in parent's array of children (this View is effectively removed)
						_self.parent.children()[idx] = childToKeep;
						_self.parent.children.notifySubscribers(_self.parent.children());
					} else {
						_self.children.notifySubscribers(_self.children());
					}

					// cleanup subscriptions
					_self.dispose();
				} else {
					var childToReap = _self.children()[childToKeep.index() + mergeDir];
					var geom = _combinedGeometry(childToKeep.Geometry(), childToReap.Geometry());

					// remove appropriate child (depending on the orientation) and set requesting child's geometry
					_self.children().splice(childToReap.index(), 1);
					childToKeep.SetGeometry(geom);

					_self.children.notifySubscribers(_self.children());
				}
			},

			// needs to be defined
			onDispose: function () {}
		}


		_init();

		return _self;
	}


	return {

		Orientation: Orientation,
		Sink: Sink,
		View: View

	};

});
