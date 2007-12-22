/**
 * JsSpec library, version '0.2.2' (c) 2007 Nicolas Sanguinetti
 *
 * JsSpec for JavaScript is freely distributable under the terms of an MIT-style
 * license. For details, see the web site:
 *   http://code.google.com/p/js-spec/
 *
 */

var JsSpec = {
	Version: '0.2.2+ms-patch'
};

Object.extend(Object, {
	respondTo: function(object, name) {
		return Object.isFunction(object[name]);
	},
	isNumber: function(object) {
		return typeof object == "number" || object instanceof Number;
	}
})

var Matcher = {
	create: function(name, methods) {
		this[name] = Class.create(methods);
		this[name].name = name;
		return this[name];
	},
	addHelpers: function(methods) {
		$H(methods).each(function(pair) {
			if (!Object.isFunction(pair[1]))
				pair[1] = methods[pair[1]];
			Matcher.Helpers[pair[0]] = pair[1];
			Matcher.Helpers[pair[0].underscore()] = pair[1];
		});
	},
	Helpers: {}
};

Matcher.addHelpers({
	be: function(expected) {
		return new Matcher.Be("===", expected);
	},
	equal: function(expected) {
		return new Matcher.Be("==", expected);
	},
	beLessThan: function(expected) {
		return new Matcher.Be("<", expected);
	},
	beLessOrEqualThan: function(expected) {
		return new Matcher.Be("<=", expected);
	},
	beGreaterThan: function(expected) {
		return new Matcher.Be(">", expected);
	},
	beGreaterOrEqualThan: function(expected) {
		return new Matcher.Be(">=", expected);
	}
});

Matcher.create("Be", {
	initialize: function(comparison, expected) {
		this.expected = expected;
		this.comparison = comparison;
	},
	matches: function(actual) {
		this.actual = actual;
		return this[this.comparison]();
	},
	"===": function() {
		return Object.isNumber(this.actual) && Object.isNumber(this.expected)
			? this.actual == this.expected
			: this.actual === this.expected;
	},
	"==": function() {
		return Object.isArray(this.expected) && Object.isArray(this.actual)
			? this.expected.size() == this.actual.size() &&
					this.expected.all(function(element, index) { return element == this.actual[index] }.bind(this))
			: this.actual == this.expected;
	},
	"<": function() {
		return this.actual < this.expected;
	},
	"<=": function() {
		return this.actual <= this.expected;
	},
	">": function() {
		return this.actual > this.expected;
	},
	">=": function() {
		return this.actual >= this.expected;
	},
	failureMessage: function(maybe_not) {
		return "expected " + Object.inspect(this.expected) + (maybe_not || " ") + "to be " + this.comparison.replace(/_/, " ") +
			" " + Object.inspect(this.actual);
	},
	negativeFailureMessage: function() {
		return this.failureMessage(" not ");
	}
});
Matcher.addHelpers({
	beClose: function(expected, delta) {
		return new Matcher.BeClose(expected, delta);
	}
});

Matcher.create("BeClose", {
	initialize: function(expected, delta) {
		this.expected = expected;
		this.delta = delta;
	},
	matches: function(target) {
		this.target = target;
		return (this.target - this.expected).abs() < this.delta;
	},
	failureMessage: function() {
		return "expected " + this.expected + " +/- (< " + this.delta + "), got " + this.target;
	},
	negativeFailureMessage: function() {
		return "expected " + this.expected + " not to be within " + this.delta + " of " + this.target;
	}
});
Matcher.addHelpers({
	change: function(message) {
		return new Matcher.Change(message);
	}
});

