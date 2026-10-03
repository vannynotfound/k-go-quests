import type { Repository } from './repository';
import type { AttemptInput, AttemptResult, QueuedAttempt, Snapshot } from '../domain/types';
import { emptySnapshot } from '../domain/types';

// Web is a UI/API preview: no persistent tokens, private records, or student outbox.
// Reloading a preview tab clears its work; native uses encrypted SQLite payloads.
const snapshots = new Map<string, Snapshot>();
const queues = new Map<string, QueuedAttempt[]>();
const results = new Map<string, { input: AttemptInput; result: AttemptResult }[]>();
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const repository: Repository = {
  snapshot: async (owner) => clone(snapshots.get(owner) ?? emptySnapshot()),
  save: async (owner, snapshot) => { snapshots.set(owner, clone(snapshot)); },
  queue: async (owner, input) => {
    const queue = queues.get(owner) ?? [];
    const existing = queue.find((item) => item.input.clientAttemptId === input.clientAttemptId);
    if (existing && JSON.stringify(existing.input) !== JSON.stringify(input)) throw new Error('Attempt ID conflict');
    if (!existing) queues.set(owner, [...queue, { input: clone(input), state: 'PENDING' }]);
  },
  queued: async (owner) => clone(queues.get(owner) ?? []),
  outcomes: async (owner) => clone(results.get(owner) ?? []),
};
export const getRepository = async () => repository;
