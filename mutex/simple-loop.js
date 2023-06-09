import os from "node:os";
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
 * lock の 0 番目に 0 をセットしてロックを開放する
 * @param {Uint8Array} lock
 */
function tasRelease(lock) {
  Atomics.store(lock, 0, 0);
}

function main() {
  /**
   * 0 番目が 0 ならロックされてない、1 ならロックされてる
   * @type {SharedArrayBuffer}
   */
  const sharedLock = new SharedArrayBuffer(1);

  if (worker_threads.isMainThread) {
    os.cpus().forEach((_, index) => {
      new worker_threads.Worker(new URL(import.meta.url), {
        workerData: { name: `worker${index}`, sharedLock },
      });
    });
  } else {
    const { name, sharedLock } = workerData;
    const lock = new Uint8Array(sharedLock);
    while (true) {
      if (testAndSet(lock)) {
        console.log(`${name} started something.`);
        sleep(1000);
        // ここでクリティカルセクション
        console.log(`${name} ended something.`);
        console.log();

        tasRelease(lock);
        break;
      }
    }
  }
}

main();
