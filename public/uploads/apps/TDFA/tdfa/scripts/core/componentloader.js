define([], function () {

	var _domParser = new DOMParser();

	return {

		/**
		* Parses html string and appends all top level nodes
		* of parsed node's <head> and <body> to specified
		* parent element.
		*
		* @method LoadHTML
		* @param DOMElement domParentElement
		* @param String strHTML
		* @return Array array of added nodes
		*/
		LoadHTML: function (domParentElement, strHTML) {
			var props = ["head", "body"],
				node = _domParser.parseFromString(strHTML, "text/html"),
				elements = [];

			// if parsing was successful
			if (node != null) {
				props.forEach(function (prop) {
					if (!node[prop]) return;

					// add child nodes to parent
					while (node[prop].childNodes.length > 0) {
						elements.push(domParentElement.appendChild(node[prop].childNodes[0]));
					}
				});
			}

			// return all inserted nodes
			return elements;
		},

		/**
		* Description for LoadCSS
		* @private
		* @method LoadCSS
		* @param DOMElement targetElement
		* @param StringstrCSS
		* @return boolean True on success
		*/
		LoadCSS: function (targetElement, strCSS) {

			if (strCSS == null || targetElement == null) return false;

			// wrap css string with <style> tags then parse
			var strNode = String('<style rel="stylesheet" type="text/css">' + strCSS + '</style>');
			var node = _domParser.parseFromString(strNode, "text/html");

			if (node != null) {
				if (targetElement.parentElement != null) {

					// insert before target element for which the css style is intended
					while (node.head.childNodes.length > 0) {
						targetElement.parentElement.insertBefore(node.head.childNodes[0], targetElement);
					}
					return true;
				}
			}

			return false;
		}

	};

});
