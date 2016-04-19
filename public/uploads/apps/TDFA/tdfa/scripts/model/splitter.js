define(["model/view"], function(view) {

	/**
	 * @brief Class Splitter factory function
	 * @param Tile prev Preceding Tile
	 * @param Tile next Following Tile
	 * @param Orientation orientation Describes the layout of the view it splits.
	 *        While the orientation is horizontal(vertical), the splitter itself
	 *        is a model for a vertical(horizontal) bar.
	 * @return Splitter instance
	 */
	var Splitter = function (prev, next, orientation) {

		// model for Sink separators
		var _self = {

			prev: prev,
			next: next,
			orientation: orientation,

		   /**
			* Return true if this Splitter splits a View that's oriented hotizontally
			*
			* @method IsHorizontal
			* @return boolean True if horizontal, false otherwise
			*/
			IsHorizontal: function () {
				return _self.orientation == view.Orientation.HORIZONTAL;
			},

		   /**
			* Return true if this Splitter splits a View that's oriented vertically
			*
			* @method IsVertical
			* @return boolean True if vertical, false otherwise
			*/
			IsVertical: function () {
				return _self.orientation == view.Orientation.VERTICAL;
			},

		}

		return _self;
	}


	return {

		Create: Splitter

	}

});
