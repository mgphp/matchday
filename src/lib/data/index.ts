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
};

/** Swaps the live data source. Called once a coach's active team is resolved. */
export function setRepository(next: MatchdayRepository): void {
  activeRepository = next;
}

export type { MatchdayRepository };
