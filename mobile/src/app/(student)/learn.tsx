import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { BookOpen, ChartColumn, Leaf, Sparkles } from 'lucide-react-native';

import type { Subject } from '@/domain/types';
import { subjectTitles } from '@/domain/subjects';
import { starterPacks } from '@/content/starter-pack';
import { Card, Eyebrow, IconTile, Pill, Row, T } from '@/ui/primitives';
import { Screen } from '@/ui/screen';
import { subjectTheme, tokens, useTheme } from '@/ui/theme';

const subjectIcon: Record<Subject, typeof BookOpen> = {
  MATH: ChartColumn, ENGLISH: BookOpen, FILIPINO: Leaf, SCIENCE: Sparkles,
};

export default function Learn() {
  const theme = useTheme();
  const router = useRouter();

  const lessonCount = starterPacks.reduce((total, pack) => total + pack.lessons.length, 0);

  return (
    <Screen chrome title="Subjects" caption={`${lessonCount} lesson${lessonCount === 1 ? '' : 's'} on this tablet`}>
      <Eyebrow>Your subjects · MATATAG Grade 5</Eyebrow>

      {starterPacks.map((pack, index) => {
        const tone = subjectTheme[pack.subject];
        return (
          <Card key={pack.id} index={index} onPress={() => router.push({ pathname: '/subject', params: { packId: pack.id } })}>
            <Row style={{ gap: 11 }}>
              <IconTile icon={subjectIcon[pack.subject]} color={tone.brand} tint={tone.tint} />
              <View style={{ flex: 1, gap: 2 }}>
                <T variant="titleM" lines={1}>{`${subjectTitles[pack.subject]} ${pack.grade}`}</T>
                <T variant="bodyS" color={theme.muted} lines={1}>{pack.title}</T>
              </View>
              <Pill color={tokens.state.success} tint={tokens.tint.success}>On device</Pill>
            </Row>
            <T variant="bodyS" color={theme.secondary}>{`${pack.lessons.length} lesson${pack.lessons.length === 1 ? '' : 's'} · works offline`}</T>
          </Card>
        );
      })}
    </Screen>
  );
}
