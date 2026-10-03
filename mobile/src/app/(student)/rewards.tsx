import { View } from 'react-native';
import { Gift } from 'lucide-react-native';

import { useApp } from '@/state/app-context';
import { Card, Empty, Eyebrow, T } from '@/ui/primitives';
import { Screen } from '@/ui/screen';
import { tokens } from '@/ui/theme';

export default function Rewards() {
  const { session, snapshot } = useApp();
  const coins = snapshot.progress?.coinBalance ?? session?.user.coins ?? 0;

  return (
    <Screen chrome title="My Coins" caption="Earned from correct answers">
      <Card style={{ backgroundColor: tokens.tint.sun, borderColor: `${tokens.brand.sun}80`, gap: 6 }}>
        <View style={{ gap: 6 }}>
          <Eyebrow>Coins</Eyebrow>
          <T variant="displayL" style={{ fontSize: 34, lineHeight: 38 }}>{coins}</T>
        </View>
      </Card>
      <Empty icon={Gift} title="Rewards are coming" text="Keep answering questions. Your Coins keep adding up in the meantime." />
    </Screen>
  );
}
