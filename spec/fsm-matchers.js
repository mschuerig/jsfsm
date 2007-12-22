
Matcher.addHelpers({
  beInState: function(expected) {
    return new Matcher.State("==", expected);
  },
  beInInitialState: function(expected) {
    return new Matcher.State("isInitial", expected);
  },
  beInFinalState: function(expected) {
    return new Matcher.State("isFinal", expected);
  }
});

Matcher.create("State", {
  initialize: function(comparison, expected) {
    this.expected = expected;
    this.comparison = comparison;
  },
  matches: function(actual) {
    this.actual = actual;
    return this[this.comparison]();
  },
  "==": function() {
    return this.actual.currentState.name() == this.expected;
  },
  isInitial: function() {
    return this.actual.currentState.isInitial();
  },
  isFinal: function() {
    return this.actual.currentState.isFinal();
  },
  failureMessage: function(maybe_not) {
    return "expected state " + Object.inspect(this.expected) + (maybe_not || " ") + "to be " + this.comparison.replace(/_/, " ") +
      " " + Object.inspect(this.actual.currentState.name());
  },
  negativeFailureMessage: function() {
    return this.failureMessage(" not ");
  }
});
