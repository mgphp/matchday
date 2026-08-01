import { render, userEvent } from '@testing-library/react-native';

import type { Match } from '@/lib/types';

import { AddFixtureModal } from '../add-fixture-modal';

const ownTeam = { id: 'team-1', name: 'Under 10 Bears', shortName: 'U10' };

const existingFixture: Match = {
  id: 'm1',
  competition: 'League',
  kickoff: '2026-09-05T10:00:00Z',
  venue: 'Bear Pit',
  status: 'scheduled',
  home: ownTeam,
  away: { id: 'opp-9', name: 'Harbour City', shortName: 'HBC' },
};

type Rendered = Awaited<ReturnType<typeof render>>;

/** Fills everything except the kickoff, which each clash test sets itself. */
async function fillFixture({ getByLabelText }: Rendered) {
  await userEvent.press(getByLabelText('Home'));
  await userEvent.type(getByLabelText('Opponent'), 'Rivals FC');
  await userEvent.type(getByLabelText('Opponent short name (e.g. HBC)'), 'riv');
  await userEvent.type(getByLabelText('Competition'), 'League Cup');
}

describe('AddFixtureModal', () => {
  it('disables submit until every field is set', async () => {
    const { getByLabelText, getByText } = await render(
      <AddFixtureModal visible onClose={jest.fn()} ownTeam={ownTeam} onSubmit={jest.fn()} />,
    );

    expect(getByText('Add')).toBeDisabled();

    await userEvent.press(getByLabelText('Home'));
    expect(getByText('Add')).toBeDisabled();

    await userEvent.type(getByLabelText('Opponent'), 'Rivals FC');
    await userEvent.type(getByLabelText('Opponent short name (e.g. HBC)'), 'riv');
    await userEvent.type(getByLabelText('Competition'), 'League Cup');
    expect(getByText('Add')).toBeDisabled();

    await userEvent.type(getByLabelText('Date (YYYY-MM-DD)'), '2026-09-05');
    expect(getByText('Add')).toBeDisabled();

    await userEvent.type(getByLabelText('Kick-off time (HH:MM)'), '10:00');
    expect(getByText('Add')).not.toBeDisabled();
  });

  it('submits a home fixture with the coach on the home side', async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    const onClose = jest.fn();
    const { getByLabelText, getByText } = await render(
      <AddFixtureModal visible onClose={onClose} ownTeam={ownTeam} onSubmit={onSubmit} />,
    );

    await userEvent.press(getByLabelText('Home'));
    await userEvent.type(getByLabelText('Opponent'), 'Rivals FC');
    await userEvent.type(getByLabelText('Opponent short name (e.g. HBC)'), 'riv');
    await userEvent.type(getByLabelText('Competition'), 'League Cup');
    await userEvent.type(getByLabelText('Date (YYYY-MM-DD)'), '2026-09-05');
    await userEvent.type(getByLabelText('Kick-off time (HH:MM)'), '10:00');
    await userEvent.press(getByText('Add'));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    const input = onSubmit.mock.calls[0][0];
    expect(input.competition).toBe('League Cup');
    expect(input.kickoff).toBe('2026-09-05T10:00:00Z');
    expect(input.home).toEqual(ownTeam);
    expect(input.away).toMatchObject({ name: 'Rivals FC', shortName: 'RIV' });
    expect(onClose).toHaveBeenCalled();
  });

  it('puts the coach on the away side when Away is selected', async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    const { getByLabelText, getByText } = await render(
      <AddFixtureModal visible onClose={jest.fn()} ownTeam={ownTeam} onSubmit={onSubmit} />,
    );

    await userEvent.press(getByLabelText('Away'));
    await userEvent.type(getByLabelText('Opponent'), 'Rivals FC');
    await userEvent.type(getByLabelText('Opponent short name (e.g. HBC)'), 'riv');
    await userEvent.type(getByLabelText('Competition'), 'League Cup');
    await userEvent.type(getByLabelText('Date (YYYY-MM-DD)'), '2026-09-05');
    await userEvent.type(getByLabelText('Kick-off time (HH:MM)'), '10:00');
    await userEvent.press(getByText('Add'));

    const input = onSubmit.mock.calls[0][0];
    expect(input.away).toEqual(ownTeam);
    expect(input.home).toMatchObject({ name: 'Rivals FC' });
  });

  it('shows an error and stays open when submitting fails', async () => {
    const onSubmit = jest.fn().mockRejectedValue(new Error('nope'));
    const onClose = jest.fn();
    const { getByLabelText, getByText, findByText } = await render(
      <AddFixtureModal visible onClose={onClose} ownTeam={ownTeam} onSubmit={onSubmit} />,
    );

    await userEvent.press(getByLabelText('Home'));
    await userEvent.type(getByLabelText('Opponent'), 'Rivals FC');
    await userEvent.type(getByLabelText('Opponent short name (e.g. HBC)'), 'riv');
    await userEvent.type(getByLabelText('Competition'), 'League Cup');
    await userEvent.type(getByLabelText('Date (YYYY-MM-DD)'), '2026-09-05');
    await userEvent.type(getByLabelText('Kick-off time (HH:MM)'), '10:00');
    await userEvent.press(getByText('Add'));

    expect(await findByText(/Could not add the fixture/)).toBeTruthy();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('closes via the Close button', async () => {
    const onClose = jest.fn();
    const { getByLabelText } = await render(
      <AddFixtureModal visible onClose={onClose} ownTeam={ownTeam} onSubmit={jest.fn()} />,
    );

    await userEvent.press(getByLabelText('Close'));

    expect(onClose).toHaveBeenCalled();
  });

  it('warns about a clashing kickoff without blocking the save', async () => {
    const screen = await render(
      <AddFixtureModal
        visible
        onClose={jest.fn()}
        ownTeam={ownTeam}
        existingFixtures={[existingFixture]}
        onSubmit={jest.fn()}
      />,
    );

    await fillFixture(screen);
    await userEvent.type(screen.getByLabelText('Date (YYYY-MM-DD)'), '2026-09-05');
    await userEvent.type(screen.getByLabelText('Kick-off time (HH:MM)'), '10:30');

    expect(await screen.findByText(/You already have a fixture around then/)).toBeTruthy();
    expect(screen.getByText(/Harbour City at 10:00/)).toBeTruthy();
    // Advisory only.
    expect(screen.getByText('Add')).not.toBeDisabled();
  });

  it('says nothing when the slot is free', async () => {
    const screen = await render(
      <AddFixtureModal
        visible
        onClose={jest.fn()}
        ownTeam={ownTeam}
        existingFixtures={[existingFixture]}
        onSubmit={jest.fn()}
      />,
    );

    await fillFixture(screen);
    await userEvent.type(screen.getByLabelText('Date (YYYY-MM-DD)'), '2026-09-05');
    await userEvent.type(screen.getByLabelText('Kick-off time (HH:MM)'), '14:00');

    expect(screen.queryByText(/You already have a fixture around then/)).toBeNull();
  });

  it('says nothing while the kickoff is still half-typed', async () => {
    const screen = await render(
      <AddFixtureModal
        visible
        onClose={jest.fn()}
        ownTeam={ownTeam}
        existingFixtures={[existingFixture]}
        onSubmit={jest.fn()}
      />,
    );

    await fillFixture(screen);
    await userEvent.type(screen.getByLabelText('Date (YYYY-MM-DD)'), '2026-09-05');
    await userEvent.type(screen.getByLabelText('Kick-off time (HH:MM)'), '10');

    expect(screen.queryByText(/You already have a fixture around then/)).toBeNull();
  });
});
