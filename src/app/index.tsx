import { StyleSheet, Text, View } from 'react-native';

import { Badge } from '@/components/badge';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Screen } from '@/components/screen';
import { colors, typography } from '@/theme/theme';

export default function MatchesScreen() {
  return (
    <Screen>
      <Card>
        <View style={styles.row}>
          <Badge label="LIVE 62'" variant="live" />
          <Text style={styles.competition}>Premier League</Text>
        </View>
        <Text style={styles.fixture}>Home FC 1 – 0 Away United</Text>
        <Button label="Match centre" />
      </Card>
      <Card>
        <View style={styles.row}>
          <Badge label="Today 17:30" />
          <Text style={styles.competition}>Premier League</Text>
        </View>
        <Text style={styles.fixture}>Rovers v City</Text>
        <Button label="Preview" variant="secondary" />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  competition: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  fixture: {
    ...typography.heading,
    color: colors.text,
  },
});
