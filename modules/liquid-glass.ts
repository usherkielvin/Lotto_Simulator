// Fallback shim — used on Android, web, and any environment where the
// native module hasn't been compiled (e.g. Expo Go, Metro on Windows).
// The real iOS implementation is in modules/liquid-glass.ios.ts
import React from 'react';
import { View, ViewProps } from 'react-native';

export const isLiquidGlassSupported = false;

// Accept (and ignore) the extra liquid-glass props so TypeScript is happy
// on non-iOS platforms.
interface LiquidGlassViewProps extends ViewProps {
  effect?: 'clear' | 'regular' | 'none';
  interactive?: boolean;
  tintColor?: string;
  colorScheme?: 'light' | 'dark' | 'system';
}

interface LiquidGlassContainerViewProps extends ViewProps {
  spacing?: number;
}

export function LiquidGlassView({ effect: _e, interactive: _i, tintColor: _t, colorScheme: _c, ...rest }: LiquidGlassViewProps) {
  return React.createElement(View, rest);
}

export function LiquidGlassContainerView({ spacing: _s, ...rest }: LiquidGlassContainerViewProps) {
  return React.createElement(View, rest);
}