Matcher.create("Change", {
	initialize: function(message) {
		this.message = message;
		this.usingBy = this.usingFrom = this.usingTo = false;
		this.args = [];
	},
	matches: function(actual) {
		this.actual = actual;
		this.executeChange();
		if (this.usingFrom && this.from != this.before)
			return false;
		if (this.usingTo && this.to != this.after)
			return false;
		if (this.usingBy)
			return this.before + this.amount == this.after;
		return this.before != this.after;
	},
	executeChange: function() {
		this.before = Object.respondTo(this.actual, this.message) ? this.actual[this.message]() : this.actual[this.message];
		Object.respondTo(this.actual, this.receiver) ? this.actual[this.receiver].apply(this.actual, this.args) : this.actual[this.receiver];
		this.after = Object.respondTo(this.actual, this.message) ? this.actual[this.message]() : this.actual[this.message];
	},
	failureMessage: function() {
		if (this.usingTo)
			return this.message + " should have been changed to " + Object.inspect(this.to) + ", but is now " + Object.inspect(this.after);
		if (this.usingFrom)
			return this.message + " should have initially been " + Object.inspect(this.from) + ", but was " + Object.inspect(this.before);
		if (this.usingBy)
			return this.message + " should have been changed by " + Object.inspect(this.amount) +
				", but was changed by " + Object.inspect(this.after - this.before);
		return this.message + " should have changed, but is still " + Object.inspect(this.before);
	},
	negativeFailureMessage: function() {
		return this.message + " should not have changed, but did change from " +
			Object.inspect(this.before) + " to " + Object.inspect(this.after);
	},
	by: function(amount) {
		this.usingBy = true;
		this.amount = amount;
		return this;
	},
	from: function(from) {
		this.usingFrom = true;
		this.from = from;
		return this;
	},
	to: function(to) {
		this.usingTo = true;
		this.to = to;
		return this;
	},
	after: function() {
		this.args = $A(arguments)
		this.receiver = this.args.shift();
		return this;
	}
});

["afterCalling", "inResponseTo"].each(function(method) {
	Matcher.Change.prototype[method] = Matcher.Change.prototype[method.underscore()] = Matcher.Change.prototype.after;
})
Matcher.addHelpers({
	haveExactly: function(expected, collection) {
		var args = $A(arguments).slice(2);
		return new Matcher.Have(expected, collection, "exactly", args);
	},
	haveAtLeast: function(expected, collection) {
		var args = $A(arguments).slice(2);
		return new Matcher.Have(expected, collection, "at_least", args);
	},
	haveAtMost: function(expected, collection) {
		var args = $A(arguments).slice(2);
		return new Matcher.Have(expected, collection, "at_most", args);
	},
	have: 'haveExactly'
});

Matcher.create("Have", {
	initialize: function(expected, collection, relativity, args) {
		this.expected = expected == "no" ? 0 : expected;
		this.collection = collection;
		this.relativity = relativity || "exactly";
		this.args = args || [];
	},
	matches: function(actual) {
		var actuals = Object.respondTo(actual, this.collection)
			? actual[this.collection].apply(actual, this.args)
			: actual[this.collection];
		this.actual = Object.isFunction(actuals.size) ? actuals.size() : actuals.length;
		switch (this.relativity) {
			case "exactly":  return this.expected == this.actual;
			case "at_least": return this.expected <= this.actual;
			case "at_most":  return this.expected >= this.actual;
		}
	},
	failureMessage: function(relation) {
		return "expected #{relativity} #{collection}, got #{actual}".interpolate({
			relativity: this.readableRelativity() + this.expected,
			collection: this.collection,
			actual:     this.actual
		});
	},
	negativeFailureMessage: function() {
		switch (this.relativity) {
			case 'exactly':  return "expected target not to have #{expected} #{collection}, got #{actual}".interpolate(this);
			case 'at_least': return "instead of 'should not have at least' use 'should have at most'";
			case 'at_most':  return "instead of 'should not have at most' use 'should have at least'"
		}
	},
	readableRelativity: function() {
		return (this.relativity.replace(/exactly/, "").replace(/_/, " ") + " ").replace(/^\s+/, '');
	}
});
Matcher.addHelpers({
	include: function() {
		return new Matcher.Include(arguments);
	}
});

