import { describe, expect, it } from "vitest";
import { RefreshQueue } from "./refreshQueue";

describe("RefreshQueue", () => {
  it("starts and finishes refresh state", () => {
    const queue = new RefreshQueue();

    expect(queue.isRefreshing()).toBe(false);
    queue.startRefresh();
    expect(queue.isRefreshing()).toBe(true);

    queue.finishRefresh("new-token");
    expect(queue.isRefreshing()).toBe(false);
  });

  it("delivers refreshed token to all queued waiters in order", () => {
    const queue = new RefreshQueue();
    const results: Array<string | null> = [];

    queue.startRefresh();
    queue.enqueue((token) => results.push(token));
    queue.enqueue((token) => results.push(token));

    expect(queue.pendingCount()).toBe(2);

    queue.finishRefresh("token-123");

    expect(results).toEqual(["token-123", "token-123"]);
    expect(queue.pendingCount()).toBe(0);
    expect(queue.isRefreshing()).toBe(false);
  });

  it("delivers null token to queued waiters on refresh failure", () => {
    const queue = new RefreshQueue();
    const results: Array<string | null> = [];

    queue.startRefresh();
    queue.enqueue((token) => results.push(token));
    queue.enqueue((token) => results.push(token));

    queue.finishRefresh(null);

    expect(results).toEqual([null, null]);
    expect(queue.pendingCount()).toBe(0);
    expect(queue.isRefreshing()).toBe(false);
  });
});
