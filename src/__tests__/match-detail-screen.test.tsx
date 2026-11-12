import { useLocalSearchParams } from 'expo-router';
import { render, userEvent, waitFor } from '@testing-library/react-native';

import MatchDetailScreen from '@/app/match/[id]';
import { mockRepository } from '@/lib/data/mock-repository';
import { TeamProvider } from '@/lib/team-context';

const mockBack = jest.fn();
const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  useLocalSearchParams: jest.fn(),
  useRouter: () => ({ back: mockBack, replace: mockReplace, canGoBack: () => true }),
}));

const ownTeam = { id: 'rovers', name: 'Northgate Rovers', shortName: 'NGR', clubId: 'club-1' };

function renderScreen() {
  return render(
    <TeamProvider team={ownTeam}>
      <MatchDetailScreen />
    </TeamProvider>,
  );
}

describe('MatchDetailScreen', () => {
  beforeEach(() => {
    jest.mocked(useLocalSearchParams).mockReturnValue({ id: 'm1' });
    mockBack.mockClear();
    mockReplace.mockClear();
  });

  it('renders score, events and lineups for a live match', async () => {
    const { findByText, getByText, getAllByText } = await renderScreen();
    expect(await findByText('Northgate Rovers 1 – 0 Harbour City')).toBeTruthy();
    expect(getByText("LIVE 62'")).toBeTruthy();
    expect(getByText('Northgate Park')).toBeTruthy();
    // Once in the events timeline, once in the minutes-played list.
    expect(getAllByText('Jamie Cole').length).toBeGreaterThan(0);
    expect(getByText('assist Ryo Tanaka')).toBeTruthy();
    expect(getByText('13 Felix Ndiaye')).toBeTruthy();
  });

  it('summarises the single goal scorer under the scoreline', async () => {
    const { findByText } = await renderScreen();
    await findByText('Northgate Rovers 1 – 0 Harbour City');

    expect(await findByText('Jamie Cole 34′')).toBeTruthy();
  });

  it('summarises multiple scorers per side, grouping repeat scorers by minute', async () => {
    jest.mocked(useLocalSearchParams).mockReturnValue({ id: 'm4' });

    const { findByText } = await renderScreen();
    await findByText('Westfield Wanderers 2 – 2 Northgate Rovers');

    expect(await findByText('Callum Reed 12′, 79′')).toBeTruthy();
    expect(await findByText('Jamie Cole 27′\nRyo Tanaka 90′')).toBeTruthy();
  });

  it('omits the scorers summary when there are no goal events', async () => {
    jest.mocked(useLocalSearchParams).mockReturnValue({ id: 'm2' });

    const { findByText, queryByText } = await renderScreen();
    await findByText('Kings Athletic v Westfield Wanderers');

    expect(queryByText(/′/)).toBeNull();
  });

  it('derives the live minute from the clock once a match kicks off', async () => {
    // m3 is the seeded postponed fixture; reset it so it behaves as an
    // un-kicked-off match without disturbing the fixtures the other tests use.
    await mockRepository.updateMatchScore('m3', { status: 'scheduled' });
    jest.mocked(useLocalSearchParams).mockReturnValue({ id: 'm3' });

    const { findByText, getByText } = await renderScreen();
    await findByText('Milltown United v Redbrook County');
    expect(getByText('Kick-off upcoming')).toBeTruthy();

    await userEvent.press(getByText('Kick off'));

    // Derived from the period we just started, so the clock reads 0 minutes.
    expect(await findByText("LIVE 0'")).toBeTruthy();
    expect(getByText('Half time')).toBeTruthy();
  });

  it('shows a stopped clock and a Second half control at half time', async () => {
    await mockRepository.updateMatchClock('m3', {
      status: 'live',
      periods: [
        { period: 'first', startedAt: '2026-07-22T15:00:00Z', endedAt: '2026-07-22T15:25:00Z' },
      ],
    });
    jest.mocked(useLocalSearchParams).mockReturnValue({ id: 'm3' });

    const { findByText, getByText } = await renderScreen();

    expect(await findByText("Half time 25'")).toBeTruthy();
    expect(getByText('Second half')).toBeTruthy();
  });

  it('falls back to the stored minute for a match with no recorded periods', async () => {
    const { findByText } = await renderScreen();
    await findByText('Northgate Rovers 1 – 0 Harbour City');

    expect(await findByText("LIVE 62'")).toBeTruthy();
  });

  it('hides the Substitution control for a match that is not live', async () => {
    jest.mocked(useLocalSearchParams).mockReturnValue({ id: 'm2' });

    const { findByText, queryByText } = await renderScreen();
    await findByText('Kings Athletic v Westfield Wanderers');

    expect(queryByText('Substitution')).toBeNull();
  });

  it('records a substitution onto the timeline', async () => {
    const { findByText, getByText, getByLabelText } = await renderScreen();
    await findByText('Northgate Rovers 1 – 0 Harbour City');

    await userEvent.press(getByText('Substitution'));
    await findByText('Coming off');

    // p7 already came on for p4 in the seeded events, so the pitch holds
    // p1/p2/p3/p7/p5 and the bench holds p4 and p6.
    await userEvent.press(getByLabelText('Take off 10 Ryo Tanaka, MF'));
    await userEvent.press(getByLabelText('Bring on 9 Jamie Cole, FW'));
    await userEvent.press(getByText('Record substitution'));

    expect(await findByText('for Ryo Tanaka')).toBeTruthy();
  });

  it('shows minutes played, split between the pitch and the bench', async () => {
    const { findByText, getByLabelText, getByText } = await renderScreen();
    await findByText('Minutes played');

    // m1 has no periods, so the clock falls back to its stored 62nd minute.
    // p7 came on for p4 at 58, so p4 played 58 and p7 has played 4. The
    // target is a 5-player lineup's 90 minutes shared over a squad of 7.
    expect(
      getByLabelText('Theo Banks, 58 minutes played of 64 target, on the bench, due off'),
    ).toBeTruthy();
    expect(
      getByLabelText('Andrés Vidal, 4 minutes played of 64 target, on the pitch, due on'),
    ).toBeTruthy();
    // An ever-present starter has the full 62.
    expect(
      getByLabelText('Sam Okafor, 62 minutes played of 64 target, on the pitch, due off'),
    ).toBeTruthy();
    expect(getByText('On pitch')).toBeTruthy();
    expect(getByText('Bench')).toBeTruthy();
  });

  it('names who is due off next to the substitution control', async () => {
    const { findByText, getByText } = await renderScreen();
    await findByText('Minutes played');

    // Sam Okafor started and is still on, so he has the most game time of
    // anyone on the pitch and is furthest past an even share.
    expect(getByText(/Due off: Sam Okafor/)).toBeTruthy();
  });

  it('excludes unavailable players from the targets and lists them separately', async () => {
    // A 5-player lineup over a 7-player squad targets 64 minutes each; drop
    // two players out and the same game time is shared over 5, so 90 each.
    await mockRepository.updateLineup('m1', {
      side: 'home',
      players: (await mockRepository.getMatch('m1')).lineups?.home ?? [],
      availablePlayerIds: ['p1', 'p2', 'p3', 'p4', 'p5'],
    });

    const { findByText, getByLabelText, getByText } = await renderScreen();
    await findByText('Minutes played');

    expect(getByText('Not available')).toBeTruthy();
    expect(getByLabelText('Jamie Cole, not available for this match')).toBeTruthy();
    expect(
      getByLabelText('Sam Okafor, 62 minutes played of 90 target, on the pitch, on track'),
    ).toBeTruthy();
  });

  it('omits minutes played before a match kicks off', async () => {
    jest.mocked(useLocalSearchParams).mockReturnValue({ id: 'm2' });

    const { findByText, queryByText } = await renderScreen();
    await findByText('Kings Athletic v Westfield Wanderers');

    expect(queryByText('Minutes played')).toBeNull();
  });

  it('opens the lineup editor from the Edit lineup button', async () => {
    const { findByText, getByText } = await renderScreen();
    await findByText('Northgate Rovers 1 – 0 Harbour City');

    await userEvent.press(getByText('Edit lineup'));

    expect(await findByText('Save lineup')).toBeTruthy();
  });

  it('removes a fixture from Edit match and navigates back', async () => {
    const created = await mockRepository.createMatch({
      competition: 'Friendly',
      kickoff: '2026-10-01T10:00:00Z',
      venue: 'Somewhere',
      home: ownTeam,
      away: { id: 'x', name: 'Some Other Team', shortName: 'SOT' },
    });
    jest.mocked(useLocalSearchParams).mockReturnValue({ id: created.id });

    const { findByText, getByText } = await renderScreen();
    await findByText('Northgate Rovers v Some Other Team');

    await userEvent.press(getByText('Edit match'));
    await userEvent.press(await findByText('Remove fixture'));
    await userEvent.press(getByText('Delete fixture'));

    await waitFor(() => expect(mockBack).toHaveBeenCalled());
    await expect(mockRepository.getMatch(created.id)).rejects.toThrow(/No match/);
  });

  it('shows a live timer and a forward rotation plan while a match is under way', async () => {
    // Stretch m1 to a 100-minute game so a planned break still lands after
    // its stored 62nd minute. m1: 5-a-side (4 outfield) over a squad of 7.
    await mockRepository.updateMatchScore('m1', { status: 'live', durationMinutes: 100 });
    // An earlier test may have pinned m1's availability — reset to full squad.
    await mockRepository.updateLineup('m1', {
      side: 'home',
      players: (await mockRepository.getMatch('m1')).lineups?.home ?? [],
      availablePlayerIds: undefined,
    });

    const { findByText, getByText, getByLabelText } = await renderScreen();
    await findByText('Rotation plan');

    // Prominent match timer.
    expect(getByLabelText(/Match clock, 62 minutes/)).toBeTruthy();
    // Even outfield share: 100 * 4 / 6 ≈ 67, keeper held out.
    expect(getByText(/goalkeeper isn/)).toBeTruthy();
    expect(getByText(/Next sub 67/)).toBeTruthy();
    // A planned break names a bench player coming on for someone on the pitch.
    expect(getByLabelText(/At 67 minutes: .+ on for .+/)).toBeTruthy();

    await mockRepository.updateMatchScore('m1', { status: 'live', durationMinutes: undefined });
  });

  describe('before kick-off', () => {
    beforeEach(() => {
      // m2 is scheduled; the coach's team is the away side there.
      jest.mocked(useLocalSearchParams).mockReturnValue({ id: 'm2' });
    });

    afterEach(async () => {
      await mockRepository.updateLineup('m2', { side: 'away', players: [] });
      await mockRepository.updateMatchScore('m2', {
        status: 'scheduled',
        durationMinutes: undefined,
      });
    });

    it('prompts for a lineup when none is set', async () => {
      const { findByText, queryByText } = await renderScreen();

      expect(await findByText(/Set your lineup to see when to make each sub/)).toBeTruthy();
      expect(queryByText('Planned minutes')).toBeNull();
    });

    it('plans every sub and each player’s minutes from the starting lineup', async () => {
      const squad = await mockRepository.getSquad();
      // Keeper + 4 outfield start; 2 outfielders on the bench, over 60 minutes.
      await mockRepository.updateLineup('m2', { side: 'away', players: squad.slice(0, 5) });
      await mockRepository.updateMatchScore('m2', { status: 'scheduled', durationMinutes: 60 });

      const { findByText, getByText, getByLabelText, queryByText } = await renderScreen();
      await findByText('Planned minutes');

      // 60' × 4 outfield slots ÷ 6 outfielders = 40' each.
      expect(getByText(/Even share ≈ 40/)).toBeTruthy();
      expect(getByText(/Planned for a 60/)).toBeTruthy();
      // Two on the bench out of six → three equal spells, breaks at 20' and 40'.
      expect(getByLabelText(/At 20 minutes: .+ on for .+, .+ on for .+/)).toBeTruthy();
      expect(getByLabelText(/At 40 minutes: .+ on for .+, .+ on for .+/)).toBeTruthy();

      // The keeper plays it all and is never in a swap.
      expect(getByLabelText(`${squad[0].name}, goalkeeper, planned 60 minutes`)).toBeTruthy();
      expect(queryByText(new RegExp(`↓ ${squad[0].squadNumber} ${squad[0].name}`))).toBeNull();
      // Every outfielder — starter or bench — lands on the even share.
      for (const starter of squad.slice(1, 5)) {
        expect(getByLabelText(`${starter.name}, starts, planned 40 minutes`)).toBeTruthy();
      }
      for (const sub of squad.slice(5)) {
        expect(getByLabelText(`${sub.name}, starts on the bench, planned 40 minutes`)).toBeTruthy();
      }

      // Still no "minutes played" before the match starts.
      expect(queryByText('Minutes played')).toBeNull();
    });

    it('leaves a player who is not available out of the plan', async () => {
      const squad = await mockRepository.getSquad();
      await mockRepository.updateLineup('m2', {
        side: 'away',
        players: squad.slice(0, 5),
        availablePlayerIds: squad.slice(0, 6).map((player) => player.id),
      });

      const { findByText, queryByLabelText } = await renderScreen();
      await findByText('Planned minutes');

      expect(queryByLabelText(new RegExp(`^${squad[6].name},`))).toBeNull();
    });

    it('says so when the whole squad starts and nobody needs subbing', async () => {
      const squad = await mockRepository.getSquad();
      await mockRepository.updateLineup('m2', { side: 'away', players: squad });

      const { findByText } = await renderScreen();

      expect(await findByText(/everyone plays the full match/)).toBeTruthy();
    });
  });
});
