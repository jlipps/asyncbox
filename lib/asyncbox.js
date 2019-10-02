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
  let count = 0;
  let wrapped = async () => {
    count++;
    let res;
    try {
      res = await fn(...args);
    } catch (e) {
      // do not pause when finished the last retry
      if (count !== times) {
        await sleep(sleepMs);
      }
      throw e;
    }
    return res;
  };
  return await retry(times, wrapped);
}

async function parallel (promises) {
  return await B.all(promises);
}

function nodeify (promisey, cb) { // eslint-disable-line promise/prefer-await-to-callbacks
  return B.resolve(promisey).nodeify(cb);
}

function nodeifyAll (promiseyMap) {
  let cbMap = {};
  for (const [name, fn] of mapify(promiseyMap)) {
    cbMap[name] = function (...args) {
      const _cb = args.slice(-1)[0];
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
    intervalMs: 500,
  });
  const debug = opts.logger ? opts.logger.debug.bind(opts.logger) : _.noop;
  const error = opts.error;
  const begunAt = Date.now();
  const endAt = begunAt + opts.waitMs;
  const spin = async function spin () {
    const result = await condFn();
    if (result) {
      return result;
    }
    const now = Date.now();
    const waited = now - begunAt;
    if (now < endAt) {
      debug(`Waited for ${waited} ms so far`);
      await B.delay(opts.intervalMs);
      return await spin();
    }
    // if there is an error option, it is either a string message or an error itself
    throw error
      ? (_.isString(error) ? new Error(error) : error)
      : new Error(`Condition unmet after ${waited} ms. Timing out.`);
  };
  return await spin();
}

export {
  sleep, retry, nodeify, nodeifyAll, retryInterval, asyncify, parallel,
  asyncmap, asyncfilter, waitForCondition
};
