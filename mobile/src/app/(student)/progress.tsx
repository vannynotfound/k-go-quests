import { View } from 'react-native';

import { useApp } from '@/state/app-context';
import { pct } from '@/domain/format';
import { MASTERED_AT } from '@/domain/engine';
import { starterPacks } from '@/content/starter-pack';
import { subjectTitles } from '@/domain/subjects';
import { Bar, Card, Eyebrow, Pill, Row, T } from '@/ui/primitives';
import { Screen } from '@/ui/screen';
import { subjectTheme, tokens, useTheme } from '@/ui/theme';

export default function Progress() {
  const { learning, balance } = useApp();
  const theme = useTheme();

  return (
    <Screen chrome title="My Progress" caption="Estimates from your answers">
      <Card style={{ backgroundColor: tokens.tint.sun, borderColor: `${tokens.brand.sun}80`, gap: 6 }}>
        <Eyebrow>Coins</Eyebrow>
        <T variant="displayL" style={{ fontSize: 34, lineHeight: 38 }}>{balance}</T>
      </Card>

      {starterPacks.map((pack) => {
        const tone = subjectTheme[pack.subject];
        return (
          <View key={pack.id} style={{ gap: 8 }}>
            <Eyebrow>{`${subjectTitles[pack.subject]} ${pack.grade}`}</Eyebrow>
            <Card style={{ gap: 14 }}>
              {pack.skills.map((spec) => {
                const skill = learning.skills.find((s) => s.skillId === spec.id);
                const name = pack.lessons.find((l) => l.skillCode === spec.id)?.title ?? spec.id;
                if (!skill) return null;
                return (
                  <View key={spec.id} style={{ gap: 7 }}>
                    <Row style={{ gap: 11 }}>
                      <View style={{ flex: 1, gap: 1 }}>
                        <T variant="titleS">{name}</T>
                        <T variant="bodyS" color={theme.muted}>{`Mastery estimate: ${pct(skill.mastery)}`}</T>
                      </View>
                      {skill.mastered ? <Pill color={tokens.state.success} tint={tokens.tint.lime}>Mastered</Pill> : null}
                    </Row>
                    <Bar value={skill.mastery} color={tone.brand} />
                  </View>
                );
              })}
            </Card>
          </View>
        );
      })}

      <T variant="bodyS" color={theme.muted}>
        {`Mastery is an estimate from your first answer to each question. A skill is Mastered at ${pct(MASTERED_AT)}.`}
      </T>
    </Screen>
  );
}
