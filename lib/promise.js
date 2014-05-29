function Promise(routine) {
  this.isResolved = false;
  this.isRejected = false;
  this.runVal = undefined;
  this.routine = routine;
  this.prev = null;
  this.next = null;
  //this.run();
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

function inputToPromise(any) {
  return any instanceof Promise && any
    || typeof any == 'function' && functionToPromise(this, any)
    || valueToPromise(any);
}

Promise.prototype.run = function () {
  if (this.prev != null && !this.prev.isResolved) this.prev.run();//prev not run yet
  else if (!this.isResolved) {//this not run yet
    setTimeout(function () {
      this.routine(this.resolve.bind(this), this.reject.bind(this));
    }.bind(this), 0);
  }
};

Promise.prototype.then = function (next) {
  console.log('next');
  this.next = inputToPromise.bind(this)(next);
  this.next.prev = this;
  if (this.isResolved) this.next.run();
  return this.next;
};

Promise.prototype.resolve = function (val) {
  console.log('resolve:' + val);
  this.isResolved = true;
  this.runVal = val;
  if (this.next) this.next.run(this.runVal);
};

Promise.prototype.reject = function (val) {
  console.log('reject');
  this.isRejected = true;
};

module.exports = Promise;