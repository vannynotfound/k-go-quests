export type SetupStep = 'sign-in' | 'caretaker-pin' | 'profiles' | 'done';

/** Which part of Setup is next, given what this tablet has already saved. */
export function setupStep(saved: { caretakerId: boolean; pinSet: boolean; done: boolean }): SetupStep {
  if (!saved.caretakerId) return 'sign-in';
  if (!saved.pinSet) return 'caretaker-pin';
  return saved.done ? 'done' : 'profiles';
}

/**
 * Keeps the Clerk user ID, then always ends the Clerk session so none remains.
 * A failed save is rethrown after sign-out, so Setup can show it and retry.
 */
export async function keepCaretaker(userId: string, save: (id: string) => Promise<void>, signOut: () => Promise<void>) {
  try {
    await save(userId);
  } finally {
    await signOut();
  }
}
