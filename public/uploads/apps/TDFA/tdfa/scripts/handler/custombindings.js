define(["lib/knockout", "util/domutil"], function (ko, domutil) {

	ko.bindingHandlers.manualClick = {
		init: function (element, valueAccessor, allBindings, viewModel, bindingContext) {

			domutil.AddEventHandler(element, "click", valueAccessor(), viewModel);
			ko.utils.domNodeDisposal.addDisposeCallback(element, function () {
				domutil.RemoveEventHandler(element, "click", valueAccessor());
			});

		}
	};

});
