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

describe('EditLineupModal', () => {
  beforeEach(() => {
    mockGetSquad.mockReset();
    mockGetSquad.mockResolvedValue(squad);
  });

  it('loads the squad and lets you toggle players into the lineup', async () => {
    const { findByLabelText, getByText } = await render(
      <EditLineupModal
        visible
        onClose={jest.fn()}
        match={match}
        side="home"
        onSubmit={jest.fn()}
      />,
    );

    expect(getByText('Save lineup')).toBeDisabled();

    await userEvent.press(await findByLabelText('Add Sam Okafor to the lineup'));
    expect(getByText('Save lineup')).not.toBeDisabled();
  });

  it('submits the selected players and formation for our side', async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    const onClose = jest.fn();
    const { findByLabelText, getByLabelText, getByText } = await render(
      <EditLineupModal visible onClose={onClose} match={match} side="home" onSubmit={onSubmit} />,
    );

    await userEvent.type(getByLabelText('Formation (e.g. 2-3-1)'), '2-3-1');
    await userEvent.press(await findByLabelText('Add Sam Okafor to the lineup'));
    await userEvent.press(getByText('Save lineup'));

    expect(onSubmit).toHaveBeenCalledWith({
      side: 'home',
      formation: '2-3-1',
      players: [squad[0]],
    });
    expect(onClose).toHaveBeenCalled();
  });

  it('pre-selects players already in our side of the lineup', async () => {
    const withLineup: MatchDetail = { ...match, lineups: { home: [squad[1]], away: [] } };
    const { findByLabelText } = await render(
      <EditLineupModal
        visible
        onClose={jest.fn()}
        match={withLineup}
        side="home"
        onSubmit={jest.fn()}
      />,
    );

    expect(await findByLabelText('Remove Danny Whitmore from the lineup')).toBeTruthy();
  });

  it('shows an error and stays open when saving fails', async () => {
    const onSubmit = jest.fn().mockRejectedValue(new Error('nope'));
    const onClose = jest.fn();
    const { findByLabelText, getByText, findByText } = await render(
      <EditLineupModal visible onClose={onClose} match={match} side="home" onSubmit={onSubmit} />,
    );

    await userEvent.press(await findByLabelText('Add Sam Okafor to the lineup'));
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
});
