/**
 * 获取锁的纯状态转移。
 *
 * 抽出来的理由：项目没有 jsdom，组件测不了，而这个不变量很微妙且一旦破坏**很难发现**
 * ——"只有当前持有者能释放锁"。如果 release 无条件清空，一个迟到的回调（比如用户很快
 * 换了另一季、前一个请求的回调才回来）就会把别人刚上的锁清掉，于是同剧的获取按钮在
 * 本该禁用的时候又可点了，重叠请求的护栏失效。
 */

export interface AcquisitionLockValue {
  /** 当前正在获取的 scope（"remaining" / "season-2"…），空表示无人持有。 */
  acquiring: string | null;
}

/** 上锁：后来的请求直接覆盖（调用方保证同一时刻只会有一个按钮可用）。 */
export function lockScope(current: string | null, scope: string): string | null {
  void current;
  return scope;
}

/**
 * 释放锁。**只有持有者能释放**：scope 不匹配时原样返回。
 * 返回同值时调用方（React 的 setState）会跳过重渲染，所以这是无副作用的。
 */
export function releaseScope(current: string | null, scope: string): string | null {
  return current === scope ? null : current;
}
