function Promise(routine) {
  if (this instanceof Promise == false){//called as function
    return anyToPromise(routine);
  }
  this.hasRun = false;
  this.isRunning = false;
  this.isResolved = false;
  this.isRejected = false;
  this.runVal = undefined;
  this.routine = routine;
  this.children = [];
  this.next = null;
}

function functionToPromise(context, func) {
  return new Promise(function (resolve, reject) {
    try {
      resolve(func(this.runVal));
    }
    catch (err) {
      reject(err);
    }
  }.bind(context));
}
function valueToPromise(val) {
  return new Promise(function (resolve) {
    resolve(val);
  });
}

function anyToPromise(any){
  return any instanceof Promise && any
    || typeof any == 'function' && functionToPromise(this, any)
    || valueToPromise(any);
}

function hasChildrenWaiting(children){
  if (children.length){
    for(var ct=0;ct<children.length;ct++){
      if (!children[ct].isRunning && !children[ct].hasRun) return true;
    }
  }
  return false;
}
function runChildren(children){
  for(var ct=0;ct<children.length;ct++){
    children[ct].run();
  }
}

Promise.prototype.run = function () {
  if (hasChildrenWaiting(this.children)) runChildren(this.children)//prev not run yet
  else if (!this.isRunning && !this.hasRun) {//this not run yet
    this.isRunning = true;
    //process.nextTick(function(){
      console.log('running');
      this.routine(this.resolve.bind(this), this.reject.bind(this));
    //}.bind(this));
  }
};

//Chaining
Promise.prototype.then = function (next) {
  console.log('next');
  this.next = anyToPromise.bind(this)(next);
  this.next.children.push(this);
  if (this.isResolved) this.next.run();
  return this.next;
};
Promise.prototype.success = function (nextSuccess) {
  console.log('success');
  this.nextSuccess = anyToPromise.bind(this)(nextSuccess);
  this.nextSuccess.children.push(this);
  this.nextSuccess.run();
  return this.nextSuccess;
};
Promise.prototype.fail = function (nextFail) {
  console.log('fail');
  this.nextFail = anyToPromise.bind(this)(nextFail);
  this.nextFail.children.push(this);
  if (this.isRejected) this.nextFail.run();
  return this.nextFail;
};

//Grouping
Promise.all = function(input){
  var group = new Promise(function(resolve, reject){
    console.log('check group finished');
    var failed = false;
    for(var ct=0;ct<input.length;ct++){
      if (!group.children[ct].hasRun){
        group.running = false;
        return;
      }
      else if (group.children[ct].isRejected) failed = true;
    }
    if (!failed) resolve();
    else reject();
  });
  for(var ct=0;ct<input.length;ct++){
    anyToPromise.bind(this)(input[ct]).then(group);
  }
  return group;
};

//Resolutions
Promise.prototype.resolve = function (val) {
  this.hasRun = true;
  this.isRunning = false;
  console.log('resolve:' + val);
  this.isResolved = true;
  this.runVal = val;
  if (this.next) this.next.run(this.runVal);
  else if (this.nextSuccess) this.nextSuccess.run(this.runVal);
  else if (this.nextFinish) this.nextFinish.run(this.runVal);
};

Promise.prototype.reject = function (val) {
  this.hasRun = true;
  this.isRunning = false;
  console.log('reject');
  this.isRejected = true;
  this.runVal = val;
  if (this.next) this.next.reject(this.runVal);
  else if (this.nextFail) this.nextFail.run(this.runVal);
  else if (this.runVal instanceof Error) throw val;
  else throw new Error(this.runVal);
  //if (this.nextFinish) this.nextFinish.run(this.runVal);
};

module.exports = Promise;