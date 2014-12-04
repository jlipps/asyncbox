asyncbox
========

A collection of ES7 async/await utilities. Install via NPM:

```
npm install asyncbox
```

Then, behold!

### Sleep

An async/await version of setTimeout

```js
import { sleep } from 'asyncbox';

async function myFn () {
    // do some stuff
    await sleep(1000); // wait one second
    // do some other stuff
};
```

### Retry

An async/await way of running a method until it doesn't throw an error

```js
import { retry } from 'asyncbox';

async function flakeyFunction (val1, val2) {
    if (val1 < 10) {
        throw new Error("this is a flakey value");
    }
    await sleep(1000);
    return val1 + val2;
}

async function myFn () {
    let randVals = [Math.random() * 100, Math.random() * 100];

    // run flakeyFunction up to 3 times until it succeeds.
    // if it doesn't, we'll get the error thrown in this context
    let randSum = await retry(3, flakeyFunction, ...randVals);
}
```

### Run the tests

```
npm test
```
