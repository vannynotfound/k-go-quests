import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { BookOpen, ChartColumn, Leaf, Play, Sparkles } from 'lucide-react-native';

import { useApp } from '@/state/app-context';
import { pct } from '@/domain/format';
import type { Subject } from '@/domain/types';
import { subjectTitles } from '@/domain/subjects';
import { starterPacks } from '@/content/starter-pack';
import { Card, Eyebrow, IconTile, Pill, Row, Section, T } from '@/ui/primitives';
import { Screen } from '@/ui/screen';
import { subjectTheme, tokens, useTheme } from '@/ui/theme';

const subjectIcon: Record<Subject, typeof BookOpen> = {
  MATH: ChartColumn, ENGLISH: BookOpen, FILIPINO: Leaf, SCIENCE: Sparkles,
};

export default function Learn() {
  const { snapshot } = useApp();
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

      {snapshot.quests.length ? (
        <>
          <Section title="Today's quests" caption="Lowest estimated mastery first" />
          {snapshot.quests.map((quest, index) => {
            const tone = subjectTheme[quest.subject];
            return (
              <Card key={quest.exerciseId} index={index} onPress={() => router.push({ pathname: '/lesson', params: { exerciseId: quest.exerciseId } })}>
                <Row style={{ alignItems: 'flex-start', gap: 11 }}>
                  <IconTile icon={Play} color={tone.brand} tint={tone.tint} />
                  <View style={{ flex: 1, gap: 4 }}>
                    <Pill color={tone.brand} tint={tone.tint}>{subjectTitles[quest.subject]}</Pill>
                    <T variant="titleS" lines={2}>{quest.prompt}</T>
                    <T variant="dataS" color={theme.muted}>{`est. mastery ${pct(quest.estimatedMastery)}`}</T>
                  </View>
                </Row>
              </Card>
            );
          })}
        </>
      ) : null}

    </Screen>
  );
}
