import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useRef } from "react";
import {
  Animated,
  Dimensions,
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColorScheme } from "@/hooks/use-color-scheme";

export interface TabItem {
  key: string;
  label: string;
  icon: (color: string, focused: boolean) => React.ReactNode;
}

interface GlassTabBarProps {
  tabs: TabItem[];
  activeIndex: number;
  onTabPress: (index: number) => void;
}

const SCREEN_H = Dimensions.get("window").height;

function TabButton({ tab, focused, onPress, isDark }: { tab: TabItem; focused: boolean; onPress: () => void; isDark: boolean }) {
  const pressScale    = useRef(new Animated.Value(1)).current;
  const bubbleScale   = useRef(new Animated.Value(focused ? 1 : 0.5)).current;
  const bubbleOpacity = useRef(new Animated.Value(focused ? 1 : 0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(bubbleScale,   { toValue: focused ? 1 : 0.5, useNativeDriver: true, tension: 220, friction: 14 }),
      Animated.spring(bubbleOpacity, { toValue: focused ? 1 : 0,   useNativeDriver: true, tension: 220, friction: 14 }),
    ]).start();
  }, [focused]);

  const onPressIn  = () => Animated.spring(pressScale, { toValue: 0.88, useNativeDriver: true, tension: 300, friction: 10 }).start();
  const onPressOut = () => Animated.spring(pressScale, { toValue: 1,    useNativeDriver: true, tension: 300, friction: 10 }).start();

  const activeColor   = isDark ? "#ffffff"                : "#000000";
  const inactiveColor = isDark ? "rgba(255,255,255,0.38)" : "rgba(0,0,0,0.30)";

  return (
    <Pressable onPress={onPress} onPressIn={onPressIn} onPressOut={onPressOut} style={styles.tabButton} accessibilityRole="tab" accessibilityState={{ selected: focused }} accessibilityLabel={tab.label}>
      <Animated.View style={[styles.tabInner, { transform: [{ scale: pressScale }] }]}>
        <Animated.View style={[styles.bubble, { opacity: bubbleOpacity, transform: [{ scale: bubbleScale }], backgroundColor: isDark ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.55)", borderColor: isDark ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.80)" }]} pointerEvents="none">
          <LinearGradient colors={isDark ? ["rgba(255,255,255,0.12)", "rgba(255,255,255,0)"] : ["rgba(255,255,255,0.80)", "rgba(255,255,255,0)"]} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={StyleSheet.absoluteFill} pointerEvents="none" />
        </Animated.View>
        <View style={styles.iconWrap}>{tab.icon(focused ? activeColor : inactiveColor, focused)}</View>
        <Text style={[styles.label, { color: focused ? activeColor : inactiveColor }, focused && styles.labelFocused]} numberOfLines={1}>{tab.label}</Text>
      </Animated.View>
    </Pressable>
  );
}

export function GlassTabBar({ tabs, activeIndex, onTabPress }: GlassTabBarProps) {
  const insets        = useSafeAreaInsets();
  const isDark        = useColorScheme() === "dark";
  const defaultBottom = Math.max(insets.bottom, 8) + 8;
  const translateY    = useRef(new Animated.Value(0)).current;
  const lastY         = useRef(0);
  const didDrag       = useRef(false);
  const maxLift       = SCREEN_H * 0.5;

  const pan = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 8 && Math.abs(g.dy) > Math.abs(g.dx),
    onPanResponderGrant: () => { didDrag.current = false; translateY.stopAnimation((v) => { lastY.current = v; }); },
    onPanResponderMove: (_, g) => { didDrag.current = true; translateY.setValue(Math.min(0, Math.max(-maxLift, lastY.current + g.dy))); },
    onPanResponderRelease: (_, g) => {
      const clamped = Math.min(0, Math.max(-maxLift, lastY.current + g.dy));
      const snapped = clamped > -40 ? 0 : clamped;
      Animated.spring(translateY, { toValue: snapped, useNativeDriver: true, tension: 180, friction: 16 }).start(() => { lastY.current = snapped; });
    },
  })).current;

  return (
    <Animated.View style={[styles.outer, { bottom: defaultBottom, transform: [{ translateY }] }]} {...pan.panHandlers}>
      <View style={[styles.pill, isDark ? styles.pillDark : styles.pillLight]}>
        <BlurView intensity={isDark ? 65 : 50} tint={isDark ? "dark" : "extraLight"} style={StyleSheet.absoluteFill} />
        <LinearGradient colors={isDark ? ["rgba(255,255,255,0.08)", "rgba(255,255,255,0)"] : ["rgba(255,255,255,0.65)", "rgba(255,255,255,0)"]} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={styles.sheen} pointerEvents="none" />
        <View style={styles.handleRow} pointerEvents="none">
          <View style={[styles.handle, { backgroundColor: isDark ? "rgba(255,255,255,0.22)" : "rgba(0,0,0,0.15)" }]} />
        </View>
        <View style={styles.tabRow}>
          {tabs.map((tab, i) => (
            <TabButton key={tab.key} tab={tab} focused={i === activeIndex} onPress={() => { if (!didDrag.current) onTabPress(i); }} isDark={isDark} />
          ))}
        </View>
      </View>
    </Animated.View>
  );
}

const R = 34;
const styles = StyleSheet.create({
  outer:      { position: "absolute", left: 16, right: 16 },
  pill:       { borderRadius: R, overflow: "hidden", ...Platform.select({ ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 16 }, android: { elevation: 8 } }) },
  pillDark:   { borderWidth: StyleSheet.hairlineWidth, borderColor: "rgba(255,255,255,0.14)" },
  pillLight:  { borderWidth: StyleSheet.hairlineWidth, borderColor: "rgba(255,255,255,0.60)" },
  sheen:      { position: "absolute", left: 0, right: 0, top: 0, height: 32 },
  handleRow:  { alignItems: "center", paddingTop: 8, paddingBottom: 2 },
  handle:     { width: 36, height: 4, borderRadius: 2 },
  tabRow:     { flexDirection: "row", paddingHorizontal: 8, paddingTop: 4, paddingBottom: 10 },
  tabButton:  { flex: 1, alignItems: "center" },
  tabInner:   { alignItems: "center", paddingHorizontal: 8, paddingVertical: 6, minWidth: 52 },
  bubble:     { position: "absolute", inset: 0, borderRadius: 20, borderWidth: StyleSheet.hairlineWidth, overflow: "hidden" },
  iconWrap:   { width: 24, height: 24, alignItems: "center", justifyContent: "center" },
  label:      { fontSize: 10, fontWeight: "600", marginTop: 3, letterSpacing: 0.1 },
  labelFocused: { fontWeight: "800" },
});