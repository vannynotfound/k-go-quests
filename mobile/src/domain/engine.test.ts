import { describe, expect, it } from 'vitest';
import { DEFAULT_SKILL_PARAMETERS, starterPacks } from '../content/starter-pack';
import { COINS_PER_CORRECT, MASTERED_AT, grade, learningState, quests, updateMastery, type Attempt } from './engine';

const NOW = '2026-01-01T00:00:00.000Z';
const P = DEFAULT_SKILL_PARAMETERS;
const skill = 'math5.fractions.equivalent';
const exs = starterPacks.flatMap((p) => p.lessons).filter((l) => l.skillCode === skill).flatMap((l) => l.exercises);
const at = (n: number) => new Date(Date.parse(NOW) + n * 1000).toISOString();
const answer = (i: number, right: boolean, t = i): Attempt => ({ id: `a${t}`, exerciseId: exs[i].id, selectedOption: right ? exs[i].correctOption : (exs[i].correctOption + 1) % exs[i].options.length, at: at(t) });
const mastery = (log: Attempt[], id = skill) => learningState(starterPacks, log).skills.find((s) => s.skillId === id)!.mastery;

describe('updateMastery (ported from backend mastery.spec.ts at v0-fullstack)', () => {
  it('raises estimates on correct answers and lowers them on errors', () => {
    expect(updateMastery(0.5, true, P)).toBeGreaterThan(0.5);
    expect(updateMastery(0.5, false, P)).toBeLessThan(0.5);
  });
  it('remains bounded across long response sequences', () => {
    let m = 0.2;
    for (let i = 0; i < 1000; i++) {
      m = updateMastery(m, i % 3 === 0, P);
      expect(m).toBeGreaterThan(0);
      expect(m).toBeLessThan(1);
    }
  });
  it('clamps to 0.001-0.999', () => {
    expect(updateMastery(0.999, true, { prior: 0, learn: 1, guess: 0, slip: 0 })).toBe(0.999);
    expect(updateMastery(0.001, false, { prior: 0, learn: 0, guess: 0, slip: 1 })).toBe(0.001);
  });
  it('keeps the prior when the evidence is impossible', () => {
    expect(updateMastery(0.4, true, { prior: 0, learn: 0, guess: 0, slip: 1 })).toBe(0.4);
  });
});

describe('Mastery', () => {
  it('starts at the prior', () => expect(mastery([])).toBe(P.prior));
  it('goes 0.567, 0.867, 0.970 over three correct Counted Attempts', () => {
    const r = [0, 1, 2].map((n) => mastery([0, 1, 2].slice(0, n + 1).map((i) => answer(i, true))));
    expect(r.map((x) => +x.toFixed(3))).toEqual([0.567, 0.867, 0.97]);
  });
  it('settles near 0.091 after five wrong Counted Attempts', () => {
    expect(mastery([0, 1, 2, 3, 4].map((i) => answer(i, false)))).toBeCloseTo(0.091, 3);
  });
  it('replays in time order, whatever the log order', () => {
    const log = [answer(0, false, 1), answer(1, true, 2), answer(2, true, 3)];
    expect(mastery([...log].reverse())).toBe(mastery(log));
  });
  it('counts only the first Attempt at an Exercise', () => {
    const log = [answer(0, false, 1), answer(0, true, 2), answer(0, true, 3)];
    expect(mastery(log)).toBe(mastery([log[0]]));
    expect(learningState(starterPacks, log).coins).toBe(0);
  });
  it('is Mastered from exactly 0.95', () => {
    expect(MASTERED_AT).toBe(0.95);
    const two = learningState(starterPacks, [0, 1].map((i) => answer(i, true))).skills.find((s) => s.skillId === skill)!;
    const three = learningState(starterPacks, [0, 1, 2].map((i) => answer(i, true))).skills.find((s) => s.skillId === skill)!;
    expect([two.mastered, three.mastered]).toEqual([false, true]);
    const exact = { prior: 0.95, learn: 0, guess: 0, slip: 0 };
    const pack = { ...starterPacks[0], skills: [{ id: skill, parameters: exact }] };
    expect(learningState([pack], []).skills[0].mastered).toBe(true);
  });
  it('ignores Attempts at Exercises it does not know', () => {
    expect(mastery([{ id: 'x', exerciseId: 'nope', selectedOption: 0, at: NOW }])).toBe(P.prior);
  });
});

