function Promise(routine) {
  if (this instanceof Promise == false){//called as function
    return anyToPromise(routine);
  }
  this.hasRun = false;
  this.isRunning = false;
  this.isResolved = false;
  this.isRejected = false;
  this.inputVals = [];
  this.outputVal = undefined;
  this.routine = routine;
  this.children = [];
  this.next = null;
}

function functionToPromise(func) {
  var promise = new Promise(function (resolve, reject) {
    try {
      resolve(func(this.inputVals));
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

function anyToPromise(any){
  return any instanceof Promise && any
    || typeof any == 'function' && functionToPromise(any)
    || valueToPromise(any);
}

function setNextFail(promise, nextFail){
  promise.nextFail = nextFail;
  for(var ct=0;ct<promise.children.length;ct++){
    setNextFail(promise.children[ct], nextFail);
  }
}

function hasChildrenWaiting(children){
  if (children.length){
    for(var ct=0;ct<children.length;ct++){
      if (!children[ct].isRunning && !children[ct].hasRun) return true;
    }
  }
  return false;
}
function runChildren(promise){
  for(var ct=0;ct<promise.children.length;ct++){
    var inputVal = promise.children[ct].prev && promise.children[ct].prev.outputVal;
    runPromise(promise.children[ct], inputVal);
  }
}

function runPromise(promise, inputVal){
  if (hasChildrenWaiting(promise.children)) runChildren(promise)//prev not run yet
  else if (!promise.isRunning && !promise.hasRun) {//promise not run yet
    promise.isRunning = true;
    promise.inputVals.push(inputVal);
    console.log('inputVal:' + inputVal);
    process.nextTick(function(){
      console.log('running');
      promise.routine(promise.resolve.bind(promise), promise.reject.bind(promise));
    });
  }
}

//Promise.prototype.run = function (val) {
//  if (hasChildrenWaiting(this.children)) runChildren(this.children)//prev not run yet
//  else if (!this.isRunning && !this.hasRun) {//this not run yet
//    this.isRunning = true;
//    this.inputVals.push(val);
//    process.nextTick(function(){
//      console.log('running');
//      this.routine(this.resolve.bind(this), this.reject.bind(this));
//    }.bind(this));
//  }
//};

//Chaining
Promise.prototype.then = function (next) {
  console.log('next');
  this.next = anyToPromise(next);
  this.next.children.push(this);
  if (this.isResolved) runPromise(this.next, this.outputVal);
  return this.next;
};
Promise.prototype.success = function (nextSuccess) {
  console.log('success');
  this.nextSuccess = anyToPromise(nextSuccess);
  this.nextSuccess.children.push(this);
  runPromise(this.nextSuccess, this.outputVal);
  return this.nextSuccess;
};
Promise.prototype.fail = function (nextFail) {
  console.log('fail');
  var nextFailPromise = anyToPromise(nextFail);
  setNextFail(this, nextFailPromise);
  //this.nextFail.children.push(this);
  if (this.isRejected) runPromise(this.nextFail, this.outputVal);
  return this.nextFail;
};

//Grouping
Promise.all = function(input){
  var group = new Promise(function(resolve, reject){
    var failed = false;
    for(var ct=0;ct<input.length;ct++){
      if (!group.children[ct].hasRun){
        group.isRunning = false;
        return;
      }
      else if (group.children[ct].isRejected) failed = true;
    }
    if (!failed) resolve();
    else reject();
  });
  for(var ct=0;ct<input.length;ct++){
    anyToPromise(input[ct]).then(group);
  }
  return group;
};
Promise.sequence = function(input){
  var promise = Promise();
  for(var ct=0;ct<input.length;ct++){
    promise = promise.then(anyToPromise(input[ct]));
  }
  return promise;
};

//Resolutions
Promise.prototype.resolve = function (val) {
  this.hasRun = true;
  this.isRunning = false;
  console.log('resolve:' + val);
  this.isResolved = true;
  this.outputVal = val;
  if (this.next) runPromise(this.next, this.outputVal);
  else if (this.nextSuccess) runPromise(this.nextSuccess, this.outputVal);
  else if (this.nextFinish) runPromise(this.nextFinish, this.outputVal);
};

Promise.prototype.reject = function (val) {
  this.hasRun = true;
  this.isRunning = false;
  console.log('reject');
  this.isRejected = true;
  this.outputVal = val;
  console.log(this);
  //if (this.next) this.next.reject(this.runVal);
  if (this.nextFail) runPromise(this.nextFail, this.outputVal);
  else if (this.outputVal instanceof Error) throw val;
  else throw new Error(this.outputVal);
  //if (this.nextFinish) this.nextFinish.run(this.runVal);
};

module.exports = Promise;