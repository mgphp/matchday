import type { Match, MatchStatus } from '@/lib/types';

import { groupByStatus } from '../fixture-sections';

const rovers = { id: 'rovers', name: 'Northgate Rovers', shortName: 'NGR' };
const harbour = { id: 'harbour', name: 'Harbour City', shortName: 'HBC' };
const kings = { id: 'kings', name: 'Kings Athletic', shortName: 'KIN' };

function fixture(id: string, kickoff: string, status: MatchStatus, away = harbour): Match {
  return { id, competition: 'League', kickoff, venue: '', status, home: rovers, away };
}

const ids = (matches: Match[]) => matches.map((match) => match.id);

describe('groupByStatus', () => {
  it('lists Previous results most recent first', () => {
    const sections = groupByStatus(
      [
        fixture('sep', '2026-09-06T10:00:00Z', 'finished'),
        fixture('oct', '2026-10-04T10:00:00Z', 'finished'),
        fixture('aug', '2026-08-30T10:00:00Z', 'finished'),
      ],
      null,
    );

    expect(sections).toHaveLength(1);
    expect(sections[0].title).toBe('Previous');
    expect(ids(sections[0].data)).toEqual(['oct', 'sep', 'aug']);
  });

  it('lists Upcoming fixtures soonest first, whatever order they arrive in', () => {
    const [upcoming] = groupByStatus(
      [
        fixture('later', '2026-11-22T10:00:00Z', 'scheduled'),
        fixture('postponed', '2026-11-29T10:00:00Z', 'postponed'),
        fixture('next', '2026-11-15T10:00:00Z', 'scheduled'),
      ],
      null,
    );

    expect(upcoming.title).toBe('Upcoming');
    expect(ids(upcoming.data)).toEqual(['next', 'later', 'postponed']);
  });

  it('puts Upcoming before Previous and drops empty sections', () => {
    const sections = groupByStatus(
      [
        fixture('done', '2026-10-04T10:00:00Z', 'finished'),
        fixture('live', '2026-11-12T10:00:00Z', 'live'),
      ],
      null,
    );

    expect(sections.map((section) => section.title)).toEqual(['Upcoming', 'Previous']);
    expect(groupByStatus([], null)).toEqual([]);
  });

  it('still pins the favourite team to the top, keeping date order within each group', () => {
    const [previous] = groupByStatus(
      [
        fixture('a', '2026-10-04T10:00:00Z', 'finished'),
        fixture('fav-old', '2026-09-06T10:00:00Z', 'finished', kings),
        fixture('fav-new', '2026-09-20T10:00:00Z', 'finished', kings),
      ],
      'kings',
    );

    expect(ids(previous.data)).toEqual(['fav-new', 'fav-old', 'a']);
  });

  it('does not mutate the input', () => {
    const input = [
      fixture('old', '2026-08-30T10:00:00Z', 'finished'),
      fixture('new', '2026-10-04T10:00:00Z', 'finished'),
    ];
    groupByStatus(input, null);
    expect(ids(input)).toEqual(['old', 'new']);
  });
});
