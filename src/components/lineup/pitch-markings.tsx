import { StyleSheet, View } from 'react-native';

import { radii } from '@/theme/theme';

/** Pitch colours — deliberately real grass/paint, not theme tokens. */
export const PITCH_GREEN = '#2f8f45';
/** Faint white paint, like a broadcast graphic. */
export const PITCH_LINE = 'rgba(255,255,255,0.22)';
export const PITCH_LINE_WIDTH = 1;
/** Full pitch, portrait — both boxes visible, room for four slot rows. */
export const PITCH_ASPECT_RATIO = 0.64;

/** Mixes two `#rrggbb` colours; `t` runs 0 (from) → 1 (to). */
function mixHex(from: string, to: string, t: number): string {
  const channels = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  const [r1, g1, b1] = channels(from);
  const [r2, g2, b2] = channels(to);
  const lerp = (a: number, b: number) =>
    Math.round(a + (b - a) * t)
      .toString(16)
      .padStart(2, '0');
  return `#${lerp(r1, r2)}${lerp(g1, g2)}${lerp(b1, b2)}`;
}

/**
 * A top-to-bottom green ramp, brighter at the top — stacked bands stand in for
 * a real gradient fill (no gradient primitive in React Native, no dep added).
 */
const PITCH_GRADIENT = Array.from({ length: 16 }, (_, i) => mixHex('#3fa457', '#1c5f30', i / 15));

/**
 * A full pitch drawn with plain Views over a stacked-band green gradient: our
 * goal at the bottom, the opponent's at the top, halfway line and centre
 * circle across the middle. Arcs are half/quarter circles made with a
 * rounded, one-side-open border — React Native has no SVG or clip-path.
 * Purely decorative: it sits behind the tappable slots and takes no input.
 */
export function PitchMarkings() {
  return (
    <View style={styles.markings} pointerEvents="none" testID="pitch-markings">
      <View style={styles.gradient} testID="pitch-gradient">
        {PITCH_GRADIENT.map((colour, i) => (
          <View key={i} style={[styles.gradientBand, { backgroundColor: colour }]} />
        ))}
      </View>

      <View style={styles.halfwayLine} testID="pitch-halfway-line" />
      <View style={styles.centreCircle} testID="pitch-centre-circle" />
      <View style={styles.centreSpot} />

      {/* Opponent's end (top) */}
      <View style={[styles.penaltyArea, styles.penaltyAreaTop]} testID="pitch-penalty-area-top" />
      <View style={[styles.goalArea, styles.goalAreaTop]} testID="pitch-goal-area-top" />
      <View style={[styles.penaltyArc, styles.penaltyArcTop]} testID="pitch-penalty-arc-top" />
      <View style={[styles.penaltySpot, styles.penaltySpotTop]} />
      <View style={[styles.goalFrame, styles.goalFrameTop]} testID="pitch-goal-frame-top" />

      {/* Our end (bottom) */}
      <View
        style={[styles.penaltyArea, styles.penaltyAreaBottom]}
        testID="pitch-penalty-area-bottom"
      />
      <View style={[styles.goalArea, styles.goalAreaBottom]} testID="pitch-goal-area-bottom" />
      <View
        style={[styles.penaltyArc, styles.penaltyArcBottom]}
        testID="pitch-penalty-arc-bottom"
      />
      <View style={[styles.penaltySpot, styles.penaltySpotBottom]} />
      <View style={[styles.goalFrame, styles.goalFrameBottom]} testID="pitch-goal-frame-bottom" />

      <View style={[styles.cornerArc, styles.cornerArcTL]} testID="pitch-corner-arc-tl" />
      <View style={[styles.cornerArc, styles.cornerArcTR]} testID="pitch-corner-arc-tr" />
      <View style={[styles.cornerArc, styles.cornerArcBL]} testID="pitch-corner-arc-bl" />
      <View style={[styles.cornerArc, styles.cornerArcBR]} testID="pitch-corner-arc-br" />
    </View>
  );
}

