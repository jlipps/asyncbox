/* global describe:true, it:true */
import 'traceur/bin/traceur-runtime';
import 'mochawait';
import should from 'should';
import { sleep, retry } from '../../lib/es5/main';

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
    (Date.now() - start).should.be.above(44);

    // rerun with ok number of calls
    start = Date.now();
    eventuallyOkFnCalls = 0;
    let res = await retry(3, eventuallyOkFn, 3);
    eventuallyOkFnCalls.should.equal(3);
    res.should.equal(9);
    (Date.now() - start).should.be.above(44);
  });
});
