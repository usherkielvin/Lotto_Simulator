import {
    LiquidGlassView,
    isLiquidGlassSupported,
} from '@/modules/liquid-glass';
import React from 'react';
import { Platform, StyleSheet, ViewStyle } from 'react-native';
import { ThemedView } from './themed-view';

interface LiquidGlassCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  effect?: 'clear' | 'regular' | 'none';
  interactive?: boolean;
  borderRadius?: number;
}

/**
 * A card that uses the iOS 26 liquid glass effect on supported devices,
 * and falls back to a semi-transparent ThemedView on everything else.
 */
export function LiquidGlassCard({
  children,
  style,
  effect = 'regular',
  interactive = false,
  borderRadius = 20,
}: LiquidGlassCardProps) {
  const isIOS = Platform.OS === 'ios';

  if (isIOS && isLiquidGlassSupported) {
    return (
      <LiquidGlassView
        style={[styles.card, { borderRadius }, style]}
        effect={effect}
        interactive={interactive}
      >
        {children}
      </LiquidGlassView>
    );
  }

  // Fallback for Android, web, or older iOS
  return (
    <ThemedView style={[styles.card, styles.fallback, { borderRadius }, style]}>
      {children}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
    overflow: 'hidden',
  },
  fallback: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.3)',
  },
});
