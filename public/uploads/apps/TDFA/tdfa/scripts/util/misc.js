define([], function () {

	/**
	* Placeholder for unimplemented but mandatory functions
	*
	* @method ImplDeferred
	* @return null
	*/
	function ImplDeferred() {
		throw new Error("Not implemented");
		return null;
	}

	/**
	* Placeholder for unimplemented optional functions
	*
	* @method ImplOptional
	* @return null
	*/
	function ImplOptional() {
		return null;
	}

	/**
	* Check if obj is an empty object
	*
	* @method IsObjectEmpty
	* @param {Object} obj
	* @return boolean true if obj has not properties
	*/
	function IsObjectEmpty(obj) {
		for (var key in obj) {
			if (obj.hasOwnProperty(key)) {
				return false;
			}
		}

		return true;
	}


	return {

		ImplDeferred: ImplDeferred,
		ImplOptional: ImplOptional,
		IsObjectEmpty: IsObjectEmpty

	};


});
