import AsyncStorage from '@react-native-async-storage/async-storage';
import { render, userEvent, waitFor } from '@testing-library/react-native';

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

// The date picker opens on the current month — pin "today" to 1 Sep 2026.
beforeEach(async () => {
  await AsyncStorage.clear();
  jest.spyOn(Date, 'now').mockReturnValue(Date.UTC(2026, 8, 1, 12));
});

afterEach(() => {
  jest.restoreAllMocks();
});

type Rendered = Awaited<ReturnType<typeof render>>;

async function pickTime(getByLabelText: Rendered['getByLabelText'], time: string) {
  await userEvent.press(getByLabelText(/^Kick-off, /));
  await userEvent.press(getByLabelText(time));
}

/** Fills everything except the kickoff, which each clash test sets itself. */
async function fillFixture({ getByLabelText }: Rendered) {
  await userEvent.press(getByLabelText('Home'));
  await userEvent.type(getByLabelText('Opponent'), 'Rivals FC');
  await userEvent.type(getByLabelText('Competition (optional)'), 'League Cup');
}

describe('AddFixtureModal', () => {
  it('needs only venue, opponent, date and time', async () => {
    const { getByLabelText, getByText } = await render(
      <AddFixtureModal visible onClose={jest.fn()} ownTeam={ownTeam} onSubmit={jest.fn()} />,
    );

    expect(getByText('Add')).toBeDisabled();

    await userEvent.press(getByLabelText('Home'));
    expect(getByText('Add')).toBeDisabled();

    await userEvent.type(getByLabelText('Opponent'), 'Rivals FC');
    expect(getByText('Add')).toBeDisabled();

    await userEvent.press(getByLabelText('Date, Choose a date'));
    await userEvent.press(getByLabelText('5 September 2026'));
    expect(getByText('Add')).toBeDisabled();

    await pickTime(getByLabelText, '10:00');
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
    await userEvent.type(getByLabelText('Competition (optional)'), 'League Cup');
    await userEvent.press(getByLabelText('Date, Choose a date'));
    await userEvent.press(getByLabelText('5 September 2026'));
    await pickTime(getByLabelText, '10:00');
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
    await userEvent.type(getByLabelText('Competition (optional)'), 'League Cup');
    await userEvent.press(getByLabelText('Date, Choose a date'));
    await userEvent.press(getByLabelText('5 September 2026'));
    await pickTime(getByLabelText, '10:00');
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
    await userEvent.type(getByLabelText('Competition (optional)'), 'League Cup');
    await userEvent.press(getByLabelText('Date, Choose a date'));
    await userEvent.press(getByLabelText('5 September 2026'));
    await pickTime(getByLabelText, '10:00');
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
    await userEvent.press(screen.getByLabelText('Date, Choose a date'));
    await userEvent.press(screen.getByLabelText('5 September 2026'));
    await pickTime(screen.getByLabelText, '10:30');

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
    await userEvent.press(screen.getByLabelText('Date, Choose a date'));
    await userEvent.press(screen.getByLabelText('5 September 2026'));
    await pickTime(screen.getByLabelText, '14:00');

    expect(screen.queryByText(/You already have a fixture around then/)).toBeNull();
  });

  it('says nothing until a kick-off time is picked', async () => {
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
    await userEvent.press(screen.getByLabelText('Date, Choose a date'));
    await userEvent.press(screen.getByLabelText('5 September 2026'));

    expect(screen.queryByText(/You already have a fixture around then/)).toBeNull();
  });

  it('derives the short name and falls back to Friendly', async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    const { getByLabelText, getByText } = await render(
      <AddFixtureModal visible onClose={jest.fn()} ownTeam={ownTeam} onSubmit={onSubmit} />,
    );

    await userEvent.press(getByLabelText('Away'));
    await userEvent.type(getByLabelText('Opponent'), 'Harbour Bay City U10');
    await userEvent.press(getByLabelText('Date, Choose a date'));
    await userEvent.press(getByLabelText('5 September 2026'));
    await pickTime(getByLabelText, '09:30');
    await userEvent.press(getByText('Add'));

    const input = onSubmit.mock.calls[0][0];
    expect(input.home).toMatchObject({ name: 'Harbour Bay City U10', shortName: 'HBC' });
    expect(input.competition).toBe('Friendly');
    expect(input.kickoff).toBe('2026-09-05T09:30:00Z');
  });

  it('uses a typed short name over the derived one', async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    const { getByLabelText, getByText } = await render(
      <AddFixtureModal visible onClose={jest.fn()} ownTeam={ownTeam} onSubmit={onSubmit} />,
    );

    await userEvent.press(getByLabelText('Home'));
    await userEvent.type(getByLabelText('Opponent'), 'Rivals FC');
    await userEvent.type(getByLabelText('Short name (optional)'), 'rfc');
    await userEvent.press(getByLabelText('Date, Choose a date'));
    await userEvent.press(getByLabelText('5 September 2026'));
    await pickTime(getByLabelText, '10:00');
    await userEvent.press(getByText('Add'));

    expect(onSubmit.mock.calls[0][0].away).toMatchObject({ shortName: 'RFC' });
  });

  it('remembers the last competition for the next fixture', async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    const { getByLabelText, getByText } = await render(
      <AddFixtureModal visible onClose={jest.fn()} ownTeam={ownTeam} onSubmit={onSubmit} />,
    );

    await userEvent.press(getByLabelText('Home'));
    await userEvent.type(getByLabelText('Opponent'), 'Rivals FC');
    await userEvent.type(getByLabelText('Competition (optional)'), 'County Cup');
    await userEvent.press(getByLabelText('Date, Choose a date'));
    await userEvent.press(getByLabelText('5 September 2026'));
    await pickTime(getByLabelText, '10:00');
    await userEvent.press(getByText('Add'));

    expect(await AsyncStorage.getItem('matchday:lastCompetition:team-1')).toBe('County Cup');
    expect(getByLabelText('Competition (optional)').props.value).toBe('County Cup');
  });

  it('prefills the competition stored for this team', async () => {
    await AsyncStorage.setItem('matchday:lastCompetition:team-1', 'Sunday League');
    const { getByLabelText } = await render(
      <AddFixtureModal visible onClose={jest.fn()} ownTeam={ownTeam} onSubmit={jest.fn()} />,
    );

    await waitFor(() =>
      expect(getByLabelText('Competition (optional)').props.value).toBe('Sunday League'),
    );
  });

  it('offers later kick-offs under More times', async () => {
    const { getByLabelText, queryByLabelText } = await render(
      <AddFixtureModal visible onClose={jest.fn()} ownTeam={ownTeam} onSubmit={jest.fn()} />,
    );

    await userEvent.press(getByLabelText('Kick-off, Choose a time'));
    expect(queryByLabelText('18:30')).toBeNull();

    await userEvent.press(getByLabelText('More times'));
    await userEvent.press(getByLabelText('18:30'));

    expect(getByLabelText('Kick-off, 18:30')).toBeTruthy();
  });
});
