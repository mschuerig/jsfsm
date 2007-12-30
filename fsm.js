// Copyright (c) 2007, Michael Schuerig, michael@schuerig.de
//
// Permission is hereby granted, free of charge, to any person obtaining
// a copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to
// permit persons to whom the Software is furnished to do so, subject to
// the following conditions:
//
// The above copyright notice and this permission notice shall be
// included in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
// EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
// NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
// LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
// OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
// WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

function FSM() {
  var machine       = this;
  this.builder      = null;
  var stateBuilders = {};
  var allEventNames = {};
  
  this.Version = '0.2';
  
  function delegateTo(obj, delegateName) {
    var funcs = [];
    for (var i = 2; i < arguments.length; i++) {
      var f = arguments[i];
      if (f && f.constructor === Array) {
        funcs = funcs.concat(f);
      } else if (typeof f == 'object') {
        for (var p in f) {
          funcs.push(p);
        }
      } else {
        funcs.push(f);
      }
    }
    for (var i = 0; i < funcs.length; i++) {
      var func = funcs[i];
      obj[func] = function(f) {
        return function() {
          var delegate = this[delegateName];
          return delegate[f].apply(this, arguments);
        }
      }(func);
    }
  }
  
  function mapArray(arr, f) {
    var result = [];
    var l = arr.length;
    for (var i = 0; i < l; i++) {
      result.push(f(arr[i]));
    }
    return result;
  }
  
  function predicateName(name) {
    return 'is' + name.charAt(0).toUpperCase() + name.substring(1);
  }
  
  function predicateFunc(context, name) {
    return function() {
      return (typeof context.currentState[name] == 'function');
    }
  }
  
  function runActions(context, actions, args, check) {
    var result = true;
    var l = actions.length;
    for (var i = 0; i < l; i++) {
      var a = actions[i];
      var func;
      switch (typeof a) {
      case 'function':
        func = a;
        break;
      case 'string':
        func = context[a];
        break;
      default:
        if (a && a.constructor === Array) {
          func = context[a[0]];
          args = a.slice(1);
        }
        break
      }
      result = func.apply(context, args);
      if (check && !result) return false;
    }
    return result;
  }
  
  function initialState(states) {
    for (var n in states) {
      var s = states[n];
      if (s.isInitial()) {
        return s;
      }
    }
    return null;
  }

  function finalStates(states) {
    var finalStates = [];
    for (var n in states) {
      var s = states[n];
      if (s.isFinal()) {
        finalStates.push(s);
      }
    }
    return finalStates;
  }

  var globalUnexpectedEventHandler = function(state, event) {
    if (console) {
      console.log('STATE: ', state, 'UNEXPECTED EVENT: ', event);
    }
  }


  function StateBuilder(stateName, kind) {
    var stateBuilder = this;
    this.transitionBuilder = null;
    var events        = {};
    var toState;
    var isInitial     = kind == 'initial';
    var isFinal       = kind == 'final';
    var enterActions  = [];
    var exitActions   = [];
    var unexpectedEventHandler = globalUnexpectedEventHandler
    
    function addTransition(name, transition) {
      events[name] = events[name] || [];
      events[name].push(transition);
      allEventNames[name] = true;
    }
    
    function TransitionBuilder(eventName) {
      var guards      = [];
      var actions     = [];
      var isLoopback  = false;
      var toStateName, guard, action;
      
      this.toString = function() {
        return '#<TransitionBuilder: ' + stateName + '--' + eventName + '-->' + toStateName + '>';
      };
      this.goesTo = function(toState) {
        toStateName = toState;
        isLoopback  = (stateName == toStateName);
        return stateBuilder;
      };
      this.onlyIf = function(condition) {
        guards.push(condition);
        return stateBuilder;
      };
      this.doing = function(doit) {
        if (arguments.length == 1) {
          actions.push(doit);
        } else {
          actions.push(Array.prototype.slice.call(arguments, 0));
        }
        return stateBuilder;
      };
      
      this.buildTransition = function() {
        var toState = toStateName || stateName;
        
        return {
          event: function() {
            return eventName;
          },
          appliesTo: function() {
            return runActions(this, guards, arguments, true);
          },
          execute: function() {
            var enteredState;
            try {
              runActions(this, actions, arguments);
              if (!isLoopback) {
                runActions(this, exitActions, arguments);
              }
              enteredState = this.transitionTo(toState);
              return true;
            } finally {
              if (!isLoopback && enteredState) {
                runActions(this, enteredState.enterActions(), arguments);
              }
            }
          },
          goesTo: function() {
            return toState;
          }
        };
      }
    }

    this.toString = function() {
      return 'StateBuilder: "' + stateName + '"';
    };
    
    this.event = function(name) {
      this.transitionBuilder = new TransitionBuilder(name, this);
      addTransition(name, this.transitionBuilder);
      return stateBuilder;
    };
    this.onEntering = function(func) {
      enterActions.push(func);
      return stateBuilder;
    };
    this.onExiting = function(func) {
      exitActions.push(func);
      return stateBuilder;
    };
    this.onUnexpectedEvent = function(func) {
      unexpectedEventHandler = func;
      return stateBuilder;
    }
    delegateTo(stateBuilder, 'transitionBuilder', 'goesTo', 'doing', 'onlyIf');
    
    this.buildState = function() {
      var transitions = buildTransitions();

      var state = {
        name:             function() { return stateName; },
        isInitial:        function() { return isInitial; },
        isFinal:          function() { return isFinal; },
        enterActions:     function() { return enterActions; },
        exitActions:      function() { return exitActions; },

        successorStates:  function(context) {
          return mapArray(allApplicableTransitions(context, transitions), function(t) {
            return t.goesTo();
          });
        },
        expectedEvents:   function(context) {
          return mapArray(allApplicableTransitions(context, transitions), function(t) {
            return t.event();
          });
        },

        inspect:          function() { return '#<State: ' + stateName + '>'; },
        toString:         function() { return stateName; }
      };

      state[predicateName(stateName)] = function() {
        return true;
      };
      for (var e in events) {
        state[e] = buildEventHandler(transitions[e]);
      }
      for (var e in allEventNames) {
        if (!state[e]) {
          state[e] = buildUnexpectedEventHandler(e);
        }
      }
      return state;
    };
    
    function buildTransitions() {
      var transitions = {};
      for (var e in events) {
        transitions[e] = mapArray(events[e], function(transitionBuilder) {
          return transitionBuilder.buildTransition();
        });
      }
      return transitions;
    }
    
    function buildEventHandler(transitions) {
      return function(arguments) {
        var t = firstApplicableTransition(this, transitions, arguments);
        if (t) {
          return t.execute.apply(this, arguments);
        }
        return false;
      }
    }
    
    function buildUnexpectedEventHandler(event) {
      return function() {
        unexpectedEventHandler(stateName, event);
      }
    }

    function firstApplicableTransition(context, transitions, args) {
      var len = transitions.length;
      for (var i = 0; i < len; i++) {
        var t = transitions[i];
        if (t.appliesTo.apply(context, args)) {
          return t;
        }
      }
      return null;
    }
  }
  
  function allApplicableTransitions(context, transitions) {
    context = context || this;
    var applTrans = [];
    for (var e in transitions) {
      var ts = transitions[e];
      var len = ts.length;
      for (var i = 0; i < len; i++) {
        var t = ts[i];
        if (t.appliesTo.apply(context)) {
          applTrans.push(t);
        }
      }
    }
    return applTrans;
  }
  
  this.state = function(name, kind) {
    var stateBuilder    = new StateBuilder(name, kind);
    stateBuilders[name] = stateBuilder;
    builder             = stateBuilder;
    return stateBuilder;
  };
  
  this.onUnexpectedEvent = function(handler) {
    globalUnexpectedEventHandler = handler;
  }
  
  
  var embedInto = function(context) {
    context.states = {};
    for (var n in stateBuilders) {
      context.states[n] = stateBuilders[n].buildState(context);
      var pn = predicateName(n);
      context[pn] = predicateFunc(context, pn);
    }
    var initial             = initialState(context.states);
    var finals              = finalStates(context.states);
    context.initialState    = function() { return initial; };
    context.finalStates     = function() { return finals; };
    context.currentState    = initial;
    context.transitionTo    = function(stateName) {
      this.currentState     = context.states[stateName];
      return this.currentState;
    };
    context.expectedEvents = function() {
      return this.currentState.expectedEvents(this);
    };
    context.successorStates = function() {
      return this.currentState.successorStates(this);
    };
    delegateTo(context, 'currentState', allEventNames);
    return context;
  }
  
  this.buildMachine = function() {
    return function(proto) {
      function Machine(){}
      Machine.prototype = proto;
      return embedInto(new Machine());
    }
  }
  
  this.toString = function() {
    var desc = "States:\n";
    for (var s in stateBuilders) {
      desc += '  ' + stateBuilders[s] + "\n";
    }
    return desc;
  }
  
  delegateTo(machine, 'builder', 'event', 'goesTo', 'doing', 'onlyIf');
}

FSM.build = function(definitionBlock) {
  var fsm = new FSM;
  definitionBlock(fsm);
  return fsm.buildMachine();
}
