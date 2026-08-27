import { render, userEvent } from '@testing-library/react-native';

import { repository } from '@/lib/data';
import type { MatchDetail } from '@/lib/types';

import { EditLineupModal } from '../edit-lineup-modal';

jest.mock('@/lib/data', () => ({
  repository: {
    getSquad: jest.fn(),
  },
}));

const mockGetSquad = jest.mocked(repository.getSquad);

const squad = [
  { id: 'p1', name: 'Sam Okafor', position: 'GK' as const, squadNumber: 1 },
  { id: 'p2', name: 'Danny Whitmore', position: 'DF' as const, squadNumber: 2 },
  { id: 'p3', name: 'Luca Marchetti', position: 'DF' as const, squadNumber: 5 },
  { id: 'p4', name: 'Theo Banks', position: 'MF' as const, squadNumber: 8 },
  { id: 'p5', name: 'Jamie Cole', position: 'FW' as const, squadNumber: 9 },
];

const match: MatchDetail = {
  id: 'm1',
  competition: 'Premier League',
  kickoff: '2026-09-05T10:00:00Z',
  venue: 'Bear Pit',
  status: 'scheduled',
  home: { id: 'team-1', name: 'Under 10 Bears', shortName: 'U10' },
  away: { id: 'opp-1', name: 'Rivals FC', shortName: 'RIV' },
  events: [],
};

type Rendered = Awaited<ReturnType<typeof render>>;

/** Save is disabled on an empty pitch, so put one player on it first. */
async function assignOnePlayer(screen: Rendered) {
  const [firstDfSlot] = await screen.findAllByLabelText('Add a DF to this position');
  await userEvent.press(firstDfSlot);
  await userEvent.press(screen.getByText('Danny Whitmore'));
}

