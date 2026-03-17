import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import React, { useEffect, useMemo } from 'react';
import {
    Platform,
    Pressable,
    StyleSheet,
    Text,
    useColorScheme,
    useWindowDimensions,
    View,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
    Easing,
    interpolate,
    runOnJS,
    useAnimatedStyle,
    useSharedValue,
    withSpring,
    withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const BASE_TAB_BAR_WIDTH_RATIO = 1;
const TAB_BAR_BASE_HEIGHT = 60;
const TAB_BAR_HORIZONTAL_PADDING = 24;
const MIN_SIDE_INSET = 14;
const MAX_SIDE_INSET = 24;
const TAB_BAR_BOTTOM = 24;
const DRAG_THRESHOLD = 6;

const COLORS = {
  light: {
    shellBorder: 'rgba(255,255,255,0.75)',
    shellBorderOuter: 'rgba(180,180,200,0.28)',
    bubble: 'rgba(255,255,255,0.92)',
    bubbleBorder: 'rgba(255,255,255,0.95)',
    bubbleGlow: 'transparent',
    activeIcon: '#1260c4',
    inactiveIcon: '#000000',
    activeLabel: '#1260c4',
    inactiveLabel: '#000000',
    sheenTop: 'rgba(255,255,255,0.70)',
    sheenBottom: 'rgba(255,255,255,0.00)',
    bg: 'rgba(255,255,255,0.55)',
  },
  dark: {
    shellBorder: 'rgba(255,255,255,0.10)',
    shellBorderOuter: 'rgba(0,0,0,0.0)',
    bubble: '#2A2A2A',
    bubbleBorder: 'rgba(255,255,255,0.12)',
    bubbleGlow: 'transparent',
    activeIcon: '#4d9fff',
    inactiveIcon: '#9CA3AF',
    activeLabel: '#4d9fff',
    inactiveLabel: '#9CA3AF',
    sheenTop: 'rgba(255,255,255,0.07)',
    sheenBottom: 'rgba(255,255,255,0.00)',
    bg: 'rgba(10,10,10,0.72)',
  },
};

const clamp = (value: number, min: number, max: number) => {
  'worklet';
  return Math.min(Math.max(value, min), max);
};

export function LiquidTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const { width: screenWidth } = useWindowDimensions();
  const isDark = colorScheme === 'dark';
  const colors = isDark ? COLORS.dark : COLORS.light;

  const visibleRoutes = useMemo(() => {
    return state.routes.filter((route) => {
      const options = descriptors[route.key]?.options as any;
      if (options?.href === null) return false;
      if (options?.tabBarItemStyle?.display === 'none') return false;
      return true;
    });
  }, [state.routes, descriptors]);

  const mainRoutes = visibleRoutes;

  const sideInset = Math.min(MAX_SIDE_INSET, Math.max(MIN_SIDE_INSET, screenWidth * 0.05));
  const tabBarHeight = 64;
  const wrapperHeight = tabBarHeight + TAB_BAR_BOTTOM + 18;
  const barWidth = Math.min(
    screenWidth * BASE_TAB_BAR_WIDTH_RATIO,
    screenWidth - sideInset * 2
  );

  const ACTIVE_EXTRA_WIDTH = 0;
  const innerBarWidth = barWidth - TAB_BAR_HORIZONTAL_PADDING * 2;
  const baseTabWidth = innerBarWidth / Math.max(1, mainRoutes.length);
  const bubbleHeight = 48;

  const [lastIndex, setLastIndex] = React.useState(0);

  const activeVisibleIndex = mainRoutes.findIndex(
    (route) => route.key === state.routes[state.index]?.key
  );

  const currentIndex = activeVisibleIndex === -1 ? lastIndex : activeVisibleIndex;

  useEffect(() => {
    if (activeVisibleIndex !== -1) setLastIndex(activeVisibleIndex);
  }, [activeVisibleIndex]);

  const animatedFloatIndex = useSharedValue(currentIndex);
  const dragStartIndex = useSharedValue(currentIndex);
  const scaleX = useSharedValue(1);
  const scaleY = useSharedValue(1);
  const glowOpacity = useSharedValue(0.75);

  const getMeasurements = (val: number) => {
    'worklet';
    let currentX = TAB_BAR_HORIZONTAL_PADDING - 12;
    let targetX = 0;
    let targetW = 0;
    const count = mainRoutes.length;

    for (let i = 0; i < count; i++) {
      const weight = Math.max(0, 1 - Math.abs(val - i));
      const tabW = baseTabWidth + weight * ACTIVE_EXTRA_WIDTH;
      targetX += currentX * weight;
      targetW += tabW * weight;
      currentX += tabW;
    }
    return { x: targetX, w: targetW };
  };

  useEffect(() => {
    animatedFloatIndex.value = withSpring(currentIndex, {
      damping: 16,
      stiffness: 220,
      mass: 0.85,
    });
  }, [currentIndex]);

  const triggerSoft = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft).catch(() => {});
  };

  const goToMainIndex = (visibleIndex: number) => {
    const route = mainRoutes[visibleIndex];
    if (!route) return;
    const actualIndex = state.routes.findIndex((r) => r.key === route.key);
    if (actualIndex !== state.index) navigation.navigate(route.name);
  };

  const snapToIndex = (index: number, bounce = true) => {
    animatedFloatIndex.value = withSpring(index, {
      damping: bounce ? 14 : 17,
      stiffness: bounce ? 210 : 240,
      mass: 0.84,
    });
    scaleX.value = withSpring(1, { damping: 14, stiffness: 180 });
    scaleY.value = withSpring(1, { damping: 14, stiffness: 180 });
    glowOpacity.value = withTiming(0.75, { duration: 180, easing: Easing.out(Easing.quad) });
  };

  const panGesture = Gesture.Pan()
    .activeOffsetX([-DRAG_THRESHOLD, DRAG_THRESHOLD])
    .failOffsetY([-14, 14])
    .onBegin(() => {
      dragStartIndex.value = animatedFloatIndex.value;
      scaleX.value = withTiming(1.02, { duration: 100 });
      scaleY.value = withTiming(0.985, { duration: 100 });
      glowOpacity.value = withTiming(1, { duration: 120 });
    })
    .onUpdate((event) => {
      const approxWidth = baseTabWidth + ACTIVE_EXTRA_WIDTH / 2;
      const nextIndex = dragStartIndex.value + event.translationX / approxWidth;
      animatedFloatIndex.value = clamp(nextIndex, 0, mainRoutes.length - 1);
      const stretch = Math.min(Math.abs(event.translationX) / 140, 0.1);
      scaleX.value = 1 + stretch;
      scaleY.value = 1 - stretch * 0.35;
    })
    .onEnd((event) => {
      const approxWidth = baseTabWidth + ACTIVE_EXTRA_WIDTH / 2;
      const velocityBonus = clamp((event.velocityX / approxWidth) * 0.05, -0.5, 0.5);
      const predictedIndex = animatedFloatIndex.value + velocityBonus;
      let nearestIndex = clamp(Math.round(predictedIndex), 0, mainRoutes.length - 1);
      runOnJS(goToMainIndex)(nearestIndex);
      animatedFloatIndex.value = withSpring(nearestIndex, { damping: 14, stiffness: 220, mass: 0.84 });
      scaleX.value = withTiming(1, { duration: 250 });
      scaleY.value = withTiming(1, { duration: 250 });
      glowOpacity.value = withTiming(0.75, { duration: 250 });
    });

  const bubbleStyle = useAnimatedStyle(() => {
    const m = getMeasurements(animatedFloatIndex.value);
    return {
      width: clamp(m.w, 44, 200),
      transform: [{ translateX: m.x }, { scaleX: scaleX.value }, { scaleY: scaleY.value }],
    };
  });

  const bubbleGlowStyle = useAnimatedStyle(() => {
    const m = getMeasurements(animatedFloatIndex.value);
    return {
      opacity: glowOpacity.value,
      width: clamp(m.w, 44, 200),
      transform: [{ translateX: m.x }, { scaleX: scaleX.value * 1.02 }, { scaleY: scaleY.value * 1.02 }],
    };
  });

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.wrapper,
        {
          height: wrapperHeight + insets.bottom,
          paddingBottom: Math.max(insets.bottom - 8, 0),
        },
      ]}
    >
      <GestureDetector gesture={panGesture}>
        <BlurView
          intensity={95}
          tint={isDark ? 'dark' : 'light'}
          style={[
            styles.mainBar,
            {
              height: tabBarHeight,
              width: barWidth,
              left: (screenWidth - barWidth) / 2,
              bottom: TAB_BAR_BOTTOM,
              borderColor: colors.shellBorder,
              backgroundColor: isDark ? 'rgba(10,10,10,0.72)' : 'rgba(255,255,255,0.88)',
            },
          ]}
        >
          <Animated.View
            style={[
              styles.mainBar,
              { height: tabBarHeight, width: barWidth, left: 0, bottom: 0, backgroundColor: 'transparent', borderColor: 'transparent', position: 'relative' },
            ]}
          >
            <Animated.View
              pointerEvents="none"
              style={[
                styles.bubbleGlow,
                { top: (tabBarHeight - bubbleHeight) / 2, height: bubbleHeight, backgroundColor: colors.bubbleGlow, borderRadius: bubbleHeight / 2 },
                bubbleGlowStyle,
              ]}
            />
            <Animated.View
              pointerEvents="none"
              style={[
                styles.activeBubble,
                { top: (tabBarHeight - bubbleHeight) / 2, height: bubbleHeight, backgroundColor: colors.bubble, borderColor: colors.bubbleBorder, borderRadius: 22, zIndex: 0 },
                bubbleStyle,
              ]}
            />

            {mainRoutes.map((route, visibleIndex) => {
              const actualIndex = state.routes.findIndex((r) => r.key === route.key);
              const isFocused = state.index === actualIndex;
              const { options } = descriptors[route.key];

              const label =
                typeof options.tabBarLabel === 'string'
                  ? options.tabBarLabel
                  : typeof options.title === 'string'
                    ? options.title
                    : route.name;

              const icon = options.tabBarIcon;

              const onPress = () => {
                const event = navigation.emit({
                  type: 'tabPress',
                  target: route.key,
                  canPreventDefault: true,
                });
                if (!isFocused && !event.defaultPrevented) {
                  triggerSoft();
                  snapToIndex(visibleIndex, true);
                  navigation.navigate(route.name);
                }
              };

              const onLongPress = () => {
                navigation.emit({ type: 'tabLongPress', target: route.key });
              };

              return (
                <DynamicWidthTab
                  key={route.key}
                  baseTabWidth={baseTabWidth}
                  activeExtraWidth={ACTIVE_EXTRA_WIDTH}
                  animatedFloatIndex={animatedFloatIndex}
                  visibleIndex={visibleIndex}
                >
                  <DockTabItem
                    label={label}
                    isFocused={isFocused}
                    activeLabelColor={colors.activeLabel}
                    inactiveLabelColor={colors.inactiveLabel}
                    onPress={onPress}
                    onLongPress={onLongPress}
                  >
                    {icon?.({
                      focused: isFocused,
                      color: isFocused ? colors.activeIcon : colors.inactiveIcon,
                      size: 24,
                    })}
                  </DockTabItem>
                </DynamicWidthTab>
              );
            })}
          </Animated.View>
        </BlurView>
      </GestureDetector>
    </View>
  );
}

