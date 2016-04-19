var TDFA = TDFA || {};
TDFA.UID = TDFA.UID || null;

define([], function () {

	/**
	* Returns a unique identifier
	*
	* @method UID
	* @return integer unique identifier
	*/
	var UID = function () {
		var _uid = 0;

		return {

			Next: function () {
				return _uid++;
			}

		};
	}


	if (TDFA.UID == null) {
		TDFA.UID = UID();
	}

	return TDFA.UID;

});
