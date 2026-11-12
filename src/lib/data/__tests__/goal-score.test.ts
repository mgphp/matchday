import { scoreAfterGoal } from '../goal-score';

describe('scoreAfterGoal', () => {
  it('adds a goal to the scoring side only', () => {
    expect(
      scoreAfterGoal({ homeScore: 1, awayScore: 2 }, { type: 'goal', side: 'home' }, 1),
    ).toEqual({ homeScore: 2, awayScore: 2 });
    expect(
      scoreAfterGoal({ homeScore: 1, awayScore: 2 }, { type: 'goal', side: 'away' }, 1),
    ).toEqual({ homeScore: 1, awayScore: 3 });
  });

  it('treats a missing score as 0', () => {
    expect(scoreAfterGoal({}, { type: 'goal', side: 'away' }, 1)).toEqual({
      homeScore: 0,
      awayScore: 1,
    });
  });

  it('takes a deleted goal off the score but never below 0', () => {
    expect(
      scoreAfterGoal({ homeScore: 2, awayScore: 0 }, { type: 'goal', side: 'home' }, -1),
    ).toEqual({ homeScore: 1, awayScore: 0 });
    expect(
      scoreAfterGoal({ homeScore: 2, awayScore: 0 }, { type: 'goal', side: 'away' }, -1),
    ).toEqual({ homeScore: 2, awayScore: 0 });
  });

  it('leaves the score alone for cards and substitutions', () => {
    for (const type of ['yellow-card', 'red-card', 'substitution'] as const) {
      expect(scoreAfterGoal({ homeScore: 1, awayScore: 1 }, { type, side: 'home' }, 1)).toBe(
        undefined,
      );
    }
  });
});
