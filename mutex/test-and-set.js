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
    new worker_threads.Worker(new URL(import.meta.url), {
      workerData: { name: "worker1", sharedLock },
    });
    new worker_threads.Worker(new URL(import.meta.url), {
      workerData: { name: "worker2", sharedLock },
    });
  } else {
    const { name, sharedLock } = workerData;
    const lock = new Uint8Array(sharedLock);
    function retry() {
      if (testAndSet(lock)) {
        console.log(`${name} started something.`);
        sleep(1000);
        // ここでクリティカルセクション
        console.log(`${name} ended something.`);
      } else {
        // retry 間隔が短すぎると Maximum call stack size になるので 10ms 待つ
        sleep(10);
        retry();
      }
      tasRelease(lock);
    }
    retry();
  }
}

main();
