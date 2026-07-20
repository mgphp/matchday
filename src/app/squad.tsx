import { StyleSheet, Text } from 'react-native';

import { Card } from '@/components/card';
import { Screen } from '@/components/screen';
import { colors, typography } from '@/theme/theme';

export default function SquadScreen() {
  return (
    <Screen>
      <Card>
        <Text style={styles.title}>Squad</Text>
        <Text style={styles.placeholder}>Player list arrives with the data layer (M2).</Text>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    ...typography.heading,
    color: colors.text,
  },
  placeholder: {
    ...typography.body,
    color: colors.textSecondary,
  },
});