describe('EditLineupModal', () => {
  beforeEach(() => {
    mockGetSquad.mockReset();
    mockGetSquad.mockResolvedValue(squad);
  });

  it('defaults to a 7-a-side, evenly-balanced formation with an empty pitch', async () => {
    const { findByText, findAllByLabelText, getByText } = await render(
      <EditLineupModal
        visible
        onClose={jest.fn()}
        match={match}
        side="home"
        onSubmit={jest.fn()}
      />,
    );

    expect(await findByText('7')).toBeTruthy();
    expect(getByText('2-2-2')).toBeTruthy();
    expect(await findAllByLabelText('Add a DF to this position')).toHaveLength(2);
    expect(getByText('Save lineup')).toBeDisabled();
  });

  it('draws the half-pitch markings behind the slots', async () => {
    const { findByTestId, getByTestId } = await render(
      <EditLineupModal
        visible
        onClose={jest.fn()}
        match={match}
        side="home"
        onSubmit={jest.fn()}
      />,
    );

    expect(await findByTestId('pitch-markings')).toBeTruthy();
    for (const id of [
      'pitch-stripes',
      'pitch-halfway-line',
      'pitch-centre-circle',
      'pitch-penalty-area',
      'pitch-goal-area',
      'pitch-penalty-arc',
      'pitch-goal-frame',
      'pitch-corner-arc-left',
      'pitch-corner-arc-right',
    ]) {
      expect(getByTestId(id)).toBeTruthy();
    }
  });

  it('restricts the position picker to players in that position', async () => {
    const { findAllByLabelText, getByText, queryByText } = await render(
      <EditLineupModal
        visible
        onClose={jest.fn()}
        match={match}
        side="home"
        onSubmit={jest.fn()}
      />,
    );

    const [firstDfSlot] = await findAllByLabelText('Add a DF to this position');
    await userEvent.press(firstDfSlot);

    expect(getByText('Danny Whitmore')).toBeTruthy();
    expect(getByText('Luca Marchetti')).toBeTruthy();
    expect(queryByText('Theo Banks')).toBeNull();
    expect(queryByText('Jamie Cole')).toBeNull();
  });

  it('assigns a player to a slot, removing them from the substitutes', async () => {
    const { findAllByLabelText, getByText, findByText, findByLabelText, queryByText } =
      await render(
        <EditLineupModal
          visible
          onClose={jest.fn()}
          match={match}
          side="home"
          onSubmit={jest.fn()}
        />,
      );

    expect(await findByText(/2 Danny Whitmore/)).toBeTruthy();

    const [firstDfSlot] = await findAllByLabelText('Add a DF to this position');
    await userEvent.press(firstDfSlot);
    await userEvent.press(getByText('Danny Whitmore'));

    expect(await findByLabelText("Change Danny Whitmore's position")).toBeTruthy();
    expect(queryByText(/2 Danny Whitmore/)).toBeNull();
    expect(getByText('Save lineup')).not.toBeDisabled();
  });

  it('clears an assigned slot back to a substitute', async () => {
    const { findAllByLabelText, getByText, findByText, findByLabelText, queryByLabelText } =
      await render(
        <EditLineupModal
          visible
          onClose={jest.fn()}
          match={match}
          side="home"
          onSubmit={jest.fn()}
        />,
      );

    const [firstDfSlot] = await findAllByLabelText('Add a DF to this position');
    await userEvent.press(firstDfSlot);
    await userEvent.press(getByText('Danny Whitmore'));

    await userEvent.press(await findByLabelText("Change Danny Whitmore's position"));
    await userEvent.press(getByText('Clear this position'));

    expect(await findByText(/2 Danny Whitmore/)).toBeTruthy();
    expect(queryByLabelText("Change Danny Whitmore's position")).toBeNull();
  });

  it('pre-fills assignments from the existing lineup, matched by position', async () => {
    const withLineup: MatchDetail = {
      ...match,
      formation: '2-2-2',
      lineups: { home: [squad[0], squad[1]], away: [] },
    };
    const { findByLabelText, queryByText } = await render(
      <EditLineupModal
        visible
        onClose={jest.fn()}
        match={withLineup}
        side="home"
        onSubmit={jest.fn()}
      />,
    );

    expect(await findByLabelText("Change Sam Okafor's position")).toBeTruthy();
    expect(await findByLabelText("Change Danny Whitmore's position")).toBeTruthy();
    expect(queryByText(/2 Danny Whitmore/)).toBeNull();
  });

  it('increasing team size regenerates the formation options', async () => {
    const { findByText, getByLabelText } = await render(
      <EditLineupModal
        visible
        onClose={jest.fn()}
        match={match}
        side="home"
        onSubmit={jest.fn()}
      />,
    );
    await findByText('7');

    await userEvent.press(getByLabelText('More players'));

    expect(await findByText('8')).toBeTruthy();
  });

  it('submits the assigned players and formation', async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    const onClose = jest.fn();
    const { findAllByLabelText, getByText } = await render(
      <EditLineupModal visible onClose={onClose} match={match} side="home" onSubmit={onSubmit} />,
    );

    const [firstDfSlot] = await findAllByLabelText('Add a DF to this position');
    await userEvent.press(firstDfSlot);
    await userEvent.press(getByText('Danny Whitmore'));
    await userEvent.press(getByText('Save lineup'));

    expect(onSubmit).toHaveBeenCalledWith({
      side: 'home',
      formation: '2-2-2',
      players: [squad[1]],
      slots: { 'DF-0': 'p2' },
    });
    expect(onClose).toHaveBeenCalled();
  });

  it('restores slot assignments exactly, even when the saved order does not match slot order', async () => {
    // Object.values(assignments) follows tap order, not slot order, so a
    // lineup assigned out of order saves with Luca (DF-1) ahead of Danny
    // (DF-0). Without homeSlots, placeByPosition would put Luca back in
    // DF-0 — the bug this guards against.
    const withLineup: MatchDetail = {
      ...match,
      formation: '2-2-2',
      lineups: {
        home: [squad[2], squad[1]],
        away: [],
        homeSlots: { 'DF-0': 'p2', 'DF-1': 'p3' },
      },
    };
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    const { findByLabelText, getByText } = await render(
      <EditLineupModal
        visible
        onClose={jest.fn()}
        match={withLineup}
        side="home"
        onSubmit={onSubmit}
      />,
    );

    await findByLabelText("Change Danny Whitmore's position");
    await userEvent.press(getByText('Save lineup'));

    expect(onSubmit.mock.calls[0][0].slots).toEqual({ 'DF-0': 'p2', 'DF-1': 'p3' });
  });

  it('re-places by position when changing team size, discarding stale slot ids', async () => {
    const withLineup: MatchDetail = {
      ...match,
      formation: '2-2-2',
      lineups: {
        home: [squad[1], squad[2]],
        away: [],
        homeSlots: { 'DF-0': 'p2', 'DF-1': 'p3' },
      },
    };
    const { findByText, getByLabelText, findByLabelText } = await render(
      <EditLineupModal
        visible
        onClose={jest.fn()}
        match={withLineup}
        side="home"
        onSubmit={jest.fn()}
      />,
    );
    await findByText('2-2-2');

    await userEvent.press(getByLabelText('More players'));
    await findByText('8');

    // Both players are still on the pitch after the reflow, not bumped to
    // the substitutes bench.
    expect(await findByLabelText("Change Danny Whitmore's position")).toBeTruthy();
    expect(getByLabelText("Change Luca Marchetti's position")).toBeTruthy();
  });

  it('shows an error and stays open when saving fails', async () => {
    const onSubmit = jest.fn().mockRejectedValue(new Error('nope'));
    const onClose = jest.fn();
    const { findAllByLabelText, getByText, findByText } = await render(
      <EditLineupModal visible onClose={onClose} match={match} side="home" onSubmit={onSubmit} />,
    );

    const [firstDfSlot] = await findAllByLabelText('Add a DF to this position');
    await userEvent.press(firstDfSlot);
    await userEvent.press(getByText('Danny Whitmore'));
    await userEvent.press(getByText('Save lineup'));

    expect(await findByText(/Could not save the lineup/)).toBeTruthy();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('closes via the Close button', async () => {
    const onClose = jest.fn();
    const { getByLabelText } = await render(
      <EditLineupModal visible onClose={onClose} match={match} side="home" onSubmit={jest.fn()} />,
    );

    await userEvent.press(getByLabelText('Close'));

    expect(onClose).toHaveBeenCalled();
  });

  it('marks a substitute as not available and stores the rest as available', async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    const screen = await render(
      <EditLineupModal visible onClose={jest.fn()} match={match} side="home" onSubmit={onSubmit} />,
    );
    await assignOnePlayer(screen);
    const { getByText, getByLabelText } = screen;

    await userEvent.press(getByLabelText('9 Jamie Cole, FW, available'));
    expect(getByLabelText('9 Jamie Cole, FW, not available')).toBeTruthy();

    await userEvent.press(getByText('Save lineup'));

    const update = onSubmit.mock.calls[0][0];
    expect(update.availablePlayerIds).toBeDefined();
    expect(update.availablePlayerIds).not.toContain('p5');
    expect(update.availablePlayerIds).toContain('p1');
  });

  it('sends no availability at all when everyone is there', async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    const screen = await render(
      <EditLineupModal visible onClose={jest.fn()} match={match} side="home" onSubmit={onSubmit} />,
    );
    await assignOnePlayer(screen);

    await userEvent.press(screen.getByText('Save lineup'));

    // Absent rather than a list naming the whole squad.
    expect(onSubmit.mock.calls[0][0].availablePlayerIds).toBeUndefined();
  });

  it('unticking the last missing player drops availability back to everyone', async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    const screen = await render(
      <EditLineupModal visible onClose={jest.fn()} match={match} side="home" onSubmit={onSubmit} />,
    );
    await assignOnePlayer(screen);
    const { getByText, getByLabelText } = screen;

    await userEvent.press(getByLabelText('9 Jamie Cole, FW, available'));
    await userEvent.press(getByLabelText('9 Jamie Cole, FW, not available'));
    await userEvent.press(getByText('Save lineup'));

    expect(onSubmit.mock.calls[0][0].availablePlayerIds).toBeUndefined();
  });

  it('pre-fills availability from the match', async () => {
    const { findByText, getByLabelText } = await render(
      <EditLineupModal
        visible
        onClose={jest.fn()}
        match={{ ...match, availablePlayerIds: ['p1', 'p2', 'p3', 'p4'] }}
        side="home"
        onSubmit={jest.fn()}
      />,
    );
    await findByText('Substitutes');

    expect(getByLabelText('9 Jamie Cole, FW, not available')).toBeTruthy();
  });
});