const styles = StyleSheet.create({
  markings: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  gradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  gradientBand: {
    flex: 1,
  },
  halfwayLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '50%',
    height: PITCH_LINE_WIDTH,
    backgroundColor: PITCH_LINE,
  },
  centreCircle: {
    position: 'absolute',
    top: '40%',
    left: '35%',
    width: '30%',
    aspectRatio: 1,
    borderColor: PITCH_LINE,
    borderWidth: PITCH_LINE_WIDTH,
    borderRadius: radii.full,
  },
  centreSpot: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 5,
    height: 5,
    marginLeft: -2.5,
    marginTop: -2.5,
    borderRadius: radii.full,
    backgroundColor: PITCH_LINE,
  },
  penaltyArea: {
    position: 'absolute',
    left: '21%',
    width: '58%',
    height: '16%',
    borderColor: PITCH_LINE,
    borderWidth: PITCH_LINE_WIDTH,
  },
  penaltyAreaTop: {
    top: 0,
    borderTopWidth: 0,
  },
  penaltyAreaBottom: {
    bottom: 0,
    borderBottomWidth: 0,
  },
  goalArea: {
    position: 'absolute',
    left: '36%',
    width: '28%',
    height: '7%',
    borderColor: PITCH_LINE,
    borderWidth: PITCH_LINE_WIDTH,
  },
  goalAreaTop: {
    top: 0,
    borderTopWidth: 0,
  },
  goalAreaBottom: {
    bottom: 0,
    borderBottomWidth: 0,
  },
  penaltyArc: {
    position: 'absolute',
    left: '39%',
    width: '22%',
    aspectRatio: 2,
    borderColor: PITCH_LINE,
    borderWidth: PITCH_LINE_WIDTH,
  },
  penaltyArcTop: {
    top: '16%',
    borderTopWidth: 0,
    borderBottomLeftRadius: radii.full,
    borderBottomRightRadius: radii.full,
  },
  penaltyArcBottom: {
    bottom: '16%',
    borderBottomWidth: 0,
    borderTopLeftRadius: radii.full,
    borderTopRightRadius: radii.full,
  },
  penaltySpot: {
    position: 'absolute',
    left: '50%',
    width: 4,
    height: 4,
    marginLeft: -2,
    borderRadius: radii.full,
    backgroundColor: PITCH_LINE,
  },
  penaltySpotTop: {
    top: '11%',
  },
  penaltySpotBottom: {
    bottom: '11%',
  },
  goalFrame: {
    position: 'absolute',
    left: '43%',
    width: '14%',
    height: 5,
    borderColor: PITCH_LINE,
    borderWidth: PITCH_LINE_WIDTH,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  goalFrameTop: {
    top: 0,
    borderTopWidth: 0,
  },
  goalFrameBottom: {
    bottom: 0,
    borderBottomWidth: 0,
  },
  cornerArc: {
    position: 'absolute',
    width: '6%',
    aspectRatio: 1,
    borderColor: PITCH_LINE,
  },
  cornerArcTL: {
    top: 0,
    left: 0,
    borderBottomWidth: PITCH_LINE_WIDTH,
    borderRightWidth: PITCH_LINE_WIDTH,
    borderBottomRightRadius: radii.full,
  },
  cornerArcTR: {
    top: 0,
    right: 0,
    borderBottomWidth: PITCH_LINE_WIDTH,
    borderLeftWidth: PITCH_LINE_WIDTH,
    borderBottomLeftRadius: radii.full,
  },
  cornerArcBL: {
    bottom: 0,
    left: 0,
    borderTopWidth: PITCH_LINE_WIDTH,
    borderRightWidth: PITCH_LINE_WIDTH,
    borderTopRightRadius: radii.full,
  },
  cornerArcBR: {
    bottom: 0,
    right: 0,
    borderTopWidth: PITCH_LINE_WIDTH,
    borderLeftWidth: PITCH_LINE_WIDTH,
    borderTopLeftRadius: radii.full,
  },
});
