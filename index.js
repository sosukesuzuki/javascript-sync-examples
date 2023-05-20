import worker_threads, { workerData } from "node:worker_threads";

/**
 * lock の test と set をアトミックに行う
 * @param {Uint8Array} lock
 */
function testAndSet(lock) {
  const oldValue = Atomics.compareExchange(lock, 0, 0, 1);
  return oldValue === 0;
}

/**
 * lock の 0 番目に 0 をセットしてロックを開放する
 * @param {Uint8Array} lock
 */
function tasRelease(lock) {
  Atomics.store(lock, 0, 0);
}

/**
 * スレッドをブロックして眠る
 * @param {number} n
 */
function msleep(n) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, n);
}

function main() {
  /**
   * 0 番目が 0 ならロックされてない、1 ならロックされてる
   * @type {Uint8Array}
   */
  const lock = new Uint8Array(new SharedArrayBuffer(1));

  const sharedResource = new Uint8Array(new SharedArrayBuffer(4));

  if (worker_threads.isMainThread) {
    new worker_threads.Worker(new URL(import.meta.url), {
      workerData: { name: "worker1" },
    });
    new worker_threads.Worker(new URL(import.meta.url), {
      workerData: { name: "worker2" },
    });
  } else {
    const { name } = workerData;
    function retry() {
      if (testAndSet(lock)) {
        console.log(`${name} started something.`);
        if (name === "worker1") {
          sharedResource[0] = 0;
          sharedResource[1] = 1;
          sharedResource[2] = 2;
          sharedResource[3] = 3;
        } else if (name === "worker2") {
          sharedResource[0] = 4;
          sharedResource[1] = 3;
          sharedResource[2] = 2;
          sharedResource[3] = 1;
        }
        console.log(`${name} ended something.`);
      } else {
        // retry 間隔が短すぎると Maximum call stack size なので 10ms 待つ
        msleep(10);
      }
      tasRelease(lock);
    }
    retry();
  }

  console.log(sharedResource);
}

main();
