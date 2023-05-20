import worker_threads, { workerData } from "node:worker_threads";
import { sleep } from "../utils/sleep.js";

/**
 * lock の test と set をアトミックに行う
 * @param {Uint8Array} lock
 */
function testAndSet(lock) {
  const oldValue = Atomics.compareExchange(lock, 0, 0, 1);
  return oldValue === 0;
}

/**
 * @param {Uint8Array} lock
 */
function wait(lock) {
  // 0 番目が 1 である(ロックがすでにとられている)限り待つ
  Atomics.wait(lock, 0, 1);
}

/**
 * @param {Uint8Array} lock
 */
function releaseAndNotify(lock) {
  Atomics.store(lock, 0, 0);
  Atomics.notify(lock, 0);
}

function main() {
  /**
   * 0 番目が 0 ならロックされてない、1 ならロックされてる
   * @type {SharedArrayBuffer}
   */
  const sharedLock = new SharedArrayBuffer(4);

  if (worker_threads.isMainThread) {
    new worker_threads.Worker(new URL(import.meta.url), {
      workerData: { name: "worker1", sharedLock },
    });
    new worker_threads.Worker(new URL(import.meta.url), {
      workerData: { name: "worker2", sharedLock },
    });
  } else {
    const { name, sharedLock } = workerData;
    const lock = new Int32Array(sharedLock);
    while (true) {
      wait(lock);
      if (testAndSet(lock)) {
        console.log(`${name} started something.`);
        sleep(1000);
        // ここでクリティカルセクション
        console.log(`${name} ended something.`);

        releaseAndNotify(lock);
        break;
      }
    }
  }
}

main();
