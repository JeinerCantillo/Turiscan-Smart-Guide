import React, { useRef, useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  useColorScheme,
} from "react-native";
import Colors from "@/constants/colors";

interface GuideAvatarProps {
  message?: string;
  name?: string;
  autoAnimate?: boolean;
}

export function GuideAvatar({ message, name = "Guía Turístico", autoAnimate = true }: GuideAvatarProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = isDark ? Colors.dark : Colors.light;

  const bounceAnim = useRef(new Animated.Value(0)).current;
  const waveAnim = useRef(new Animated.Value(0)).current;
  const bubbleAnim = useRef(new Animated.Value(0)).current;
  const [showBubble, setShowBubble] = useState(!!message);

  useEffect(() => {
    if (autoAnimate) {
      const bounce = Animated.loop(
        Animated.sequence([
          Animated.timing(bounceAnim, { toValue: -6, duration: 800, useNativeDriver: true }),
          Animated.timing(bounceAnim, { toValue: 0, duration: 800, useNativeDriver: true }),
        ])
      );
      bounce.start();

      const wave = Animated.loop(
        Animated.sequence([
          Animated.timing(waveAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
          Animated.timing(waveAnim, { toValue: -1, duration: 400, useNativeDriver: true }),
          Animated.timing(waveAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
          Animated.delay(2000),
        ])
      );
      setTimeout(() => wave.start(), 1000);

      return () => {
        bounce.stop();
        wave.stop();
      };
    }
  }, [autoAnimate]);

  useEffect(() => {
    if (showBubble) {
      Animated.spring(bubbleAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 80,
        friction: 8,
      }).start();
    } else {
      Animated.timing(bubbleAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [showBubble]);

  const waveRotate = waveAnim.interpolate({
    inputRange: [-1, 1],
    outputRange: ["-20deg", "20deg"],
  });

  const handlePress = () => {
    if (message) setShowBubble(!showBubble);
  };

  return (
    <View style={styles.wrapper}>
      {/* Speech bubble */}
      {message && (
        <Animated.View
          style={[
            styles.bubble,
            {
              backgroundColor: colors.backgroundCard,
              borderColor: colors.border,
              shadowColor: colors.shadow,
              transform: [
                { scale: bubbleAnim },
                { translateY: bubbleAnim.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) },
              ],
              opacity: bubbleAnim,
            },
          ]}
        >
          <Text style={[styles.bubbleText, { color: colors.text }]}>{message}</Text>
          <View style={[styles.bubbleTail, { borderTopColor: colors.backgroundCard }]} />
        </Animated.View>
      )}

      {/* Avatar */}
      <TouchableOpacity onPress={handlePress} activeOpacity={0.8}>
        <Animated.View style={[styles.avatarContainer, { transform: [{ translateY: bounceAnim }] }]}>
          {/* Hat */}
          <Animated.View style={[styles.hat, { backgroundColor: colors.accent, transform: [{ rotate: waveRotate }] }]}>
            <View style={[styles.hatBrim, { backgroundColor: colors.accentDark }]} />
          </Animated.View>

          {/* Face circle */}
          <View style={[styles.face, { backgroundColor: colors.tint, borderColor: `${colors.tint}40` }]}>
            {/* Eyes */}
            <View style={styles.eyes}>
              <View style={[styles.eye, { backgroundColor: "#fff" }]} />
              <View style={[styles.eye, { backgroundColor: "#fff" }]} />
            </View>
            {/* Smile */}
            <View style={[styles.smile, { borderColor: "#fff" }]} />
          </View>

          {/* Compass badge */}
          <View style={[styles.badge, { backgroundColor: colors.accent }]}>
            <Text style={styles.badgeEmoji}>🧭</Text>
          </View>
        </Animated.View>
      </TouchableOpacity>

      <Text style={[styles.guideName, { color: colors.textSecondary }]}>{name}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { alignItems: "center", gap: 4 },
  bubble: {
    position: "absolute",
    bottom: 90,
    left: -60,
    right: -60,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 4,
    zIndex: 10,
    minWidth: 160,
  },
  bubbleText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    lineHeight: 17,
    textAlign: "center",
  },
  bubbleTail: {
    position: "absolute",
    bottom: -8,
    left: "50%",
    marginLeft: -8,
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderTopWidth: 8,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
  },
  avatarContainer: { alignItems: "center", position: "relative" },
  hat: {
    width: 44,
    height: 14,
    borderRadius: 4,
    alignItems: "center",
    justifyContent: "flex-end",
    marginBottom: -4,
    zIndex: 2,
  },
  hatBrim: { width: 52, height: 5, borderRadius: 3 },
  face: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    gap: 4,
  },
  eyes: { flexDirection: "row", gap: 8, marginTop: 4 },
  eye: { width: 7, height: 7, borderRadius: 4 },
  smile: {
    width: 18,
    height: 9,
    borderBottomWidth: 2,
    borderRadius: 9,
    marginTop: 2,
  },
  badge: {
    position: "absolute",
    bottom: -6,
    right: -6,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeEmoji: { fontSize: 12 },
  guideName: { fontSize: 11, fontFamily: "Inter_500Medium", marginTop: 2 },
});