Matcher.create("Include", {
	initialize: function(expecteds) {
		this.expecteds = $A(expecteds);
	},
	matches: function(actual) {
		this.actual = actual;
		return this.expecteds.all(function(expected) { return actual.include(expected) });
	},
	failureMessage: function() {
		return this.message();
	},
	negativeFailureMessage: function() {
		return this.message("not ");
	},
	message: function(maybe_not) {
		return "expected #{actual} #{maybe_not}to include #{expecteds}".interpolate({
			maybe_not: maybe_not || "",
			actual:    this.actual.inspect(),
			expecteds: this.expecteds.map(Object.inspect).join(", ")
		});
	}
});
Matcher.addHelpers({
	match: function(expected) {
		return new Matcher.Match(expected);
	}
});

Matcher.create("Match", {
	initialize: function(expected) {
		this.expected = expected;
	},
	matches: function(actual) {
		this.actual = actual;
		return this.actual.match(this.expected);
	},
	failureMessage: function() {
		return this.message("");
	},
	negativeFailureMessage: function() {
		return this.message("not ")
	},
	message: function(maybe_not) {
		return "expected " + Object.inspect(this.actual) + " " + maybe_not + "to match " + Object.inspect(this.expected);
	}
});
Matcher.addHelpers({
	respondTo: function() {
		return new Matcher.RespondTo($A(arguments));
	}
});

Matcher.create("RespondTo", {
	initialize: function(names) {
		this.names = names;
	},
	matches: function(actual) {
		this.actual = actual;
		this.nonResponsive = this.names.reject(Object.respondTo.curry(actual));
		return this.nonResponsive.size() == 0;
	},
	failureMessage: function() {
		return "expected target to respond to " + this.nonResponsive.join(", ");
	},
	negativeFailureMessage: function() {
		return "expected target not to respond to " + this.names.join(", ");
	}
});
Matcher.addHelpers({
	satisfy: function(block) {
		return new Matcher.Satisfy(block);
	}
});

Matcher.create("Satisfy", {
	initialize: function(block) {
		this.block = block;
	},
	matches: function(actual) {
		this.actual = actual;
		return this.block(actual);
	},
	failureMessage: function() {
		return "expected " + Object.inspect(this.actual) + " to satisfy the block";
	},
	negativeFailureMessage: function() {
		return "expected " + Object.inspect(this.actual) + " not to satisfy the block";
	}
});
Context = Class.create({
	initialize: function(name, specs) {
		this.name = name;
		this.filters = { beforeAll: [], beforeEach: [], afterEach: [], afterAll: [] };
		this.specs = [];
		(specs || Prototype.K).apply(this);
		Specs.register(this);
		this.running = null;
	},
	addFilter: function(type, filter) {
		this.filters[type.camelize()].push(filter);
	},
	before: function(type, filter) {
		if (arguments.length == 1)
			var filter = type, type = "each";
		this.addFilter("before-" + type, filter);
	},
	after: function(type, filter) {
		if (arguments.length == 1)
			var filter = type, type = "each";
		this.addFilter("after-" + type, filter);
	},
	it: function(description, spec) {
		this.specs.push(new Context.Spec(description, spec));
	},
	describe: function() {
		return this.name + ":\n" + this.specs.map(function(spec) { return "- " + spec[0] }).join("\n");
	},
	each: function(iterator, binding) {
		var sandbox = {};
		this.filters.beforeAll.invoke("apply", sandbox);
		this.specs.map(function(spec) {
			spec.compile(this.filters);
			spec.run = spec.run.curry(sandbox);
			return spec;
		}, this).each(iterator, binding);
		this.filters.afterAll.invoke("apply", sandbox);
	},
	toElement: function() {
		var list, element = new Element("div");
		element.insert(new Element("h3").update(this.name));
		element.insert(list = new Element("ul"));
		this.specs.each(Element.insert.curry(list));
		list.select("li").each(function(spec, index) { this.specs[index].id = spec.identify() }, this);
		return element;
	},
  expect: function(object) {
    Expectation.extend(object);
    return object;
  }
});

