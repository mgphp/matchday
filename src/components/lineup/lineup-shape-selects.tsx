import { Select } from '@/components/select';
import { MAX_TEAM_SIZE, MIN_TEAM_SIZE } from '@/lib/formations';

const TEAM_SIZES: readonly string[] = Array.from(
  { length: MAX_TEAM_SIZE - MIN_TEAM_SIZE + 1 },
  (_, i) => String(MIN_TEAM_SIZE + i),
);

/** Team size (5–11) and the formations that size allows. */
export function LineupShapeSelects({
  teamSize,
  formation,
  formationOptions,
  onTeamSizeChange,
  onFormationChange,
}: {
  teamSize: number;
  formation: string;
  formationOptions: string[];
  onTeamSizeChange: (size: number) => void;
  onFormationChange: (formation: string) => void;
}) {
  return (
    <>
      <Select
        label="Team size"
        options={TEAM_SIZES}
        value={String(teamSize)}
        onChange={(next) => onTeamSizeChange(Number(next))}
      />
      <Select
        label="Formation"
        options={formationOptions}
        value={formation}
        onChange={onFormationChange}
      />
    </>
  );
}