function DynamicWidthTab({ baseTabWidth, activeExtraWidth, animatedFloatIndex, visibleIndex, children }: any) {
  const style = useAnimatedStyle(() => {
    const weight = Math.max(0, 1 - Math.abs(animatedFloatIndex.value - visibleIndex));
    return { width: baseTabWidth + weight * activeExtraWidth };
  });

  return (
    <Animated.View style={[style, { alignItems: 'center', justifyContent: 'center', height: '100%' }]}>
      {children}
    </Animated.View>
  );
}

function DockTabItem({
  label,
  isFocused,
  activeLabelColor,
  inactiveLabelColor,
  onPress,
  onLongPress,
  children,
}: {
  label: string;
  isFocused: boolean;
  activeLabelColor: string;
  inactiveLabelColor: string;
  onPress: () => void;
  onLongPress: () => void;
  children: React.ReactNode;
}) {
  const progress = useSharedValue(isFocused ? 1 : 0);

  useEffect(() => {
    progress.value = withSpring(isFocused ? 1 : 0, { damping: 16, stiffness: 180, mass: 0.9 });
  }, [isFocused]);

  const contentStyle = useAnimatedStyle(() => ({
    flexDirection: 'column',
    transform: [{ scale: interpolate(progress.value, [0, 1], [1, 1.05]) }],
  }));

  return (
    <Pressable onPress={onPress} onLongPress={onLongPress} style={styles.tab}>
      <Animated.View style={[styles.tabContent, contentStyle]}>
        <View style={styles.iconWrap}>{children}</View>
        <Text
          numberOfLines={1}
          style={[
            styles.label,
            {
              color: isFocused ? activeLabelColor : inactiveLabelColor,
              fontWeight: isFocused ? '800' : '700',
              opacity: 1,
              marginTop: 2,
            },
          ]}
        >
          {label}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'flex-end',
    backgroundColor: 'transparent',
  },
  mainBar: {
    position: 'absolute',
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: TAB_BAR_HORIZONTAL_PADDING - 12,
    paddingRight: TAB_BAR_HORIZONTAL_PADDING + 12,
    overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 16, shadowOffset: { width: 0, height: 6 } },
      android: { elevation: 6 },
    }),
  },
  activeBubble: {
    position: 'absolute',
    left: 0,
    zIndex: 1,
    borderWidth: 1,
  },
  bubbleGlow: {
    position: 'absolute',
    left: 0,
    zIndex: 0,
  },
  tab: {
    height: '100%',
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    zIndex: 2,
  },
  tabContent: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrap: {
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  label: {
    fontSize: 10,
    letterSpacing: 0.1,
  },
});
