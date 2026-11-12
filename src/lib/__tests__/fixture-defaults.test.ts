import { deriveShortName } from '../fixture-defaults';

describe('deriveShortName', () => {
  it.each([
    ['Rivals FC', 'RIV'],
    ['Harbour Bay City', 'HBC'],
    ['Harbour Bay City U10s', 'HBC'],
    ['AFC Wimbledon', 'WIM'],
    ['St. Mary’s Juniors', 'SMJ'],
    ['Red Star Belgrade Youth', 'RSB'],
    ['', ''],
  ])('%s → %s', (name, expected) => {
    expect(deriveShortName(name)).toBe(expected);
  });
});
