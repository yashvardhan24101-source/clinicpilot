import { describe, it, expect, beforeEach } from "vitest";
import { offlineQueue } from "@/lib/offline-queue";

describe("Offline Mutation Queue", () => {
  beforeEach(() => {
    offlineQueue.clear();
  });

  it("enqueues an action and retrieves it", () => {
    const action = offlineQueue.enqueue("apt-123", "arrived");
    expect(action.appointment_id).toBe("apt-123");
    expect(action.status).toBe("arrived");

    const queue = offlineQueue.getQueue();
    expect(queue.length).toBe(1);
    expect(queue[0].appointment_id).toBe("apt-123");
    expect(offlineQueue.hasPending("apt-123")).toBe(true);
  });

  it("updates existing queued action for the same appointment with latest status", () => {
    offlineQueue.enqueue("apt-123", "arrived");
    offlineQueue.enqueue("apt-123", "completed");

    const queue = offlineQueue.getQueue();
    expect(queue.length).toBe(1);
    expect(queue[0].status).toBe("completed");
  });

  it("removes an action by id", () => {
    const action = offlineQueue.enqueue("apt-456", "no_show");
    expect(offlineQueue.getQueue().length).toBe(1);

    offlineQueue.remove(action.id);
    expect(offlineQueue.getQueue().length).toBe(0);
    expect(offlineQueue.hasPending("apt-456")).toBe(false);
  });
});
