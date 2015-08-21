// transpile:mocha

/* global describe:true, it:true */
let regIt = it;
import 'mochawait';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { sleep, retry, retryInterval, nodeify, nodeifyAll,
         parallel, asyncmap, asyncfilter, waitForCondition } from '../lib/asyncbox';

chai.use(chaiAsPromised);
let should = chai.should();

describe('sleep', () => {
  it('should work like setTimeout', async () => {
    var now = Date.now();
    await sleep(20);
    (Date.now() - now).should.be.above(19);
  });
});

describe('retry', () => {
  let okFnCalls = 0;
  let okFn = async (val1, val2) => {
    await sleep(15);
    okFnCalls++;
    return val1 * val2;
  };
  let badFnCalls = 0;
  let badFn = async () => {
    await sleep(15);
    badFnCalls++;
    throw new Error("bad");
  };
  let eventuallyOkFnCalls = 0;
  let eventuallyOkFn = async (times) => {
    await sleep(15);
    eventuallyOkFnCalls++;
    if (eventuallyOkFnCalls < times) {
      throw new Error("not ok yet");
    }
    return times * times;
  };
  let eventuallyOkNoSleepFn = async (times) => {
    eventuallyOkFnCalls++;
    if (eventuallyOkFnCalls < times) {
      throw new Error("not ok yet");
    }
    return times * times;
  };
  it('should return the result of a passing function', async () => {
    let start = Date.now();
    let res = await retry(3, okFn, 5, 4);
    res.should.equal(20);
    (Date.now() - start).should.be.above(14);
    okFnCalls.should.equal(1);
  });
  it('should retry a failing function and eventually throw the same err', async () => {
    let err = null;
    let start = Date.now();
    try {
      await retry(3, badFn);
    } catch (e) {
      err = e;
    }
    should.exist(err);
    err.message.should.equal('bad');
    badFnCalls.should.equal(3);
    (Date.now() - start).should.be.above(44);
  });
  it('should return the correct value with a function that eventually passes', async () => {
    let err = null;
    let start = Date.now();
    try {
      await retry(3, eventuallyOkFn, 4);
    } catch (e) {
      err = e;
    }
    should.exist(err);
    err.message.should.equal('not ok yet');
    eventuallyOkFnCalls.should.equal(3);
    (Date.now() - start).should.be.above(35);

    // rerun with ok number of calls
    start = Date.now();
    eventuallyOkFnCalls = 0;
    let res = await retry(3, eventuallyOkFn, 3);
    eventuallyOkFnCalls.should.equal(3);
    res.should.equal(9);
    (Date.now() - start).should.be.above(35);
  });
  it('in sleep mode, should return the correct value with a function that eventually passes', async () => {
    eventuallyOkFnCalls = 0;
    let err = null;
    let start = Date.now();
    try {
      await retryInterval(3, 15, eventuallyOkNoSleepFn, 4);
    } catch (e) {
      err = e;
    }
    should.exist(err);
    err.message.should.equal('not ok yet');
    eventuallyOkFnCalls.should.equal(3);
    (Date.now() - start).should.be.above(30);

    // rerun with ok number of calls
    start = Date.now();
    eventuallyOkFnCalls = 0;
    let res = await retryInterval(3, 15, eventuallyOkNoSleepFn, 3);
    eventuallyOkFnCalls.should.equal(3);
    res.should.equal(9);
    (Date.now() - start).should.be.above(30);
  });
});

describe('nodeifyAll', () => {
  let asyncFn = async (val) => {
    await sleep(15);
    return val;
  };
  let asyncFn2 = async (val) => {
    await sleep(15);
    return [val, val + val];
  };
  let badAsyncFn = async () => {
    await sleep(15);
    throw new Error('boo');
  };
  let cbMap = nodeifyAll({asyncFn, asyncFn2, badAsyncFn});
  regIt('should turn async functions into nodey things', done => {
    let start = Date.now();
    nodeify(asyncFn('foo'), (err, val, val2) => {
      should.not.exist(err);
      should.not.exist(val2);
      val.should.equal('foo');
      (Date.now() - start).should.be.above(14);
      done();
    });
  });
  regIt('should turn async functions into nodey things via nodeifyAll', done => {
    let start = Date.now();
    cbMap.asyncFn('foo', (err, val, val2) => {
      should.not.exist(err);
      should.not.exist(val2);
      val.should.equal('foo');
      (Date.now() - start).should.be.above(14);
      done();
    });
  });
  regIt('should turn async functions into nodey things with mult params', done => {
    let start = Date.now();
    nodeify(asyncFn2('foo'), (err, val) => {
      should.not.exist(err);
      val.should.eql(['foo', 'foofoo']);
      (Date.now() - start).should.be.above(14);
      done();
    });
  });
  regIt('should handle errors correctly', done => {
    let start = Date.now();
    nodeify(badAsyncFn('foo'), (err, val) => {
      should.not.exist(val);
      err.message.should.equal('boo');
      (Date.now() - start).should.be.above(14);
      done();
    });
  });
});

