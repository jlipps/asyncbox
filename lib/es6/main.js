import Q from 'q';

async function sleep (ms) {
  let nodeSetTimeout = function (ms, cb) {
    setTimeout(cb, ms);
  };
  await Q.nfcall(nodeSetTimeout, ms);
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

export { sleep, retry };
