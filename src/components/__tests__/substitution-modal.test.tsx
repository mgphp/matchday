import { render, userEvent } from '@testing-library/react-native';

import { SubstitutionModal } from '@/components/substitution-modal';
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
  { id: 'p7', name: 'Andrés Vidal', position: 'FW', squadNumber: 11 },
];

const liveMatch: MatchDetail = {
  id: 'm1',
  competition: 'Premier League',
  kickoff: '2026-07-20T16:30:00Z',
  venue: 'Northgate Park',
  status: 'live',
  home: { id: 'rovers', name: 'Northgate Rovers', shortName: 'NGR' },
  away: { id: 'harbour', name: 'Harbour City', shortName: 'HBC' },
  homeScore: 1,
  awayScore: 0,
  periods: [{ period: 'first', startedAt: '2026-07-20T16:30:00Z' }],
  events: [],
  lineups: { home: squad.slice(0, 3), away: [] },
};

function renderModal(props: Partial<React.ComponentProps<typeof SubstitutionModal>> = {}) {
  return render(
    <SubstitutionModal
      visible
      onClose={jest.fn()}
      match={liveMatch}
      side="home"
      minute={58}
      onSubmit={jest.fn().mockResolvedValue(undefined)}
      {...props}
    />,
  );
}

describe('SubstitutionModal', () => {
  beforeEach(() => {
    getSquad.mockResolvedValue(squad);
  });

  it('lists players on the pitch to come off and the bench to come on', async () => {
    const { findByText, getByText } = await renderModal();

    await findByText('Coming off');
    // Starting three are on the pitch.
    expect(getByText('Sam Okafor')).toBeTruthy();
    expect(getByText('Theo Banks')).toBeTruthy();
    // The other two are on the bench.
    expect(getByText('Coming on')).toBeTruthy();
    expect(getByText('Jamie Cole')).toBeTruthy();
    expect(getByText('Andrés Vidal')).toBeTruthy();
  });

  it('pre-fills the minute from the clock but leaves it editable', async () => {
    const { findByLabelText } = await renderModal();

    const field = await findByLabelText('Minute');
    expect(field.props.value).toBe('58');

    await userEvent.clear(field);
    await userEvent.type(field, '61');
    expect(field.props.value).toBe('61');
  });

  it('needs both players picked before it can be saved', async () => {
    const { findByText, getByText, getByLabelText } = await renderModal();
    await findByText('Coming off');

    expect(getByText('Record substitution')).toBeDisabled();

    await userEvent.press(getByLabelText('Take off 8 Theo Banks, MF'));
    expect(getByText('Record substitution')).toBeDisabled();

    await userEvent.press(getByLabelText('Bring on 11 Andrés Vidal, FW'));
    expect(getByText('Record substitution')).not.toBeDisabled();
  });

  it('submits a substitution event naming both players', async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    const onClose = jest.fn();
    const { findByText, getByText, getByLabelText } = await renderModal({ onSubmit, onClose });
    await findByText('Coming off');

    await userEvent.press(getByLabelText('Take off 8 Theo Banks, MF'));
    await userEvent.press(getByLabelText('Bring on 11 Andrés Vidal, FW'));
    await userEvent.press(getByText('Record substitution'));

    expect(onSubmit).toHaveBeenCalledWith({
      minute: 58,
      type: 'substitution',
      side: 'home',
      player: 'Andrés Vidal',
      detail: 'for Theo Banks',
      playerId: 'p7',
      relatedPlayerId: 'p4',
    });
    expect(onClose).toHaveBeenCalled();
  });

  it('excludes an already-substituted player from the pitch list', async () => {
    const match: MatchDetail = {
      ...liveMatch,
      events: [
        {
          id: 'e1',
          minute: 30,
          type: 'substitution',
          side: 'home',
          player: 'Jamie Cole',
          detail: 'for Theo Banks',
          playerId: 'p6',
          relatedPlayerId: 'p4',
        },
      ],
    };
    const { findByText, queryByLabelText } = await renderModal({ match });
    await findByText('Coming off');

    // Theo Banks came off, so he is no longer an option to come off...
    expect(queryByLabelText('Take off 8 Theo Banks, MF')).toBeNull();
    // ...and Jamie Cole is on the pitch rather than on the bench.
    expect(queryByLabelText('Take off 9 Jamie Cole, FW')).toBeTruthy();
  });

  it('explains itself when no lineup has been picked', async () => {
    const { findByText } = await renderModal({ match: { ...liveMatch, lineups: undefined } });

    expect(await findByText(/Pick a starting lineup first/)).toBeTruthy();
  });

  it('shows an error and stays open when saving fails', async () => {
    const onSubmit = jest.fn().mockRejectedValue(new Error('nope'));
    const onClose = jest.fn();
    const { findByText, getByText, getByLabelText } = await renderModal({ onSubmit, onClose });
    await findByText('Coming off');

    await userEvent.press(getByLabelText('Take off 8 Theo Banks, MF'));
    await userEvent.press(getByLabelText('Bring on 11 Andrés Vidal, FW'));
    await userEvent.press(getByText('Record substitution'));

    expect(await findByText(/Could not record the substitution/)).toBeTruthy();
    expect(onClose).not.toHaveBeenCalled();
  });
});