describe('Coins and grading', () => {
  it('pays 5 per correct Counted Attempt', () => {
    expect(COINS_PER_CORRECT).toBe(5);
    expect(learningState(starterPacks, [answer(0, true), answer(1, false), answer(2, true)]).coins).toBe(10);
  });
  it('grades a first correct Attempt as counted and worth 5', () => {
    const r = grade(starterPacks, [], { id: 'n', exerciseId: exs[0].id, selectedOption: exs[0].correctOption }, NOW);
    expect(r).toMatchObject({ correct: true, counted: true, coins: 5, correctOption: exs[0].correctOption });
    expect(r.attempt).toEqual({ id: 'n', exerciseId: exs[0].id, selectedOption: exs[0].correctOption, at: NOW });
  });
  it('grades a wrong Attempt as worth 0 and reveals the correct option', () => {
    const r = grade(starterPacks, [], { id: 'n', exerciseId: exs[0].id, selectedOption: 3 }, NOW);
    expect(r).toMatchObject({ correct: false, counted: true, coins: 0, correctOption: exs[0].correctOption });
  });
  it('grades a retry as practice only', () => {
    const r = grade(starterPacks, [answer(0, false)], { id: 'n', exerciseId: exs[0].id, selectedOption: exs[0].correctOption }, NOW);
    expect(r).toMatchObject({ correct: true, counted: false, coins: 0 });
  });
  it('rejects unknown Exercises and out-of-range options', () => {
    expect(() => grade(starterPacks, [], { id: 'n', exerciseId: 'nope', selectedOption: 0 }, NOW)).toThrow();
    expect(() => grade(starterPacks, [], { id: 'n', exerciseId: exs[0].id, selectedOption: 99 }, NOW)).toThrow();
  });
});

describe('quests', () => {
  const exercisesOf = (id: string) => starterPacks.flatMap((p) => p.lessons).filter((l) => l.skillCode === id).flatMap((l) => l.exercises);
  const skillIds = starterPacks.flatMap((p) => p.skills.map((s) => s.id));
  const answerAll = (id: string, right: boolean): Attempt[] => exercisesOf(id).map((e, i) => ({ id: `${id}${i}`, exerciseId: e.id, selectedOption: right ? e.correctOption : (e.correctOption + 1) % e.options.length, at: at(i) }));
  const quest = (log: Attempt[], limit?: number) => quests(starterPacks, log, limit);

  it('gives a new Profile three Quests in pack order', () => {
    const q = quest([]);
    expect(q).toHaveLength(3);
    expect(q.map((x) => x.exerciseId)).toEqual(exercisesOf(skillIds[0]).slice(0, 3).map((e) => e.id));
    expect(q[0]).toMatchObject({ skillId: skillIds[0], lessonId: expect.any(String) });
  });
  it('puts the lowest Mastery first', () => {
    const ahead = quest(answerAll(skillIds[0], true).slice(0, 1), 100);
    expect(ahead[0].skillId).not.toBe(skillIds[0]);
    expect(ahead.at(-1)!.skillId).toBe(skillIds[0]);
    const behind = quest([answer(0, false)]);
    expect(behind[0].skillId).toBe(skill);
  });
  it('never offers an answered Exercise', () => {
    const log = [answer(0, true)];
    expect(quest(log, 100).map((x) => x.exerciseId)).not.toContain(exs[0].id);
  });
  it('skips Mastered Skills', () => {
    const log = [0, 1, 2].map((i) => answer(i, true));
    expect(learningState(starterPacks, log).skills.find((s) => s.skillId === skill)!.mastered).toBe(true);
    expect(quest(log, 100).some((x) => x.skillId === skill)).toBe(false);
  });
  it('skips Skills whose Exercises are all answered', () => {
    const log = answerAll(skill, false);
    expect(quest(log, 100).some((x) => x.skillId === skill)).toBe(false);
  });
  it('is empty when nothing is left', () => {
    const log = skillIds.flatMap((id) => answerAll(id, false));
    expect(quest(log)).toEqual([]);
  });
});
