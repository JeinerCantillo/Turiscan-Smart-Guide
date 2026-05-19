import React, { useRef, useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Image,
  useColorScheme,
} from "react-native";
import Colors from "@/constants/colors";

const avatarImg = require("@/assets/avatar-cienaga.png");

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

  const bounceAnim = useRef(new Animated.Value(0)).current;
  const bubbleAnim = useRef(new Animated.Value(0)).current;
  const [showBubble, setShowBubble] = useState(!!message && showBubbleOnMount);

  useEffect(() => {
    if (!autoAnimate) return;
    const bounce = Animated.loop(
      Animated.sequence([
        Animated.timing(bounceAnim, { toValue: -7, duration: 900, useNativeDriver: true }),
        Animated.timing(bounceAnim, { toValue: 0, duration: 900, useNativeDriver: true }),
      ])
    );
    bounce.start();
    return () => bounce.stop();
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
      Animated.timing(bubbleAnim, { toValue: 0, duration: 180, useNativeDriver: true }).start();
    }
  }, [showBubble]);

  const handlePress = () => {
    if (message) setShowBubble((v) => !v);
  };

  return (
    <View style={styles.wrapper}>
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
                {
                  translateY: bubbleAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [8, 0],
                  }),
                },
              ],
              opacity: bubbleAnim,
            },
          ]}
        >
          <Text style={[styles.bubbleText, { color: colors.text }]}>{message}</Text>
          <View style={[styles.bubbleTail, { borderTopColor: colors.backgroundCard }]} />
        </Animated.View>
      )}
      <TouchableOpacity onPress={handlePress} activeOpacity={0.85}>
        <Animated.View style={{ transform: [{ translateY: bounceAnim }] }}>
          <Image
            source={avatarImg}
            style={[styles.avatar, { width: size, height: size }]}
            resizeMode="contain"
          />
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
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 4,
    zIndex: 20,
  },
  bubbleText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    lineHeight: 16,
    textAlign: "center",
  },
  bubbleTail: {
    position: "absolute",
    bottom: -7,
    left: "50%",
    marginLeft: -7,
    width: 0,
    height: 0,
    borderLeftWidth: 7,
    borderRightWidth: 7,
    borderTopWidth: 7,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
  },
  avatar: {
    borderRadius: 8,
  },
});
