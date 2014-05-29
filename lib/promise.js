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
  this.prev = null;
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

Promise.prototype.run = function () {
  if (this.prev != null && !this.prev.isRunning && !this.prev.hasRun) this.prev.run();//prev not run yet
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
  this.next.prev = this;
  if (this.isResolved) this.next.run();
  return this.next;
};
Promise.prototype.success = function (nextSuccess) {
  console.log('success');
  this.nextSuccess = anyToPromise.bind(this)(nextSuccess);
  this.nextSuccess.prev = this;
  this.nextSuccess.run();
  return this.nextSuccess;
};
Promise.prototype.fail = function (nextFail) {
  console.log('fail');
  this.nextFail = anyToPromise.bind(this)(nextFail);
  this.nextFail.prev = this;
  if (this.isRejected) this.nextFail.run();
  return this.nextFail;
};

//Grouping
Promise.all = function(input){
  var group = new Promise(function(resolve, reject){
    var failed = false;
    for(var ct=0;ct<input.length;ct++){
      if (!group.children[ct].hasRun){
        group.running = false;
        return;
      }
      else if (group.children[ct].isRejected) failed = true;
    }
    console.log(this);
    if (!failed) resolve();
    else reject();
  });
  group.children = [];
  for(var ct=0;ct<input.length;ct++){
    group.children[ct] = anyToPromise.bind(this)(input[ct]);
    group.children[ct].then(group);
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
  console.log(this);
  console.log();
  if (this.next) this.next.reject(this.runVal);
  else if (this.nextFail) this.nextFail.run(this.runVal);
  else if (this.runVal instanceof Error) throw val;
  else throw new Error(this.runVal);
  //if (this.nextFinish) this.nextFinish.run(this.runVal);
};

module.exports = Promise;