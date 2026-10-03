import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, View } from 'react-native';
import { randomUUID } from 'expo-crypto';
import type { Profile } from '../domain/types';
import { starterPacks } from '../content/starter-pack';
import { grade, learningState, type Attempt, type Grade, type LearningState } from '../domain/engine';
import { isIdle, isValidPin, lockedOut, recordFailure, type Lockout } from '../domain/pin-lock';
import { getRepository } from '../data/storage';
import { pinDigest } from '../data/crypto';
import { vault } from '../data/vault';

export type Appearance = 'light' | 'dark' | 'system';
interface Preferences { appearance: Appearance; language: string; }
interface Notice { message: string; kind: 'success' | 'error' | 'info'; }
interface AppContextValue {
  ready: boolean; profiles: Profile[]; profile: Profile | null; locked: boolean;
  attempts: Attempt[]; learning: LearningState;
  notice: Notice | null; preferences: Preferences;
  toast(message: string, kind?: Notice['kind']): void; dismiss(): void;
  createProfile(alias: string, pin: string): Promise<void>;
  selectProfile(id: string | null): void; lock(): void; unlock(pin: string): Promise<void>;
  answer(exerciseId: string, selectedOption: number): Promise<Grade>;
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
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const learning = useMemo(() => learningState(starterPacks, attempts), [attempts]);
  const [preferences, setPreferences] = useState<Preferences>(defaults);
  const [notice, setNotice] = useState<Notice | null>(null);
  const profileRef = useRef(profile); const attemptsRef = useRef(attempts);
  const lockedRef = useRef(locked); const lastInteraction = useRef(0);

  const toast = useCallback((message: string, kind: Notice['kind'] = 'info') => setNotice({ message, kind }), []);
  // Refs mirror committed state so async handlers read fresh values; set after every commit, never during render.
  useEffect(() => { profileRef.current = profile; attemptsRef.current = attempts; lockedRef.current = locked; });

  const forget = () => { attemptsRef.current = []; setAttempts([]); };
  const lock = useCallback(() => { lockedRef.current = true; setLocked(true); }, []);
  const loadLocal = useCallback(async (owner: string) => {
    const repo = await getRepository();
    const log = await repo.attempts(owner);
    if (profileRef.current?.id === owner && !lockedRef.current) { attemptsRef.current = log; setAttempts(log); }
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
  const answer = async (exerciseId: string, selectedOption: number) => {
    const active = profileRef.current;
    if (!active || lockedRef.current) throw new Error('Unlock your profile to save an answer.');
    const result = grade(starterPacks, attemptsRef.current, { id: randomUUID(), exerciseId, selectedOption }, new Date().toISOString());
    await (await getRepository()).record(active.id, result.attempt);
    const next = [...attemptsRef.current, result.attempt];
    attemptsRef.current = next; setAttempts(next);
    return result;
  };
  const updatePreferences = async (change: Partial<Preferences>) => { const next = { ...preferences, ...change }; await vault.set('kgo-preferences', JSON.stringify(next)); setPreferences(next); };
  return <AppContext.Provider value={{ ready, profiles, profile, locked, attempts, learning, notice, preferences, toast, dismiss: () => setNotice(null), createProfile, selectProfile, lock, unlock, answer, updatePreferences }}>
    <InteractionBoundary onTouch={() => { lastInteraction.current = Date.now(); }}>{children}</InteractionBoundary>
  </AppContext.Provider>;
}
// Touches update inactivity without recording what a learner tapped or typed.
function InteractionBoundary({ onTouch, children }: { onTouch: () => void; children: React.ReactNode }) {
  return <View style={{ flex: 1 }} onTouchStart={onTouch}>{children}</View>;
}
export function useApp() { const value = useContext(AppContext); if (!value) throw new Error('AppProvider is required'); return value; }
