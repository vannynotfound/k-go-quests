import type { Pack, SkillParameters } from './types';

/** The learning engine: pure, no React or Expo. Mastery and Coins are replayed from the Attempt log, never stored. */
export const COINS_PER_CORRECT = 5;
export const MASTERED_AT = 0.95;

/** What is stored for one answer. Everything else is derived. */
export interface Attempt { id: string; exerciseId: string; selectedOption: number; at: string; }
export interface SkillMastery { skillId: string; mastery: number; mastered: boolean; }
export interface LearningState { skills: SkillMastery[]; coins: number; }
export interface Grade { correct: boolean; counted: boolean; coins: number; correctOption: number; attempt: Attempt; }

/** Copied from the backend's BKT function at tag v0-fullstack. */
export function updateMastery(prior: number, correct: boolean, { guess, slip, learn }: SkillParameters): number {
  const known = prior * (correct ? 1 - slip : slip);
  const unknown = (1 - prior) * (correct ? guess : 1 - guess);
  const total = known + unknown;
  const posterior = total > 0 ? known / total : prior;
  return Math.min(0.999, Math.max(0.001, posterior + (1 - posterior) * learn));
}

const exerciseIndex = (packs: Pack[]) => {
  const byId = new Map<string, { skillId: string; correctOption: number; options: number }>();
  for (const p of packs) for (const l of p.lessons) for (const e of l.exercises) byId.set(e.id, { skillId: l.skillCode, correctOption: e.correctOption, options: e.options.length });
  return byId;
};

/** Time order; ties keep log order (Array.sort is stable). */
const inTimeOrder = (log: Attempt[]) => [...log].sort((a, b) => Date.parse(a.at) - Date.parse(b.at));

export function learningState(packs: Pack[], log: Attempt[]): LearningState {
  const exercises = exerciseIndex(packs);
  const params = new Map(packs.flatMap((p) => p.skills.map((s) => [s.id, s.parameters] as const)));
  const mastery = new Map([...params].map(([id, p]) => [id, p.prior]));
  const seen = new Set<string>();
  let coins = 0;
  for (const a of inTimeOrder(log)) {
    const ex = exercises.get(a.exerciseId);
    if (!ex || seen.has(a.exerciseId)) continue;
    seen.add(a.exerciseId);
    const correct = a.selectedOption === ex.correctOption;
    if (correct) coins += COINS_PER_CORRECT;
    mastery.set(ex.skillId, updateMastery(mastery.get(ex.skillId)!, correct, params.get(ex.skillId)!));
  }
  return { skills: [...mastery].map(([skillId, m]) => ({ skillId, mastery: m, mastered: m >= MASTERED_AT })), coins };
}

export function grade(packs: Pack[], log: Attempt[], answer: Omit<Attempt, 'at'>, now: string): Grade {
  const ex = exerciseIndex(packs).get(answer.exerciseId);
  if (!ex) throw new Error('That Exercise is not on this tablet.');
  if (!Number.isInteger(answer.selectedOption) || answer.selectedOption < 0 || answer.selectedOption >= ex.options) throw new Error('Choose one of the options.');
  const correct = answer.selectedOption === ex.correctOption;
  const counted = !log.some((a) => a.exerciseId === answer.exerciseId);
  return { correct, counted, coins: correct && counted ? COINS_PER_CORRECT : 0, correctOption: ex.correctOption, attempt: { ...answer, at: now } };
}
