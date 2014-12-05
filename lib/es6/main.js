import Q from 'q';

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

function nodeify (promisey, cb) {
  promisey.then(res => {
    if (res instanceof Array) {
      cb(null, ...res);
    } else {
      cb(null, res);
    }
  }, cb);
}

export { sleep, retry, nodeify };