Context.Spec = Class.create({
	initialize: function(name, spec) {
		this.name = name;
		this.id = null;
		this.spec = spec;
		this.pending = !spec;
		this.compiled = false;
	},
	compile: function(filters) {
		if (!this.compiled && !this.pending) {
			this.spec = filters.beforeEach.concat(this.spec).concat(filters.afterEach);
			this.compiled = true;
		}
		return this;
	},
	run: function(sandbox) {
		if (this.pending)
			throw new Context.PendingSpec(this);
		this.spec.invoke("apply", sandbox);
	},
	toElement: function() {
		return new Element("li").update(this.name);
	}
});

Context.PendingSpec = function(spec) {
	this.name   = "Pending";
	this.message = spec;
}

Runner = Class.create({
	initialize: function(element) {
		this.element = $(element) || $("spec_results") || this.createElement();
	},
	run: function(context) {
		this.element.insert(context);
		context.each(function(spec) {
			try {
				spec.run();
				this.pass(spec);
			} catch(e) {
				switch (e.name) {
					case "Pending":          return this.pending(spec);
					case "UnmetExpectation": return this.fail(spec, e.message);
					default:                 return this.error(spec, e.message);
				}
			}
		}, this);
	},
	pass: function(spec) {
		$(spec.id).addClassName("pass").insert({ top: this.label("passed") });
	},
	pending: function(spec) {
		$(spec.id).addClassName("pending").insert({ top: this.label("pending") });
	},
	fail: function(spec, message) {
		$(spec.id).addClassName("fail").insert({ top: this.label("failed") }).insert("<br/>with: " + message);
	},
	error: function(spec, message) {
		$(spec.id).addClassName("error").insert({ top: this.label("error") }).insert("<br/>with: " + message);
	},
	createElement: function() {
		var element = new Element("div");
		$(document.body).insert(element);
		return element;
	},
	label: function(text) {
		return new Element("span", { className: "label" }).update("[" + text + "]");
	}
});

Specs = Object.extend([], {
	register: Array.prototype.push,
	run: function(element) {
		var runner = new Runner(element);
		this.each(runner.run.bind(runner));
	},
	describe: function() {
		return this.invoke("describe").join("\n\n");
	}
});
Expectation = (function() {
	var should = function(matcher) {
		if (!matcher.matches(this))
			throw new Expectation.Unmet(matcher.failureMessage());
	};
	var shouldNot = function(matcher) {
		if (!Object.isFunction(matcher.negativeFailureMessage))
			throw Error("matcher " + Object.inspect(matcher) + " does not allow shouldNot");
		if (matcher.matches(this))
			throw new Expectation.Unmet(matcher.negativeFailureMessage());
	};

	var proxiedMethods = {
		should: function(object, matcher) {
			return should.call(object, matcher);
		},
		shouldNot: function(object, matcher) {
			return shouldNot.call(object, matcher);
		},
		should_not: function(object, matcher) {
			return shouldNot.call(object, matcher);
		}
	};
	Element.addMethods(proxiedMethods);
	//Event.extend(proxiedMethods); --> how do I extend Events? gotta pay more attention to the source

	var extend = function() {
		$A(arguments).each(function(object) {
      if (object.prototype) {
        object = object.prototype;
      }
      object.should = should;
      object.shouldNot = object.should_not = shouldNot;
		});
	};

	extend(Array, Date, Function, Number, RegExp, String);
	Class.create = Class.create.wrap(function() {
		var args = $A(arguments), proceed = args.shift(), klass = proceed.apply(Class, args);
		extend(klass);
		return klass;
	});

	return {
		extend: extend,
		Unmet: function(message) {
			this.name = "UnmetExpectation";
			this.message = message;
		}
	}
})();

Spec = Matcher.Helpers;
Spec.describe = function(contextName, map) {
	new Context(contextName, map);
};