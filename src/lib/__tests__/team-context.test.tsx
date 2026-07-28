import { render } from '@testing-library/react-native';
import { Text } from 'react-native';

import { TeamProvider, useTeam } from '../team-context';

const team = { id: 'team-1', name: 'Under 10 Bears', shortName: 'U10', clubId: 'club-1' };

function Consumer() {
  const current = useTeam();
  return <Text>{current.name}</Text>;
}

describe('team-context', () => {
  it('provides the active team to consumers', async () => {
    const { findByText } = await render(
      <TeamProvider team={team}>
        <Consumer />
      </TeamProvider>,
    );

    expect(await findByText('Under 10 Bears')).toBeTruthy();
  });

  it('throws when used outside a TeamProvider', async () => {
    // Swallow the expected React error-boundary console noise for this assertion.
    jest.spyOn(console, 'error').mockImplementation(() => {});
    await expect(render(<Consumer />)).rejects.toThrow(
      'useTeam must be used within a TeamProvider',
    );
    jest.restoreAllMocks();
  });
});
