/**
 * スレッドをブロックして眠る
 * @param {number} n
 */
export function sleep(n) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, n);
}
