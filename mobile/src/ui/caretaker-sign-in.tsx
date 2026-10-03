import { useState } from 'react';
import { ClerkProvider, useClerk, useSignIn } from '@clerk/expo';

import { keepCaretaker } from '../domain/setup';
import { useApp } from '@/state/app-context';
import { Action, Field, T } from '@/ui/primitives';

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;

/**
 * Email-code sign-in for the Caretaker Account. Loaded only by the Setup screen,
 * so Clerk is never imported or mounted at app start.
 */
export default function CaretakerSignIn() {
  if (!publishableKey) return <T size={12}>Setup needs EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY. See mobile/.env.example.</T>;
  // No token cache: the session is never persisted, and we sign out right away.
  return <ClerkProvider publishableKey={publishableKey}><EmailCode /></ClerkProvider>;
}

const check = ({ error }: { error: { message: string } | null }) => { if (error) throw new Error(error.message); };

function EmailCode() {
  const { signIn } = useSignIn();
  const clerk = useClerk();
  const { saveCaretakerId } = useApp();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [sent, setSent] = useState(false);

  const send = async () => {
    check(await signIn.create({ identifier: email.trim() }));
    check(await signIn.emailCode.sendCode());
    setSent(true);
  };
  const verify = async () => {
    check(await signIn.emailCode.verifyCode({ code: code.trim() }));
    check(await signIn.finalize());
    const id = clerk.user?.id;
    if (!id) { await clerk.signOut(); throw new Error('Sign-in did not finish. Try again.'); }
    await keepCaretaker(id, saveCaretakerId, () => clerk.signOut());
  };

  return sent ? (
    <>
      <Field label="Code from your email" value={code} onChangeText={(v) => setCode(v.replace(/\D/g, ''))} keyboardType="number-pad" maxLength={8} />
      <Action title="Verify code" disabled={code.length < 6} task={verify} />
    </>
  ) : (
    <>
      <Field label="Caretaker email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} />
      <Action title="Email me a code" disabled={!email.includes('@')} task={send} />
    </>
  );
}
