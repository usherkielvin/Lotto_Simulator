import React from 'react';
import { View, ViewProps } from 'react-native';

interface LiquidGlassViewProps extends ViewProps {
    effect?: 'clear' | 'regular' | 'none';
    interactive?: boolean;
    tintColor?: string;
    colorScheme?: 'light' | 'dark' | 'system';
}

interface LiquidGlassContainerViewProps extends ViewProps {
    spacing?: number;
}

type LiquidGlassExports = {
    LiquidGlassView: React.ComponentType<LiquidGlassViewProps>;
    LiquidGlassContainerView: React.ComponentType<LiquidGlassContainerViewProps>;
    isLiquidGlassSupported: boolean;
};

function FallbackLiquidGlassView({
    effect: _effect,
    interactive: _interactive,
    tintColor: _tintColor,
    colorScheme: _colorScheme,
    ...rest
}: LiquidGlassViewProps) {
    return React.createElement(View, rest);
}

function FallbackLiquidGlassContainerView({ spacing: _spacing, ...rest }: LiquidGlassContainerViewProps) {
    return React.createElement(View, rest);
}

function loadLiquidGlass(): LiquidGlassExports {
    try {
        const native = require('@callstack/liquid-glass') as LiquidGlassExports;
        return {
            LiquidGlassView: native.LiquidGlassView,
            LiquidGlassContainerView: native.LiquidGlassContainerView,
            isLiquidGlassSupported: native.isLiquidGlassSupported,
        };
    } catch {
        // Expo Go does not include this native module; gracefully fall back.
        return {
            LiquidGlassView: FallbackLiquidGlassView,
            LiquidGlassContainerView: FallbackLiquidGlassContainerView,
            isLiquidGlassSupported: false,
        };
    }
}

const moduleExports = loadLiquidGlass();

export const LiquidGlassView = moduleExports.LiquidGlassView;
export const LiquidGlassContainerView = moduleExports.LiquidGlassContainerView;
export const isLiquidGlassSupported = moduleExports.isLiquidGlassSupported;

