/**
 * Mascot — "Fú" the Lucky Lion Cub
 *
 * Animated using React Native's built-in Animated API (zero extra deps).
 * Five states map to different animation loops matching the screen context:
 *
 *   idle        → gentle float  (Home hero, default)
 *   celebrating → fast bounce   (Win result reveal)
 *   thinking    → slow pulse    (OCR in progress, Predict loading)
 *   sleeping    → deep breathe  (History empty state)
 *   sad         → droop settle  (Loss result)
 *
 * To swap to Lottie later:
 *   1. npx expo install lottie-react-native
 *   2. Drop .json files into mobile-app/assets/animations/
 *   3. Replace the Animated.View below with <LottieView source={ANIM[state]} />
 */
import { useRef, useEffect } from 'react';
import { Animated, Easing, View, Text, StyleSheet } from 'react-native';

export type MascotState = 'idle' | 'celebrating' | 'thinking' | 'sleeping' | 'sad';

const EMOJI: Record<MascotState, string> = {
  idle:        '🦁',
  celebrating: '🦁',
  thinking:    '🦁',
  sleeping:    '😴',
  sad:         '🥺',
};

const BG: Record<MascotState, string> = {
  idle:        '#e5393520',
  celebrating: '#f59e0b28',
  thinking:    '#7c3aed22',
  sleeping:    '#21262d',
  sad:         '#1c1215',
};

const BORDER: Record<MascotState, string> = {
  idle:        '#e53935',
  celebrating: '#f59e0b',
  thinking:    '#a78bfa',
  sleeping:    '#30363d',
  sad:         '#e5393555',
};

interface MascotProps {
  state?: MascotState;
  size?:  number;
}

export function Mascot({ state = 'idle', size = 100 }: MascotProps) {
  const y     = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(1)).current;
  const anim  = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    // stop + reset any running animation
    anim.current?.stop();
    y.setValue(0);
    scale.setValue(1);

    switch (state) {
      case 'idle':
        anim.current = Animated.loop(
          Animated.sequence([
            Animated.timing(y, { toValue: -9, duration: 1300, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
            Animated.timing(y, { toValue:  0, duration: 1300, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          ]),
        );
        break;

      case 'celebrating':
        anim.current = Animated.loop(
          Animated.sequence([
            Animated.parallel([
              Animated.timing(y,     { toValue: -20,  duration: 260, easing: Easing.out(Easing.back(2.5)), useNativeDriver: true }),
              Animated.timing(scale, { toValue: 1.18, duration: 260, useNativeDriver: true }),
            ]),
            Animated.parallel([
              Animated.timing(y,     { toValue: 0,   duration: 280, easing: Easing.bounce, useNativeDriver: true }),
              Animated.timing(scale, { toValue: 1.0, duration: 280, useNativeDriver: true }),
            ]),
            Animated.delay(80),
          ]),
        );
        break;

      case 'thinking':
        anim.current = Animated.loop(
          Animated.sequence([
            Animated.timing(scale, { toValue: 1.07, duration: 850, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
            Animated.timing(scale, { toValue: 0.95, duration: 850, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          ]),
        );
        break;

      case 'sleeping':
        anim.current = Animated.loop(
          Animated.sequence([
            Animated.timing(scale, { toValue: 1.04, duration: 2600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
            Animated.timing(scale, { toValue: 0.96, duration: 2600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          ]),
        );
        break;

      case 'sad':
        // one-shot droop — no loop
        anim.current = Animated.parallel([
          Animated.timing(scale, { toValue: 0.88, duration: 450, useNativeDriver: true }),
          Animated.timing(y,     { toValue: 5,    duration: 450, useNativeDriver: true }),
        ]);
        break;
    }

    anim.current?.start();
    return () => { anim.current?.stop(); };
  }, [state]);

  const emojiSize = size * 0.52;

  return (
    <Animated.View
      style={[
        styles.wrap,
        {
          width:           size,
          height:          size,
          borderRadius:    size * 0.28,
          backgroundColor: BG[state],
          borderColor:     BORDER[state],
          transform:       [{ translateY: y }, { scale }],
        },
      ]}
    >
      <Text style={{ fontSize: emojiSize, lineHeight: emojiSize * 1.15 }}>
        {EMOJI[state]}
      </Text>
      {state === 'sleeping' && (
        <Text style={[styles.zzz, { fontSize: size * 0.18 }]}>💤</Text>
      )}
      {state === 'celebrating' && (
        <Text style={[styles.sparkle, { fontSize: size * 0.2 }]}>✨</Text>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  zzz: {
    position: 'absolute',
    top: -6,
    right: -6,
  },
  sparkle: {
    position: 'absolute',
    top: -8,
    right: -8,
  },
});
