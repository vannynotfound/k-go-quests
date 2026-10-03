import type { Attempt } from '../domain/engine';
import type { Repository } from './repository';

// Web is a UI preview: attempts live in memory and are lost on reload. Native uses encrypted SQLite.
const logs = new Map<string, Attempt[]>();
const repository: Repository = {
  attempts: async (owner) => [...(logs.get(owner) ?? [])],
  record: async (owner, attempt) => { logs.set(owner, [...(logs.get(owner) ?? []), attempt]); },
};
export const getRepository = async () => repository;
