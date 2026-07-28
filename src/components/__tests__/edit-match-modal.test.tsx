import { render, userEvent } from '@testing-library/react-native';

import type { Match } from '@/lib/types';

import { EditMatchModal } from '../edit-match-modal';

const scheduledMatch: Match = {
  id: 'm2',
  competition: 'Premier League',
  kickoff: '2026-09-05T10:00:00Z',
  venue: 'Bear Pit',
  status: 'scheduled',
  home: { id: 'team-1', name: 'Under 10 Bears', shortName: 'U10' },
  away: { id: 'opp-1', name: 'Rivals FC', shortName: 'RIV' },
};

describe('EditMatchModal', () => {
  it('has no score/minute fields and submits for a scheduled match', async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    const { queryByLabelText, getByText } = await render(
      <EditMatchModal visible onClose={jest.fn()} match={scheduledMatch} onSubmit={onSubmit} />,
    );

    expect(queryByLabelText('U10')).toBeNull();
    expect(queryByLabelText('Minute')).toBeNull();

    await userEvent.press(getByText('Save'));
    expect(onSubmit).toHaveBeenCalledWith({
      status: 'scheduled',
      homeScore: undefined,
      awayScore: undefined,
      minute: undefined,
    });
  });

  it('requires scores and a minute once Live is selected', async () => {
    const { getByLabelText, getByText } = await render(
      <EditMatchModal visible onClose={jest.fn()} match={scheduledMatch} onSubmit={jest.fn()} />,
    );

    await userEvent.press(getByLabelText('Live'));
    expect(getByText('Save')).toBeDisabled();

    await userEvent.type(getByLabelText('U10'), '1');
    await userEvent.type(getByLabelText('RIV'), '0');
    expect(getByText('Save')).toBeDisabled();

    await userEvent.type(getByLabelText('Minute'), '12');
    expect(getByText('Save')).not.toBeDisabled();
  });

  it('submits status, scores and minute for a live match', async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    const onClose = jest.fn();
    const { getByLabelText, getByText } = await render(
      <EditMatchModal visible onClose={onClose} match={scheduledMatch} onSubmit={onSubmit} />,
    );

    await userEvent.press(getByLabelText('Live'));
    await userEvent.type(getByLabelText('U10'), '1');
    await userEvent.type(getByLabelText('RIV'), '0');
    await userEvent.type(getByLabelText('Minute'), '12');
    await userEvent.press(getByText('Save'));

    expect(onSubmit).toHaveBeenCalledWith({
      status: 'live',
      homeScore: 1,
      awayScore: 0,
      minute: 12,
    });
    expect(onClose).toHaveBeenCalled();
  });

  it('pre-fills score and minute from an already-live match', async () => {
    const liveMatch: Match = {
      ...scheduledMatch,
      status: 'live',
      homeScore: 2,
      awayScore: 1,
      minute: 40,
    };
    const { getByLabelText } = await render(
      <EditMatchModal visible onClose={jest.fn()} match={liveMatch} onSubmit={jest.fn()} />,
    );

    expect(getByLabelText('U10').props.value).toBe('2');
    expect(getByLabelText('RIV').props.value).toBe('1');
    expect(getByLabelText('Minute').props.value).toBe('40');
  });

  it('shows an error and stays open when submitting fails', async () => {
    const onSubmit = jest.fn().mockRejectedValue(new Error('nope'));
    const onClose = jest.fn();
    const { getByText, findByText } = await render(
      <EditMatchModal visible onClose={onClose} match={scheduledMatch} onSubmit={onSubmit} />,
    );

    await userEvent.press(getByText('Save'));

    expect(await findByText(/Could not update the match/)).toBeTruthy();
    expect(onClose).not.toHaveBeenCalled();
  });
});
