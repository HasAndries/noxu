var util = require('util');
var EventEmitter = require('events').EventEmitter;

function Promise(routine) {
  if (this instanceof Promise == false) {//called as function
    return anyToPromise(routine);
  }
  this.hasRun = false;
  this.isRunning = false;
  this.isResolved = false;
  this.isRejected = false;
  this.inputVal = undefined;
  this.outputVal = undefined;
  this.routine = routine;
  this.children = [];
  this.next = null;
}
var emitter = new EventEmitter();
Promise.on = function(name, callback){
  emitter.on(name, callback);
}

//setup
function functionToPromise(func) {
  var promise = new Promise(function (resolve, reject) {
    try {
      var output = func(this.inputVal);
      if (output instanceof Promise) output.success(resolve).fail(reject);
      else resolve(output);
    }
    catch (err) {
      reject(err);
    }
  });
  promise.routine = promise.routine.bind(promise);
  return promise;
}
function valueToPromise(val) {
  return new Promise(function (resolve) {
    resolve(val);
  });
}

function anyToPromise(any) {
  return any instanceof Promise && any
    || typeof any == 'function' && functionToPromise(any)
    || valueToPromise(any);
}

//chaining
function setNextFail(promise, nextFail) {
  promise.nextFail = nextFail;
  for (var ct = 0; ct < promise.children.length; ct++) {
    setNextFail(promise.children[ct], nextFail);
  }
}
function hasChildrenWaiting(children) {
  if (children.length) {
    for (var ct = 0; ct < children.length; ct++) {
      if (!children[ct].isRunning && !children[ct].hasRun) return true;
    }
  }
  return false;
}
function runChildren(promise) {
  for (var ct = 0; ct < promise.children.length; ct++) {
    var inputVal = promise.children[ct].prev && promise.children[ct].prev.outputVal;
    runPromise(promise.children[ct], inputVal);
  }
}
//running
function runPromise(promise, inputVal) {
  if (hasChildrenWaiting(promise.children)) runChildren(promise)//prev not run yet
  else if (!promise.isRunning && !promise.hasRun) {//promise not run yet
    promise.isRunning = true;
    promise.inputVal = inputVal;
    setImmediate(function () {
      promise.routine(promise.resolve.bind(promise), promise.reject.bind(promise));
    });
  }
}

//Chaining
Promise.prototype.then = function (next) {
  this.next = anyToPromise(next);
  this.next.children.push(this);
  if (this.isResolved) runPromise(this.next, this.outputVal);
  return this.next;
};
Promise.prototype.success = function (nextSuccess) {
  this.nextSuccess = anyToPromise(nextSuccess);
  this.nextSuccess.children.push(this);
  runPromise(this.nextSuccess, this.outputVal);
  return this.nextSuccess;
};
Promise.prototype.fail = function (nextFail) {
  var nextFailPromise = anyToPromise(nextFail);
  if (this.isRejected) runPromise(nextFailPromise, this.outputVal);
  else setNextFail(this, nextFailPromise);
  return this.nextFail;
};

//Grouping
Promise.all = function (input) {
  var group = new Promise(function (resolve, reject) {
    var failed = false;
    //check completion
    for (var ct = 0; ct < input.length; ct++) {
      if (!group.children[ct].hasRun) {
        group.isRunning = false;
        return;
      }
      else if (group.children[ct].isRejected) failed = true;
    }
    //gather output values
    group.outputVal = [];
    for (var ct = 0; ct < input.length; ct++) {
      group.outputVal.push(group.children[ct].outputVal);
    }
    if (!failed) resolve(group.outputVal);
    else reject(group.outputVal);
  });
  for (var ct = 0; ct < input.length; ct++) {
    anyToPromise(input[ct]).then(group);
  }
  return group;
};
Promise.sequence = function (input) {
  var promise = Promise();
  var outputVals = [];
  var collectOutput = function (input) {
    outputVals.push(input);
    return input;
  };
  for (var ct = 0; ct < input.length; ct++) {
    promise = promise.then(anyToPromise(input[ct])).then(collectOutput);
  }
  return promise.then(outputVals);
};

//Resolutions
Promise.prototype.resolve = function (val) {
  this.hasRun = true;
  this.isRunning = false;
  this.isResolved = true;
  this.outputVal = val;
  if (this.next) runPromise(this.next, this.outputVal);
  else if (this.nextSuccess) runPromise(this.nextSuccess, this.outputVal);
};

Promise.prototype.reject = function (val) {
  this.hasRun = true;
  this.isRunning = false;
  this.isRejected = true;
  this.outputVal = val;
  if (this.nextFail) runPromise(this.nextFail, this.outputVal);
  else emitter.emit('error', {promise: this, error: this.outputVal});
};


module.exports = Promise;