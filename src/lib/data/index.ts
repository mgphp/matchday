import { mockRepository } from './mock-repository';
import type { MatchdayRepository } from './repository';

let activeRepository: MatchdayRepository = mockRepository;

/**
 * Stable proxy so existing `repository.getX(...)` call sites keep working once
 * the active implementation is swapped (mock → HttpRepository, post sign-in).
 */
export const repository: MatchdayRepository = {
  getFixtures: (...args) => activeRepository.getFixtures(...args),
  getMatch: (...args) => activeRepository.getMatch(...args),
  getTable: (...args) => activeRepository.getTable(...args),
  getSquad: (...args) => activeRepository.getSquad(...args),
  addPlayer: (...args) => activeRepository.addPlayer(...args),
  updatePlayer: (...args) => activeRepository.updatePlayer(...args),
  removePlayer: (...args) => activeRepository.removePlayer(...args),
  restorePlayer: (...args) => activeRepository.restorePlayer(...args),
  createMatch: (...args) => activeRepository.createMatch(...args),
  updateMatchScore: (...args) => activeRepository.updateMatchScore(...args),
  updateMatchClock: (...args) => activeRepository.updateMatchClock(...args),
  updateLineup: (...args) => activeRepository.updateLineup(...args),
  addEvent: (...args) => activeRepository.addEvent(...args),
};

/** Swaps the live data source. Called once a coach's active team is resolved. */
export function setRepository(next: MatchdayRepository): void {
  activeRepository = next;
}

export type { MatchdayRepository };
