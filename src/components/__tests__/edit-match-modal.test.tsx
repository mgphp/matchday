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
  it('has no score fields and submits for a scheduled match', async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    const { queryByLabelText, getByText } = await render(
      <EditMatchModal visible onClose={jest.fn()} match={scheduledMatch} onSubmit={onSubmit} />,
    );

    expect(queryByLabelText('U10')).toBeNull();

    await userEvent.press(getByText('Save'));
    expect(onSubmit).toHaveBeenCalledWith({
      status: 'scheduled',
      homeScore: undefined,
      awayScore: undefined,
      durationMinutes: 90,
    });
  });

  it('requires both scores once Live is selected', async () => {
    const { getByLabelText, getByText } = await render(
      <EditMatchModal visible onClose={jest.fn()} match={scheduledMatch} onSubmit={jest.fn()} />,
    );

    await userEvent.press(getByLabelText('Live'));
    expect(getByText('Save')).toBeDisabled();

    await userEvent.type(getByLabelText('U10'), '1');
    expect(getByText('Save')).toBeDisabled();

    await userEvent.type(getByLabelText('RIV'), '0');
    expect(getByText('Save')).not.toBeDisabled();
  });

  it('points at the match clock instead of a minute field when Live is selected', async () => {
    const { getByLabelText, findByText, queryByLabelText } = await render(
      <EditMatchModal visible onClose={jest.fn()} match={scheduledMatch} onSubmit={jest.fn()} />,
    );

    await userEvent.press(getByLabelText('Live'));

    expect(queryByLabelText('Minute')).toBeNull();
    expect(await findByText(/The match minute comes from the clock/)).toBeTruthy();
  });

  it('submits status and scores for a live match', async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    const onClose = jest.fn();
    const { getByLabelText, getByText } = await render(
      <EditMatchModal visible onClose={onClose} match={scheduledMatch} onSubmit={onSubmit} />,
    );

    await userEvent.press(getByLabelText('Live'));
    await userEvent.type(getByLabelText('U10'), '1');
    await userEvent.type(getByLabelText('RIV'), '0');
    await userEvent.press(getByText('Save'));

    expect(onSubmit).toHaveBeenCalledWith({
      status: 'live',
      homeScore: 1,
      awayScore: 0,
      durationMinutes: 90,
    });
    expect(onClose).toHaveBeenCalled();
  });

  it('defaults full-time minutes to 90 and submits an edited value', async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    const { getByLabelText, getByText } = await render(
      <EditMatchModal visible onClose={jest.fn()} match={scheduledMatch} onSubmit={onSubmit} />,
    );

    const field = getByLabelText('Full-time minutes');
    expect(field.props.value).toBe('90');

    await userEvent.clear(field);
    await userEvent.type(field, '50');
    await userEvent.press(getByText('Save'));

    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ durationMinutes: 50 }));
  });

  it('pre-fills full-time minutes from the match and rejects a zero', async () => {
    const { getByLabelText, getByText } = await render(
      <EditMatchModal
        visible
        onClose={jest.fn()}
        match={{ ...scheduledMatch, durationMinutes: 60 }}
        onSubmit={jest.fn()}
      />,
    );

    const field = getByLabelText('Full-time minutes');
    expect(field.props.value).toBe('60');

    await userEvent.clear(field);
    expect(getByText('Save')).toBeDisabled();

    await userEvent.type(field, '0');
    expect(getByText('Save')).toBeDisabled();
  });

  it('pre-fills the score from an already-live match', async () => {
    const liveMatch: Match = {
      ...scheduledMatch,
      status: 'live',
      homeScore: 2,
      awayScore: 1,
      periods: [{ period: 'first', startedAt: '2026-09-05T10:00:00Z' }],
    };
    const { getByLabelText } = await render(
      <EditMatchModal visible onClose={jest.fn()} match={liveMatch} onSubmit={jest.fn()} />,
    );

    expect(getByLabelText('U10').props.value).toBe('2');
    expect(getByLabelText('RIV').props.value).toBe('1');
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
