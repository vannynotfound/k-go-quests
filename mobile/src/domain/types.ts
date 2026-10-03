export type Subject = 'MATH' | 'ENGLISH' | 'FILIPINO' | 'SCIENCE';
export interface Profile { id: string; alias: string; }
export interface School { id: string; name: string; jurisdictionId: string; }
export interface Classroom { id: string; name: string; grade: number; teacherId: string; schoolId: string; }
export interface SkillParameters { prior: number; learn: number; guess: number; slip: number; }
export interface SkillSpec { id: string; parameters: SkillParameters; }
export interface Pack { id: string; title: string; subject: Subject; grade: number; version: string; skills: SkillSpec[]; lessons: Lesson[]; }
export interface Exercise { id: string; lessonId: string; prompt: string; options: string[]; correctOption: number; }
export interface Lesson { id: string; packId: string; title: string; skillCode: string; body: string; hints: Record<string, string>; exercises: Exercise[]; }
export interface Skill { id?: string; skillCode: string; subject: Subject; mastery: number; attempts: number; correctAttempts: number; updatedAt?: string; }
export interface Progress { studentId: string; coinBalance: number; skills: Skill[]; lastSyncAt: string | null; learningStatus: string; model: { version: string; status: string }; }
export interface Quest { exerciseId: string; classroomId: string; skillCode: string; subject: Subject; prompt: string; options: string[]; estimatedMastery: number; grade: number; }
export interface AttemptInput { clientAttemptId: string; classroomId: string; exerciseId: string; selectedOption: number; occurredAt: string; }
export interface AttemptResult { clientAttemptId: string; correct: boolean; awardedCoins: number; duplicate: boolean; }
export interface QueuedAttempt { input: AttemptInput; state: 'PENDING' | 'REVIEW'; error?: string; }
export interface Reward { id: string; title: string; cost: number; stock: number; active: boolean; jurisdictionId: string; }
export interface Redemption { id: string; studentId: string; rewardId: string; requestId: string; cost: number; status: 'ISSUED' | 'CLAIMED'; createdAt: string; claimedAt: string | null; }
export interface Voucher { redemption: Redemption; qrToken: string; claimMode: string; }
export interface LeagueRow { rank: number; classroomId: string; name: string; grade: number; enrolledLearners: number; participatingLearners: number; growthPercentagePoints: number; }
export interface League { month: string; timezone: string; metric: string; policy: string; items: LeagueRow[]; }
export interface LearnerReport { id: string; alias: string; skills: Skill[]; lastSyncAt: string | null; connectivityStatus: string; learningStatus: string; reason: string | null; }
export interface ClassReport { classroomId: string; learners: LearnerReport[]; decisionPolicy: string; }
export interface Impact { jurisdictionId: string; generatedAt: string; schools: number; activeStudents: number; studentsWithPractice: number; meanEstimatedMastery: number | null; attempts: number; disclaimer: string; }
export interface AuditEvent { id: string; action: string; targetId: string | null; actorId: string | null; createdAt: string; metadata: Record<string, unknown>; }
export interface Quiz { quizId: string; classroomId: string; requestedItems: number; actualItems: number; questions: (Exercise & { skillCode: string })[]; answerKey: { exerciseId: string; correctOption: number }[]; mode: string; note: string; }
export interface Snapshot {
  classrooms: Classroom[]; schools: School[];   progress: Progress | null; quests: Quest[]; league: League | null;
  rewards: Reward[]; vouchers: Voucher[]; reports: ClassReport[];
  impact: Impact | null; audit: AuditEvent[];
  history: { at: string; mastery: number }[]; refreshedAt: string | null;
}
export const emptySnapshot = (): Snapshot => ({ classrooms: [], schools: [], progress: null, quests: [], league: null, rewards: [], vouchers: [], reports: [], impact: null, audit: [], history: [], refreshedAt: null });
