import React, { useRef, useEffect, useState } from "react";
import { Animated, TouchableOpacity, View, Text, StyleSheet, useColorScheme } from "react-native";
import Svg, {
  Circle, Ellipse, Path, Rect, Defs, LinearGradient, Stop,
} from "react-native-svg";
import Colors from "@/constants/colors";

interface AvatarSvgProps { size: number; uid: string; }

export function AvatarSvg({ size, uid }: AvatarSvgProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <LinearGradient id={`${uid}bg`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#2E86AB" />
          <Stop offset="1" stopColor="#1A5F7A" />
        </LinearGradient>
        <LinearGradient id={`${uid}fc`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#F5C48A" />
          <Stop offset="1" stopColor="#E0A87A" />
        </LinearGradient>
        <LinearGradient id={`${uid}sh`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#1D7099" />
          <Stop offset="1" stopColor="#155070" />
        </LinearGradient>
      </Defs>

      {/* Background */}
      <Circle cx="50" cy="50" r="50" fill={`url(#${uid}bg)`} />
      {/* Gold border */}
      <Circle cx="50" cy="50" r="46" fill="none" stroke="#F4D03F" strokeWidth="3" />

      {/* Shirt */}
      <Path d="M 20 100 L 25 75 Q 50 67 75 75 L 80 100 Z" fill={`url(#${uid}sh)`} />
      <Path d="M 38 75 L 50 85 L 62 75" stroke="rgba(255,255,255,0.45)" strokeWidth="1.8" fill="rgba(255,255,255,0.08)" />

      {/* Neck */}
      <Rect x="44" y="67" width="12" height="10" rx="4" fill="#F5C48A" />

      {/* Ears */}
      <Ellipse cx="28" cy="53" rx="3.5" ry="4.5" fill="#E0A87A" />
      <Ellipse cx="72" cy="53" rx="3.5" ry="4.5" fill="#E0A87A" />
      <Ellipse cx="28" cy="53" rx="2" ry="3" fill="#D0946A" />
      <Ellipse cx="72" cy="53" rx="2" ry="3" fill="#D0946A" />

      {/* Head */}
      <Ellipse cx="50" cy="53" rx="22" ry="23" fill={`url(#${uid}fc)`} />

      {/* === SOMBRERO VUELTIAO === */}
      {/* Brim */}
      <Ellipse cx="50" cy="32" rx="30" ry="6" fill="#0D3F54" />
      {/* Brim highlight */}
      <Ellipse cx="50" cy="30.5" rx="30" ry="3.5" fill="#1A5F7A" opacity="0.4" />
      {/* Crown */}
      <Rect x="33" y="9" width="34" height="25" rx="5" fill="#0D3F54" />
      {/* Checker pattern (vueltiao weave) */}
      <Rect x="34" y="10" width="5" height="5" fill="#1A5F7A" opacity="0.6" />
      <Rect x="44" y="10" width="5" height="5" fill="#1A5F7A" opacity="0.6" />
      <Rect x="54" y="10" width="5" height="5" fill="#1A5F7A" opacity="0.6" />
      <Rect x="39" y="15" width="5" height="5" fill="#1A5F7A" opacity="0.6" />
      <Rect x="49" y="15" width="5" height="5" fill="#1A5F7A" opacity="0.6" />
      <Rect x="59" y="15" width="5" height="5" fill="#1A5F7A" opacity="0.6" />
      <Rect x="34" y="20" width="5" height="5" fill="#1A5F7A" opacity="0.6" />
      <Rect x="44" y="20" width="5" height="5" fill="#1A5F7A" opacity="0.6" />
      <Rect x="54" y="20" width="5" height="5" fill="#1A5F7A" opacity="0.6" />
      {/* Gold band */}
      <Rect x="28" y="27" width="44" height="7" rx="2.5" fill="#F4D03F" />
      <Rect x="28" y="27" width="44" height="3" rx="2.5" fill="#F7DC6F" opacity="0.5" />

      {/* === FACE FEATURES === */}
      {/* Eye whites */}
      <Ellipse cx="43" cy="51" rx="5" ry="4.5" fill="#fff" />
      <Ellipse cx="57" cy="51" rx="5" ry="4.5" fill="#fff" />
      {/* Irises */}
      <Circle cx="43.5" cy="51" r="3" fill="#3E2000" />
      <Circle cx="57.5" cy="51" r="3" fill="#3E2000" />
      {/* Pupils */}
      <Circle cx="43.5" cy="51" r="1.6" fill="#100800" />
      <Circle cx="57.5" cy="51" r="1.6" fill="#100800" />
      {/* Eye shine */}
      <Circle cx="44.6" cy="49.6" r="1" fill="#fff" />
      <Circle cx="58.6" cy="49.6" r="1" fill="#fff" />

      {/* Eyebrows */}
      <Path d="M 38.5 46 Q 43 43.5 47.5 46" stroke="#5D3A1A" strokeWidth="2" fill="none" strokeLinecap="round" />
      <Path d="M 52.5 46 Q 57 43.5 61.5 46" stroke="#5D3A1A" strokeWidth="2" fill="none" strokeLinecap="round" />

      {/* Nose */}
      <Path d="M 47.5 55 Q 50 59.5 52.5 55" stroke="#C07848" strokeWidth="1.6" fill="none" strokeLinecap="round" />

      {/* Smile */}
      <Path d="M 42 62 Q 50 70 58 62" stroke="#B06838" strokeWidth="2.8" fill="none" strokeLinecap="round" />

      {/* Cheeks */}
      <Ellipse cx="38" cy="60" rx="5.5" ry="3.2" fill="#E06040" opacity="0.3" />
      <Ellipse cx="62" cy="60" rx="5.5" ry="3.2" fill="#E06040" opacity="0.3" />

      {/* Compass badge on shirt */}
      <Circle cx="50" cy="92" r="5.5" fill="rgba(255,255,255,0.12)" stroke="#F4D03F" strokeWidth="1.2" />
      <Path d="M 50 87.5 L 51.5 92 L 50 96.5 L 48.5 92 Z" fill="#F4D03F" />
      <Path d="M 45.5 92 L 50 90.5 L 54.5 92 L 50 93.5 Z" fill="rgba(255,255,255,0.75)" />
      <Circle cx="50" cy="92" r="1.2" fill="#fff" />
    </Svg>
  );
}

interface GuideAvatarProps {
  message?: string;
  size?: number;
  autoAnimate?: boolean;
  showBubbleOnMount?: boolean;
}

export function GuideAvatar({
  message,
  size = 72,
  autoAnimate = true,
  showBubbleOnMount = true,
}: GuideAvatarProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = isDark ? Colors.dark : Colors.light;
  const uid = useRef(`av_${Math.random().toString(36).slice(2, 7)}`).current;

  const bounceAnim = useRef(new Animated.Value(0)).current;
  const bubbleAnim = useRef(new Animated.Value(0)).current;
  const [showBubble, setShowBubble] = useState(!!message && showBubbleOnMount);

  useEffect(() => {
    if (!autoAnimate) return;
    const bounce = Animated.loop(
      Animated.sequence([
        Animated.timing(bounceAnim, { toValue: -7, duration: 950, useNativeDriver: true }),
        Animated.timing(bounceAnim, { toValue: 0, duration: 950, useNativeDriver: true }),
      ])
    );
    bounce.start();
    return () => bounce.stop();
  }, [autoAnimate]);

  useEffect(() => {
    if (showBubble) {
      Animated.spring(bubbleAnim, { toValue: 1, useNativeDriver: true, tension: 80, friction: 8 }).start();
    } else {
      Animated.timing(bubbleAnim, { toValue: 0, duration: 160, useNativeDriver: true }).start();
    }
  }, [showBubble]);

  return (
    <View style={styles.wrapper}>
      {message && (
        <Animated.View
          style={[
            styles.bubble,
            {
              backgroundColor: colors.backgroundCard,
              borderColor: colors.border,
              transform: [
                { scale: bubbleAnim },
                { translateY: bubbleAnim.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) },
              ],
              opacity: bubbleAnim,
            },
          ]}
        >
          <Text style={[styles.bubbleText, { color: colors.text }]}>{message}</Text>
          <View style={[styles.bubbleTail, { borderTopColor: colors.backgroundCard }]} />
        </Animated.View>
      )}
      <TouchableOpacity onPress={() => message && setShowBubble((v) => !v)} activeOpacity={0.85}>
        <Animated.View style={{ transform: [{ translateY: bounceAnim }] }}>
          <AvatarSvg size={size} uid={uid} />
        </Animated.View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { alignItems: "center" },
  bubble: {
    position: "absolute",
    bottom: "100%",
    marginBottom: 6,
    left: -50,
    right: -50,
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
    zIndex: 20,
  },
  bubbleText: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 16, textAlign: "center" },
  bubbleTail: {
    position: "absolute", bottom: -7, left: "50%", marginLeft: -7,
    width: 0, height: 0,
    borderLeftWidth: 7, borderRightWidth: 7, borderTopWidth: 7,
    borderLeftColor: "transparent", borderRightColor: "transparent",
  },
});
