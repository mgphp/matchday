import AsyncStorage from '@react-native-async-storage/async-storage';

/** Used when a coach leaves Competition blank. */
export const DEFAULT_COMPETITION = 'Friendly';

/** Club-name filler words that make poor initials ("Rivals FC" → RIV, not RF). */
const FILLER_WORDS = new Set(['FC', 'AFC', 'JFC', 'YFC', 'CFC', 'FOOTBALL', 'CLUB', 'THE', 'OF']);

/**
 * A three-letter-ish badge name from an opponent name: initials when the name
 * has several words ("Harbour Bay City" → HBC), else the first three letters
 * ("Rivals FC" → RIV). Age groups like "U10" are dropped.
 */
export function deriveShortName(name: string): string {
  const words = name
    .toUpperCase()
    .replace(/['’]/g, '')
    .replace(/[^A-Z0-9 ]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 0 && !FILLER_WORDS.has(word) && !/^U\d+S?$/.test(word));
  if (words.length === 0) return name.trim().slice(0, 3).toUpperCase();
  if (words.length === 1) return words[0].slice(0, 3);
  return words
    .slice(0, 3)
    .map((word) => word[0])
    .join('');
}

const competitionKey = (teamId: string) => `matchday:lastCompetition:${teamId}`;

/** The competition this team last added a fixture in, stored on-device. */
export async function loadLastCompetition(teamId: string): Promise<string> {
  try {
    return (await AsyncStorage.getItem(competitionKey(teamId))) ?? '';
  } catch {
    return '';
  }
}

export async function saveLastCompetition(teamId: string, competition: string): Promise<void> {
  try {
    await AsyncStorage.setItem(competitionKey(teamId), competition);
  } catch {
    // Only a convenience prefill — never fail the save over it.
  }
}
