import { useState } from 'react';
import { useRouter } from 'expo-router';

import { useApp } from '@/state/app-context';
import { isValidPin } from '@/domain/pin-lock';
import { Action, BackLink, Field } from '@/ui/primitives';
import { Screen } from '@/ui/screen';

/** Temporary: Setup and the Caretaker screen replace this form later. */
export default function AddProfile() {
  const { profiles, createProfile } = useApp();
  const router = useRouter();
  const [alias, setAlias] = useState('');
  const [pin, setPin] = useState('');
  return (
    <Screen title="Add a profile" caption="Each profile has its own name and 6-digit PIN">
      {profiles.length ? <BackLink label="Back" onPress={() => router.back()} /> : null}
      <Field label="Name" value={alias} onChangeText={setAlias} placeholder="Juan" autoCapitalize="words" maxLength={30} />
      <Field label="6-digit PIN" value={pin} onChangeText={(v) => setPin(v.replace(/\D/g, ''))} placeholder="••••••" keyboardType="number-pad" secureTextEntry maxLength={6} />
      <Action title="Create profile" disabled={!alias.trim() || !isValidPin(pin)} task={() => createProfile(alias, pin)} />
    </Screen>
  );
}
