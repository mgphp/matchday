import { render } from '@testing-library/react-native';

import SquadScreen from '@/app/(tabs)/squad';

describe('SquadScreen', () => {
  it('groups players under position section headers', async () => {
    const { findByText } = await render(<SquadScreen />);

    expect(await findByText('Goalkeepers')).toBeTruthy();
    expect(await findByText('Defenders')).toBeTruthy();
    expect(await findByText('Midfielders')).toBeTruthy();
    expect(await findByText('Forwards')).toBeTruthy();
    expect(await findByText('Sam Okafor')).toBeTruthy();
  });
});
