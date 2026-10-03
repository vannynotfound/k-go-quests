import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { BookOpen, ChartColumn, Download, Leaf, Play, Sparkles } from 'lucide-react-native';

import { useApp } from '@/state/app-context';
import { pct } from '@/domain/format';
import type { PackDownload, Subject } from '@/domain/types';
import { subjectTitles } from '@/domain/subjects';
import { Bar, Card, Empty, Eyebrow, IconTile, Pill, Row, Section, T } from '@/ui/primitives';
import { Screen } from '@/ui/screen';
import { subjectTheme, tokens, useTheme } from '@/ui/theme';

const subjectIcon: Record<Subject, typeof BookOpen> = {
  MATH: ChartColumn, ENGLISH: BookOpen, FILIPINO: Leaf, SCIENCE: Sparkles,
};

/** Rough on-device footprint, so the card can state what a download costs. */
const sizeOf = (download?: PackDownload) => (download ? Math.max(1, Math.round(JSON.stringify(download).length / 1024)) : 0);

export default function Learn() {
  const { snapshot } = useApp();
  const theme = useTheme();
  const router = useRouter();

  const downloads = new Map(snapshot.downloads.map((entry) => [entry.pack.id, entry]));
  const cachedModules = snapshot.downloads.reduce((total, entry) => total + entry.lessons.length, 0);

  return (
    <Screen chrome title="Offline Library" caption={`${cachedModules.toLocaleString()} module${cachedModules === 1 ? '' : 's'} cached offline`}>
      <Eyebrow>Your subjects · MATATAG Grade 5</Eyebrow>

      {snapshot.packs.map((pack, index) => {
        const saved = downloads.get(pack.id);
        const tone = subjectTheme[pack.subject];
        const total = saved?.lessons.length ?? 0;
        return (
          <Card key={pack.id} index={index} onPress={saved ? () => router.push({ pathname: '/subject', params: { packId: pack.id } }) : undefined}>
            <Row style={{ gap: 11 }}>
              <IconTile icon={subjectIcon[pack.subject]} color={tone.brand} tint={tone.tint} />
              <View style={{ flex: 1, gap: 2 }}>
                <T variant="titleM" lines={1}>{`${subjectTitles[pack.subject]} ${pack.grade}`}</T>
                <T variant="bodyS" color={theme.muted} lines={1}>{pack.title}</T>
              </View>
              {saved ? (
                <Pill color={tokens.state.success} tint={tokens.tint.success}>Cached</Pill>
              ) : (
                <Pill color={tokens.brand.sky} tint={tokens.tint.sky}>Queued</Pill>
              )}
            </Row>
            <Row style={{ gap: 8 }}>
              <Bar value={saved ? 1 : 0} color={tone.brand} />
              <T variant="dataS" color={theme.muted}>{saved ? `${total}/${total}` : `0/${total || '—'}`}</T>
            </Row>
            <Row>
              <T variant="bodyS" color={theme.secondary} style={{ flex: 1 }}>
                {saved ? `${sizeOf(saved)} KB on device · ready offline` : 'Not on this device yet'}
              </T>
            </Row>
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
      ) : !snapshot.packs.length ? (
        <Empty icon={Download} title="Nothing cached yet" text="Lesson packs will appear here once your Caretaker adds them to this tablet." />
      ) : null}

    </Screen>
  );
}
