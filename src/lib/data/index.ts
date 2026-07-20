import { mockRepository } from './mock-repository';
import type { MatchdayRepository } from './repository';

/** Active data source. Swap the assignment when a real API lands. */
export const repository: MatchdayRepository = mockRepository;

export type { MatchdayRepository };
