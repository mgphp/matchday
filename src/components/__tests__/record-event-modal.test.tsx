import { render, userEvent } from '@testing-library/react-native';

import { RecordEventModal } from '@/components/record-event-modal';
import { repository } from '@/lib/data';
import type { MatchDetail, Player } from '@/lib/types';

jest.mock('@/lib/data', () => ({
  repository: {
    getSquad: jest.fn(),
  },
}));

const getSquad = jest.mocked(repository.getSquad);

const squad: Player[] = [
  { id: 'p1', name: 'Sam Okafor', position: 'GK', squadNumber: 1 },
  { id: 'p2', name: 'Danny Whitmore', position: 'DF', squadNumber: 2 },
  { id: 'p4', name: 'Theo Banks', position: 'MF', squadNumber: 8 },
  { id: 'p6', name: 'Jamie Cole', position: 'FW', squadNumber: 9 },
];

const liveMatch: MatchDetail = {
  id: 'm1',
  competition: 'Premier League',
  kickoff: '2026-07-20T16:30:00Z',
  venue: 'Northgate Park',
  status: 'live',
  home: { id: 'rovers', name: 'Northgate Rovers', shortName: 'NGR' },
  away: { id: 'harbour', name: 'Harbour City', shortName: 'HBC' },
  homeScore: 0,
  awayScore: 0,
  periods: [{ period: 'first', startedAt: '2026-07-20T16:30:00Z' }],
  events: [],
  lineups: { home: squad.slice(0, 3), away: [] },
};

function renderModal(props: Partial<React.ComponentProps<typeof RecordEventModal>> = {}) {
  return render(
    <RecordEventModal
      visible
      onClose={jest.fn()}
      match={liveMatch}
      side="home"
      minute={23}
      onSubmit={jest.fn().mockResolvedValue(undefined)}
      {...props}
    />,
  );
}

describe('RecordEventModal', () => {
  beforeEach(() => {
    getSquad.mockResolvedValue(squad);
  });

  it('lists our players on the pitch first, then the bench', async () => {
    const { findByText, getByText } = await renderModal();

    await findByText('On the pitch');
    expect(getByText('Theo Banks')).toBeTruthy();
    expect(getByText('Bench')).toBeTruthy();
    expect(getByText('Jamie Cole')).toBeTruthy();
  });

  it('offers the whole squad when no lineup is set', async () => {
    const { findByText, queryByText } = await renderModal({
      match: { ...liveMatch, lineups: undefined },
    });

    await findByText('Squad');
    expect(queryByText('On the pitch')).toBeNull();
  });

  it('needs one of our players picked before a goal for us can be saved', async () => {
    const { findByText, getByText, getByLabelText } = await renderModal();
    await findByText('On the pitch');

    expect(getByText('Record goal')).toBeDisabled();
    await userEvent.press(getByLabelText('9 Jamie Cole'));
    expect(getByText('Record goal')).not.toBeDisabled();
  });

  it('submits our goal with the player and the clock minute', async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    const onClose = jest.fn();
    const { findByText, getByText, getByLabelText } = await renderModal({ onSubmit, onClose });
    await findByText('On the pitch');

    await userEvent.press(getByLabelText('8 Theo Banks'));
    await userEvent.press(getByText('Record goal'));

    expect(onSubmit).toHaveBeenCalledWith({
      minute: 23,
      type: 'goal',
      side: 'home',
      player: 'Theo Banks',
      playerId: 'p4',
    });
    expect(onClose).toHaveBeenCalled();
  });

  it('records a card for us with the label to match', async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    const { findByText, getByText, getByLabelText } = await renderModal({ onSubmit });
    await findByText('On the pitch');

    await userEvent.press(getByLabelText('Yellow card'));
    await userEvent.press(getByLabelText('2 Danny Whitmore'));
    await userEvent.press(getByText('Record yellow card'));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'yellow-card', player: 'Danny Whitmore', playerId: 'p2' }),
    );
  });

  it("records an opponent's goal with no player, naming their team", async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    const { findByText, getByText, getByLabelText, queryByText } = await renderModal({
      onSubmit,
    });
    await findByText('On the pitch');

    await userEvent.press(getByLabelText('HBC'));
    // No squad list for them — just an optional name.
    expect(queryByText('On the pitch')).toBeNull();
    expect(getByText('Record goal')).not.toBeDisabled();
    await userEvent.press(getByText('Record goal'));

    expect(onSubmit).toHaveBeenCalledWith({
      minute: 23,
      type: 'goal',
      side: 'away',
      player: 'Harbour City',
    });
  });

  it("uses the typed opponent player's name when given", async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    const { findByText, getByText, getByLabelText } = await renderModal({ onSubmit });
    await findByText('On the pitch');

    await userEvent.press(getByLabelText('HBC'));
    await userEvent.type(getByLabelText('Player (optional)'), 'No. 7');
    await userEvent.press(getByText('Record goal'));

    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ player: 'No. 7' }));
  });

  it('shows an error and stays open when saving fails', async () => {
    const onSubmit = jest.fn().mockRejectedValue(new Error('boom'));
    const onClose = jest.fn();
    const { findByText, getByText, getByLabelText } = await renderModal({ onSubmit, onClose });
    await findByText('On the pitch');

    await userEvent.press(getByLabelText('8 Theo Banks'));
    await userEvent.press(getByText('Record goal'));

    expect(await findByText('Could not record the goal. Try again.')).toBeTruthy();
    expect(onClose).not.toHaveBeenCalled();
  });
});
