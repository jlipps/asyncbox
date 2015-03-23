import Q from 'q';
import { mapify } from 'es6-mapify';
import 'traceur/bin/traceur-runtime';

async function sleep (ms) {
  let nodeSetTimeout = function (ms, cb) {
    return setTimeout(cb, ms);
  };
  return await Q.nfcall(nodeSetTimeout, ms);
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
  let done = Q.defer();
  let results = [];
  for (let p of promises) {
    p.then(function (res) {
      results.push(res);
      if (results.length === promises.length) {
        done.resolve(results);
      }
    }, function (err) {
      done.reject(err);
    });
  }
  return done.promise;
}

function nodeify (promisey, cb) {
  promisey.then(res => { cb(null, res); }, cb);
}

function nodeifyAll (promiseyMap) {
  let cbMap = {};
  for (let [name, fn] of mapify(promiseyMap)) {
    cbMap[name] = function (...args) {
      let _cb = args.slice(-1)[0];
      args = args.slice(0, -1);
      nodeify(fn(...args), _cb);
    };
  }
  return cbMap;
}

function asyncify (fn, ...args) {
  fn.call(null, ...args).then(() => {}, (err) => {
    console.error(err.stack);
  });
}

export { sleep, retry, nodeify, nodeifyAll, retryInterval, asyncify, parallel };
