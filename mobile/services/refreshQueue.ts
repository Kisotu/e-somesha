export type RefreshQueueResolver = (token: string | null) => void;

export class RefreshQueue {
  private isRefreshingValue = false;
  private waiters: RefreshQueueResolver[] = [];

  isRefreshing(): boolean {
    return this.isRefreshingValue;
  }

  startRefresh(): void {
    this.isRefreshingValue = true;
  }

  enqueue(waiter: RefreshQueueResolver): void {
    this.waiters.push(waiter);
  }

  finishRefresh(token: string | null): void {
    this.isRefreshingValue = false;
    const queued = [...this.waiters];
    this.waiters = [];
    queued.forEach((resolve) => resolve(token));
  }

  pendingCount(): number {
    return this.waiters.length;
  }
}
