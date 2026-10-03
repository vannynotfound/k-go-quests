import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AppState, View } from 'react-native';
import { randomUUID } from 'expo-crypto';
import type { AttemptInput, AttemptResult, Pack, Profile, QueuedAttempt, Snapshot } from '../domain/types';
import { emptySnapshot } from '../domain/types';
import { isIdle, isValidPin, lockedOut, recordFailure, type Lockout } from '../domain/pin-lock';
import { getRepository } from '../data/storage';
import { pinDigest } from '../data/crypto';
import { vault } from '../data/vault';

export type Appearance = 'light' | 'dark' | 'system';
interface Preferences { appearance: Appearance; language: string; }
interface Notice { message: string; kind: 'success' | 'error' | 'info'; }
interface AppContextValue {
  ready: boolean; profiles: Profile[]; profile: Profile | null; locked: boolean;
  snapshot: Snapshot; queued: QueuedAttempt[]; outcomes: { input: AttemptInput; result: AttemptResult }[];
  notice: Notice | null; preferences: Preferences;
  toast(message: string, kind?: Notice['kind']): void; dismiss(): void;
  createProfile(alias: string, pin: string): Promise<void>;
  selectProfile(id: string | null): void; lock(): void; unlock(pin: string): Promise<void>;
  queue(exerciseId: string, selectedOption: number, pack: Pack): Promise<void>;
  updatePreferences(change: Partial<Preferences>): Promise<void>;
}
const AppContext = createContext<AppContextValue | null>(null);
const defaults: Preferences = { appearance: 'light', language: 'en' };
const pinKey = (id: string) => `kgo-pin-${id}`;
const lockoutKey = (id: string) => `kgo-lockout-${id}`;

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [locked, setLocked] = useState(true);
  const [snapshot, setSnapshot] = useState<Snapshot>(emptySnapshot);
  const [queued, setQueued] = useState<QueuedAttempt[]>([]);
  const [outcomes, setOutcomes] = useState<{ input: AttemptInput; result: AttemptResult }[]>([]);
  const [preferences, setPreferences] = useState<Preferences>(defaults);
  const [notice, setNotice] = useState<Notice | null>(null);
  const profileRef = useRef(profile); const snapshotRef = useRef(snapshot);
  const lockedRef = useRef(locked); const lastInteraction = useRef(0);

  const toast = useCallback((message: string, kind: Notice['kind'] = 'info') => setNotice({ message, kind }), []);
  // Refs mirror committed state so async handlers read fresh values; set after every commit, never during render.
  useEffect(() => { profileRef.current = profile; snapshotRef.current = snapshot; lockedRef.current = locked; });

  const forget = () => { setSnapshot(emptySnapshot()); setQueued([]); setOutcomes([]); };
  const lock = useCallback(() => { lockedRef.current = true; setLocked(true); }, []);
  const loadLocal = useCallback(async (owner: string) => {
    const repo = await getRepository();
    const [next, queue, confirmed] = await Promise.all([repo.snapshot(owner), repo.queued(owner), repo.outcomes(owner)]);
    if (profileRef.current?.id === owner && !lockedRef.current) { snapshotRef.current = next; setSnapshot(next); setQueued(queue); setOutcomes(confirmed); }
  }, []);

  useEffect(() => { void (async () => {
    try {
      const [labels, prefs] = await Promise.all([vault.get('kgo-profiles'), vault.get('kgo-preferences')]);
      if (labels) setProfiles(JSON.parse(labels)); if (prefs) setPreferences({ ...defaults, ...JSON.parse(prefs) });
    } catch { toast('Profiles on this tablet could not be restored.', 'error'); }
    finally { setReady(true); }
  })(); }, [toast]);

  useEffect(() => {
    lastInteraction.current = Date.now();
    const listener = AppState.addEventListener('change', (state) => {
      if (state !== 'active' && profileRef.current) lock();
      if (state === 'active') lastInteraction.current = Date.now();
    });
    const timer = setInterval(() => { if (profileRef.current && isIdle(lastInteraction.current, Date.now())) lock(); }, 15000);
    return () => { listener.remove(); clearInterval(timer); };
  }, [lock]);

  const open = async (next: Profile) => {
    profileRef.current = next; setProfile(next); forget();
    lockedRef.current = false; setLocked(false); lastInteraction.current = Date.now();
    try { await loadLocal(next.id); }
    catch (error) { lock(); throw error; }
  };
  const createProfile = async (alias: string, pin: string) => {
    const name = alias.trim();
    if (!name) throw new Error('Enter a name for this profile.');
    if (!isValidPin(pin)) throw new Error('Choose a 6-digit PIN.');
    const next = { id: randomUUID(), alias: name };
    const all = [...profiles, next];
    await vault.set(pinKey(next.id), await pinDigest(next.id, pin));
    await vault.set('kgo-profiles', JSON.stringify(all)); setProfiles(all);
    await open(next);
  };
  const selectProfile = (id: string | null) => {
    const next = profiles.find((p) => p.id === id) ?? null;
    profileRef.current = next; setProfile(next); lock(); forget();
  };
  const unlock = async (pin: string) => {
    const active = profileRef.current; if (!active) throw new Error('Choose a profile first.');
    const lockout = JSON.parse(await vault.get(lockoutKey(active.id)) ?? '{"failed":0,"until":0}') as Lockout;
    if (lockedOut(lockout, Date.now())) throw new Error('Too many PIN attempts. Try again in a few minutes.');
    const verifier = await vault.get(pinKey(active.id));
    if (!verifier || verifier !== await pinDigest(active.id, pin)) {
      await vault.set(lockoutKey(active.id), JSON.stringify(recordFailure(lockout, Date.now())));
      throw new Error('That PIN does not match this profile.');
    }
    await vault.remove(lockoutKey(active.id));
    await open(active);
  };
  const queue = async (exerciseId: string, selectedOption: number, pack: Pack) => {
    const active = profileRef.current;
    if (!active || lockedRef.current) throw new Error('Unlock your profile to save an answer.');
    const classroom = snapshotRef.current.classrooms.find((c) => c.grade === pack.grade);
    if (!classroom) throw new Error('No classroom is set up for this grade yet.');
    const exercise = snapshotRef.current.downloads.flatMap((d) => d.lessons).flatMap((l) => l.exercises).find((e) => e.id === exerciseId);
    if (!exercise || !Number.isInteger(selectedOption) || selectedOption < 0 || selectedOption >= exercise.options.length) throw new Error('Choose an answer from a lesson on this device.');
    await (await getRepository()).queue(active.id, { clientAttemptId: randomUUID(), classroomId: classroom.id, exerciseId, selectedOption, occurredAt: new Date().toISOString() });
    await loadLocal(active.id); toast('Answer saved on this device.', 'success');
  };
  const updatePreferences = async (change: Partial<Preferences>) => { const next = { ...preferences, ...change }; await vault.set('kgo-preferences', JSON.stringify(next)); setPreferences(next); };
  return <AppContext.Provider value={{ ready, profiles, profile, locked, snapshot, queued, outcomes, notice, preferences, toast, dismiss: () => setNotice(null), createProfile, selectProfile, lock, unlock, queue, updatePreferences }}>
    <InteractionBoundary onTouch={() => { lastInteraction.current = Date.now(); }}>{children}</InteractionBoundary>
  </AppContext.Provider>;
}
// Touches update inactivity without recording what a learner tapped or typed.
function InteractionBoundary({ onTouch, children }: { onTouch: () => void; children: React.ReactNode }) {
  return <View style={{ flex: 1 }} onTouchStart={onTouch}>{children}</View>;
}
export function useApp() { const value = useContext(AppContext); if (!value) throw new Error('AppProvider is required'); return value; }