//describe('nodeifyAll', () => {
  //let asyncFn = async (val) => {
    //await sleep(15);
    //return val;
  //};
  //let asyncFn2 = async (val) => {
    //await sleep(15);
    //return [val, val + val];
  //};
  //let badAsyncFn = async () => {
    //await sleep(15);
    //throw new Error('boo');
  //};
//});

describe('parallel', () => {
  let asyncFn = async (val) => {
    await sleep(50);
    return val;
  };
  let badAsyncFn = async () => {
    await sleep(20);
    throw new Error("boo");
  };
  it('should perform tasks in parallel and return results', async () => {
    let vals = [1, 2, 3];
    let promises = [];
    let start = Date.now();
    for (let v of vals) {
      promises.push(asyncFn(v));
    }
    let res = await parallel(promises);
    (Date.now() - start).should.be.above(49);
    (Date.now() - start).should.be.below(59);
    res.sort().should.eql([1, 2, 3]);
  });
  it('should error with first response', async () => {
    let vals = [1, 2, 3];
    let promises = [];
    let start = Date.now();
    for (let v of vals) {
      promises.push(asyncFn(v));
    }
    promises.push(badAsyncFn());
    let err = null;
    let res = [];
    try {
      res = await parallel(promises);
    } catch (e) {
      err = e;
    }
    (Date.now() - start).should.be.above(19);
    (Date.now() - start).should.be.below(49);
    should.exist(err);
    res.should.eql([]);
  });
  it('should not allow parallelizing bad types of things', async () => {
    let err;
    try {
      await parallel('foo');
    } catch (e) {
      err = e;
    }
    should.exist(err);
    try {
      await parallel([1]);
    } catch (e) {
      err = e;
    }
    should.exist(err);
  });

  describe('waitForCondition', () => {
    it('should wait and succeed', async () => {
      let ref = Date.now();
      function condFn() {
        return Date.now() - ref > 200;
      }
      await waitForCondition(condFn, {waitMs: 1000, intervalMs: 10});
      let duration = Date.now() - ref;
      duration.should.be.above(200);
      duration.should.be.below(250);
    });
    it('should wait and fail', async () => {
      let ref = Date.now();
      function condFn() {
        return Date.now() - ref > 200;
      }
      await (waitForCondition(condFn, {waitMs: 100, intervalMs: 10}))
        .should.be.rejectedWith(/Condition unmet/);
    });
  });
});

describe('asyncmap', () => {
  const mapper = async function (el) {
    await sleep(10);
    return el * 2;
  };
  const coll = [1, 2, 3];
  it('should map elements one at a time', async () => {
    let start = Date.now();
    (await asyncmap(coll, mapper, false)).should.eql([2, 4, 6]);
    (Date.now() - start).should.be.above(30);
  });
  it('should map elements in parallel', async () => {
    let start = Date.now();
    (await asyncmap(coll, mapper)).should.eql([2, 4, 6]);
    (Date.now() - start).should.be.below(20);
  });
  it('should handle an empty array', async () => {
    (await asyncmap([], mapper, false)).should.eql([]);
  });
  it('should handle an empty array in parallel', async () => {
    (await asyncmap([], mapper)).should.eql([]);
  });
});

describe('asyncfilter', () => {
  const filter = async function (el) {
    await sleep(5);
    return el % 2 === 0;
  };
  const coll = [1, 2, 3, 4, 5];
  it('should filter elements one at a time', async () => {
    let start = Date.now();
    (await asyncfilter(coll, filter, false)).should.eql([2, 4]);
    (Date.now() - start).should.be.above(19);
  });
  it('should filter elements in parallel', async () => {
    let start = Date.now();
    (await asyncfilter(coll, filter)).should.eql([2, 4]);
    (Date.now() - start).should.be.below(9);
  });
  it('should handle an empty array', async () => {
    let start = Date.now();
    (await asyncfilter([], filter, false)).should.eql([]);
    (Date.now() - start).should.be.below(9);
  });
  it('should handle an empty array in parallel', async () => {
    let start = Date.now();
    (await asyncfilter([], filter)).should.eql([]);
    (Date.now() - start).should.be.below(9);
  });
});
