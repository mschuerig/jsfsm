
Matcher.equalSets = function(a, b) {
  if (a.length != b.length) return false;
  return a.all(function(e) { return b.include(e); });
};

Matcher.addHelpers({
  beInState: function(expected) {
    return new Matcher.State("==", expected);
  },
  beInInitialState: function(expected) {
    return new Matcher.StateClassification("be_initial", expected);
  },
  beInFinalState: function(expected) {
    return new Matcher.StateClassification("be_final", expected);
  },
  expectEvents: function(expected) {
    return new Matcher.StateEvents("expect_events", expected);
  },
  expectEvent: function(expected) {
    return new Matcher.StateEvents("expect_event", expected);
  },
  haveSuccessorStates: function(expected) {
    return new Matcher.StateSuccessors("have_successors", expected);
  },
  haveSuccessorState: function(expected) {
    return new Matcher.StateSuccessors("include_successor", expected);
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
  failureMessage: function(maybe_not) {
    return "expected state " + Object.inspect(this.actual.currentState.name()) + (maybe_not || " ") + "to be " + this.comparison.replace(/_/, " ") +
      " " + Object.inspect(this.expected);
  },
  negativeFailureMessage: function() {
    return this.failureMessage(" not ");
  }
});

Matcher.create("StateClassification", {
  initialize: function(comparison, expected) {
    this.expected = expected;
    this.comparison = comparison;
  },
  matches: function(actual) {
    this.actual = actual;
    return this[this.comparison]();
  },
  be_initial: function() {
    return this.actual.currentState.isInitial();
  },
  be_final: function() {
    return this.actual.currentState.isFinal();
  },
  failureMessage: function(maybe_not) {
    return "expected state " + Object.inspect(this.actual.currentState.name()) + (maybe_not || " ") + "to " + this.comparison.replace(/_/, " ");
  },
  negativeFailureMessage: function() {
    return this.failureMessage(" not ");
  }
});

Matcher.create("StateEvents", {
  initialize: function(comparison, expected) {
    this.expected = expected;
    this.comparison = comparison;
  },
  matches: function(actual) {
    this.state = actual.currentState;
    this.actual = this.state.expectedEvents();
    return this[this.comparison]();
  },
  expect_events: function() {
    return Matcher.equalSets(this.actual, this.expected);
  },
  expect_event: function() {
    return this.actual.include(this.expected);
  },
  failureMessage: function(maybe_not) {
    return "expected state " + Object.inspect(this.state.name()) + (maybe_not || " ") + "to " + this.comparison.replace(/_/, " ") +
      " " + Object.inspect(this.expected) +
      "; was " + Object.inspect(this.actual);
  },
  negativeFailureMessage: function() {
    return this.failureMessage(" not ");
  }
});

Matcher.create("StateSuccessors", {
  initialize: function(comparison, expected) {
    this.expected = expected;
    this.comparison = comparison;
  },
  matches: function(actual) {
    this.state = actual.currentState;
    this.actual = this.state.successorStates();
    return this[this.comparison]();
  },
  have_successors: function() {
    return Matcher.equalSets(this.actual, this.expected);
  },
  include_successor: function() {
    return this.actual.include(this.expected);
  },
  failureMessage: function(maybe_not) {
    return "expected state " + Object.inspect(this.state.name()) + (maybe_not || " ") + "to " + this.comparison.replace(/_/, " ") +
      " " + Object.inspect(this.expected) +
      "; was " + Object.inspect(this.actual);
  },
  negativeFailureMessage: function() {
    return this.failureMessage(" not ");
  }
});
