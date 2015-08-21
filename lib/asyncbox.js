// transpile:main

import B from 'bluebird';
import { mapify } from 'es6-mapify';
import _ from 'lodash';

async function sleep (ms) {
  return await B.delay(ms);
}

async function retry (times, fn, ...args) {
  let tries = 0;
  let done = false;
  let res = null;
  while (!done && tries < times) {
    tries++;
    try {
      res = await fn(...args);
      done = true;
    } catch (err) {
      if (tries >= times) {
        throw err;
      }
    }
  }
  return res;
}

async function retryInterval (times, sleepMs, fn, ...args) {
  let wrapped = async () => {
    let res;
    try {
      res = await fn(...args);
    } catch (e) {
      await sleep(sleepMs);
      throw e;
    }
    return res;
  };
  return retry(times, wrapped);
}

async function parallel (promises) {
  return await B.all(promises);
}

function nodeify (promisey, cb) {
  return B.resolve(promisey).nodeify(cb);
}

function nodeifyAll (promiseyMap) {
  let cbMap = {};
  for (let [name, fn] of mapify(promiseyMap)) {
    /*jshint -W083 */
    cbMap[name] = function (...args) {
      let _cb = args.slice(-1)[0];
      args = args.slice(0, -1);
      nodeify(fn(...args), _cb);
    };
  }
  return cbMap;
}

function asyncify (fn, ...args) {
  B.resolve(fn(...args)).done();
}

async function asyncmap (coll, mapper, runInParallel = true) {
  if (runInParallel) {
    return parallel(coll.map(mapper));
  }

  let newColl = [];
  for (let item of coll) {
    newColl.push(await mapper(item));
  }
  return newColl;
}

async function asyncfilter (coll, filter, runInParallel = true) {
  let newColl = [];
  if (runInParallel) {
    let bools = await parallel(coll.map(filter));
    for (let i = 0; i < coll.length; i++) {
      if (bools[i]) {
        newColl.push(coll[i]);
      }
    }
  } else {
    for (let item of coll) {
      if (await filter(item)) {
        newColl.push(item);
      }
    }
  }
  return newColl;
}

async function waitForCondition (condFn, opts = {}) {
  _.defaults(opts, {
    waitMs: 5000,
    intervalMs : 500,
  });
  let debug = opts.logger ? opts.logger.debug.bind(opts.logger) : _.noop;
  let begunAt = Date.now();
  let endAt = begunAt + opts.waitMs;
  let spin = async () => {
    if (await condFn()) {
      return;
    }
    let now = Date.now();
    let waited = now - begunAt;
    if (now < endAt) {
      debug(`Waited for ${waited} ms so far`);
      await B.delay(opts.intervalMs);
      await spin();
    } else {
      throw new Error(`Condition unmet after ${waited} ms. Timing out.`);
    }
  };
  await spin();
}

export { sleep, retry, nodeify, nodeifyAll, retryInterval, asyncify, parallel,
         asyncmap, asyncfilter, waitForCondition};
