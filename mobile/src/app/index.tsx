import { View } from 'react-native';
import { Redirect, useRouter } from 'expo-router';
import { Plus } from 'lucide-react-native';

import { useApp } from '@/state/app-context';
import { initials } from '@/domain/format';
import { Button, Card, Eyebrow, Row, T } from '@/ui/primitives';
import { Screen } from '@/ui/screen';
import { useTheme } from '@/ui/theme';

/** Profile picker. "Add Profile" is temporary: the Caretaker screen replaces it. */
export default function Picker() {
  const { profiles, selectProfile } = useApp();
  const theme = useTheme();
  const router = useRouter();
  if (!profiles.length) return <Redirect href="/add-profile" />;
  return (
    <Screen title="Who is learning?" caption="Pick your name, then enter your PIN">
      <Eyebrow>Profiles on this tablet</Eyebrow>
      {profiles.map((p) => (
        <Card key={p.id} onPress={() => selectProfile(p.id)}>
          <Row style={{ gap: 12 }}>
            <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: theme.soft, alignItems: 'center', justifyContent: 'center' }}>
              <T size={13} bold>{initials(p.alias)}</T>
            </View>
            <T variant="titleS">{p.alias}</T>
          </Row>
        </Card>
      ))}
      <Button title="Add Profile" icon={Plus} variant="soft" onPress={() => router.push('/add-profile')} />
    </Screen>
  );
}
