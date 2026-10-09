import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radii, spacing, typography } from '@/theme/theme';

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];
/** Weeks run Monday to Sunday. */
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const DAYS_IN_WEEK = 7;

interface YearMonth {
  year: number;
  /** 0-based, as in `Date`. */
  month: number;
}

function toIsoDate(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/** Parses `YYYY-MM-DD`; undefined for anything else (including the empty value). */
function parseIsoDate(value: string): (YearMonth & { day: number }) | undefined {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return undefined;
  return { year: Number(match[1]), month: Number(match[2]) - 1, day: Number(match[3]) };
}

/** Monday-first weekday index (0–6) of a calendar date. */
function weekdayIndex(year: number, month: number, day: number): number {
  return (new Date(Date.UTC(year, month, day)).getUTCDay() + 6) % DAYS_IN_WEEK;
}

/** The month as rows of seven cells, padded with `null` outside the month. */
function weeksOf({ year, month }: YearMonth): (number | null)[][] {
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const cells: (number | null)[] = [
    ...Array.from({ length: weekdayIndex(year, month, 1) }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
  ];
  while (cells.length % DAYS_IN_WEEK !== 0) cells.push(null);
  const weeks: (number | null)[][] = [];
  for (let start = 0; start < cells.length; start += DAYS_IN_WEEK) {
    weeks.push(cells.slice(start, start + DAYS_IN_WEEK));
  }
  return weeks;
}

function shiftMonth({ year, month }: YearMonth, by: number): YearMonth {
  const shifted = new Date(Date.UTC(year, month + by, 1));
  return { year: shifted.getUTCFullYear(), month: shifted.getUTCMonth() };
}

/** e.g. "Sat 5 Sep 2026" */
function formatDate(value: string): string | undefined {
  const date = parseIsoDate(value);
  if (!date) return undefined;
  const weekday = WEEKDAYS[weekdayIndex(date.year, date.month, date.day)];
  return `${weekday} ${date.day} ${MONTHS[date.month].slice(0, 3)} ${date.year}`;
}

/** The device's own calendar day — a fixture date is a wall-clock date. */
function currentDay(): YearMonth & { day: number } {
  const now = new Date(Date.now());
  return { year: now.getFullYear(), month: now.getMonth(), day: now.getDate() };
}

/**
 * A date field that opens an inline month calendar — same no-overlay shape as
 * `Select`, so it behaves identically on iOS, Android and web and nests inside
 * a modal. `value` is `YYYY-MM-DD`, or an empty string when nothing is picked.
 */
export function DatePicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const selected = parseIsoDate(value);
  // Read once per mount: the clock isn't a render input.
  const [today] = useState(currentDay);
  const [open, setOpen] = useState(false);
  const [visible, setVisible] = useState<YearMonth>(selected ?? today);
  const display = formatDate(value) ?? 'Choose a date';

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}, ${display}`}
        accessibilityState={{ expanded: open }}
        onPress={() => {
          // Reopen on the picked date's month rather than wherever was last browsed.
          if (!open) setVisible(selected ?? today);
          setOpen((current) => !current);
        }}
        style={styles.field}
      >
        <Text style={[styles.value, !selected && styles.placeholder]}>{display}</Text>
        <Ionicons name="calendar-outline" size={18} color={colors.textSecondary} />
      </Pressable>
      {open ? (
        <View style={styles.calendar}>
          <View style={styles.monthRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Previous month"
              onPress={() => setVisible((current) => shiftMonth(current, -1))}
              style={styles.monthButton}
            >
              <Ionicons name="chevron-back" size={20} color={colors.accent} />
            </Pressable>
            <Text accessibilityRole="header" style={styles.monthLabel}>
              {MONTHS[visible.month]} {visible.year}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Next month"
              onPress={() => setVisible((current) => shiftMonth(current, 1))}
              style={styles.monthButton}
            >
              <Ionicons name="chevron-forward" size={20} color={colors.accent} />
            </Pressable>
          </View>
          <View style={styles.week}>
            {WEEKDAYS.map((weekday) => (
              <Text key={weekday} style={styles.weekday}>
                {weekday}
              </Text>
            ))}
          </View>
          {weeksOf(visible).map((week, weekIndex) => (
            <View key={weekIndex} style={styles.week}>
              {week.map((day, dayIndex) => {
                if (day === null) return <View key={dayIndex} style={styles.day} />;
                const isSelected =
                  selected?.year === visible.year &&
                  selected.month === visible.month &&
                  selected.day === day;
                const isToday =
                  today.year === visible.year && today.month === visible.month && today.day === day;
                return (
                  <Pressable
                    key={dayIndex}
                    accessibilityRole="button"
                    accessibilityLabel={`${day} ${MONTHS[visible.month]} ${visible.year}`}
                    accessibilityState={{ selected: isSelected }}
                    onPress={() => {
                      onChange(toIsoDate(visible.year, visible.month, day));
                      setOpen(false);
                    }}
                    style={[
                      styles.day,
                      isToday && styles.dayToday,
                      isSelected && styles.daySelected,
                    ]}
                  >
                    <Text style={[styles.dayLabel, isSelected && styles.dayLabelSelected]}>
                      {day}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs,
  },
  label: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.border,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    minHeight: 44,
  },
  value: {
    ...typography.body,
    color: colors.text,
  },
  placeholder: {
    color: colors.textDisabled,
  },
  calendar: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceRaised,
    padding: spacing.sm,
    gap: spacing.xs,
  },
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  monthButton: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthLabel: {
    ...typography.body,
    fontWeight: '600',
    color: colors.text,
  },
  week: {
    flexDirection: 'row',
  },
  weekday: {
    ...typography.caption,
    flex: 1,
    textAlign: 'center',
    color: colors.textSecondary,
  },
  day: {
    flex: 1,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'transparent',
  },
  dayToday: {
    borderColor: colors.accent,
  },
  daySelected: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  dayLabel: {
    ...typography.body,
    color: colors.text,
  },
  dayLabelSelected: {
    color: colors.textOnAccent,
    fontWeight: '600',
  },
});
