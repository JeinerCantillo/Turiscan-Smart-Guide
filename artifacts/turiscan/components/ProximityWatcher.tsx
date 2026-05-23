import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Image,
  Platform,
  useColorScheme,
} from "react-native";
import { router, usePathname } from "expo-router";
import { Feather, Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Colors from "@/constants/colors";
import { useGetPlaces } from "@workspace/api-client-react";
import type { Place } from "@workspace/api-client-react";

const TRIGGER_METERS = 5;
const COOLDOWN_MS = 5 * 60 * 1000;
const AUTO_OPEN_SECS = 3;

function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(Δφ / 2) ** 2 +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function ProximityWatcher() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const pathname = usePathname();

  const { data: places } = useGetPlaces({});
  const placesRef = useRef<Place[]>([]);
  const watcherRef = useRef<Location.LocationSubscription | null>(null);
  const lastTriggered = useRef<Map<number, number>>(new Map());
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [nearbyPlace, setNearbyPlace] = useState<Place | null>(null);
  const [countdown, setCountdown] = useState(AUTO_OPEN_SECS);

  const slideAnim = useRef(new Animated.Value(-200)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (places) placesRef.current = places;
  }, [places]);

  // Don't trigger while already on a place detail screen
  const isOnPlaceScreen = pathname.startsWith("/place/") || pathname.startsWith("/scan-result");

  const dismissBanner = useCallback(() => {
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
    Animated.timing(slideAnim, {
      toValue: -200,
      duration: 300,
      useNativeDriver: true,
    }).start(() => setNearbyPlace(null));
  }, [slideAnim]);

  const openNow = useCallback((place: Place) => {
    dismissBanner();
    setTimeout(() => {
      router.push({ pathname: "/place/[id]", params: { id: String(place.id) } });
    }, 50);
  }, [dismissBanner]);

  const startCountdown = useCallback((place: Place) => {
    let sec = AUTO_OPEN_SECS;
    setCountdown(sec);
    countdownRef.current = setInterval(() => {
      sec -= 1;
      setCountdown(sec);
      if (sec <= 0) {
        if (countdownRef.current) clearInterval(countdownRef.current);
        openNow(place);
      }
    }, 1000);
  }, [openNow]);

  const triggerProximity = useCallback((place: Place) => {
    setNearbyPlace(place);
    setCountdown(AUTO_OPEN_SECS);

    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: true,
      tension: 55,
      friction: 9,
    }).start();

    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.15, duration: 700, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
      ])
    );
    pulse.start();
    setTimeout(() => pulse.stop(), 5000);

    startCountdown(place);
  }, [slideAnim, pulseAnim, startCountdown]);

  const handleLocationUpdate = useCallback((loc: Location.LocationObject) => {
    if (isOnPlaceScreen) return;
    const { latitude, longitude } = loc.coords;
    const list = placesRef.current;
    if (!list.length) return;

    for (const place of list) {
      const dist = haversineMeters(latitude, longitude, place.latitude, place.longitude);
      if (dist <= TRIGGER_METERS) {
        const now = Date.now();
        const last = lastTriggered.current.get(place.id) ?? 0;
        if (now - last < COOLDOWN_MS) continue;
        lastTriggered.current.set(place.id, now);
        triggerProximity(place);
        break;
      }
    }
  }, [isOnPlaceScreen, triggerProximity]);

  useEffect(() => {
    let active = true;

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted" || !active) return;

      const sub = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          distanceInterval: 1,
          timeInterval: 2000,
        },
        handleLocationUpdate
      );
      watcherRef.current = sub;
    })();

    return () => {
      active = false;
      watcherRef.current?.remove();
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, []);

  // Re-create watcher callback binding when handleLocationUpdate changes
  // (due to isOnPlaceScreen changes). Watcher still runs; just the handler ref is fresh.

  if (!nearbyPlace) return null;

  return (
    <Animated.View
      style={[
        styles.banner,
        {
          top: insets.top + (Platform.OS === "web" ? 67 : 0) + 8,
          backgroundColor: colors.backgroundCard,
          borderColor: colors.tint,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      {/* Left: animated GPS icon */}
      <Animated.View
        style={[
          styles.pingCircle,
          { backgroundColor: `${colors.tint}22`, transform: [{ scale: pulseAnim }] },
        ]}
      >
        <View style={[styles.pingInner, { backgroundColor: colors.tint }]}>
          <Ionicons name="location" size={20} color="#fff" />
        </View>
      </Animated.View>

      {/* Center: place info */}
      <View style={styles.bannerContent}>
        <View style={styles.bannerRow}>
          <View style={[styles.badgeChip, { backgroundColor: `${colors.tint}18` }]}>
            <Feather name="map-pin" size={10} color={colors.tint} />
            <Text style={[styles.badgeText, { color: colors.tint }]}>Llegaste</Text>
          </View>
        </View>
        <Text style={[styles.bannerTitle, { color: colors.text }]} numberOfLines={1}>
          {nearbyPlace.name}
        </Text>
        <Text style={[styles.bannerSub, { color: colors.textMuted }]}>
          Abriendo información en {countdown}s...
        </Text>
      </View>

      {/* Right: image */}
      {nearbyPlace.imageUrl ? (
        <Image source={{ uri: nearbyPlace.imageUrl }} style={styles.bannerThumb} resizeMode="cover" />
      ) : (
        <View style={[styles.bannerThumb, { backgroundColor: `${colors.tint}18`, alignItems: "center", justifyContent: "center" }]}>
          <Feather name="map-pin" size={22} color={colors.tint} />
        </View>
      )}

      {/* Bottom row: actions */}
      <View style={styles.bannerActions}>
        <TouchableOpacity
          style={[styles.btnOpen, { backgroundColor: colors.tint }]}
          onPress={() => openNow(nearbyPlace)}
          activeOpacity={0.85}
        >
          <Text style={styles.btnOpenText}>Ver ahora</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.btnDismiss, { borderColor: colors.border }]}
          onPress={dismissBanner}
          activeOpacity={0.8}
        >
          <Text style={[styles.btnDismissText, { color: colors.textMuted }]}>Cerrar</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: "absolute",
    left: 16,
    right: 16,
    borderRadius: 20,
    borderWidth: 1.5,
    padding: 14,
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "flex-start",
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 16,
    zIndex: 9999,
  },
  pingCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  pingInner: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  bannerContent: { flex: 1, gap: 3 },
  bannerRow: { flexDirection: "row", alignItems: "center" },
  badgeChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeText: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  bannerTitle: { fontSize: 15, fontFamily: "Inter_700Bold", marginTop: 2 },
  bannerSub: { fontSize: 12, fontFamily: "Inter_400Regular" },
  bannerThumb: { width: 56, height: 56, borderRadius: 12 },
  bannerActions: {
    width: "100%",
    flexDirection: "row",
    gap: 10,
    marginTop: 2,
  },
  btnOpen: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: "center",
  },
  btnOpenText: { color: "#fff", fontSize: 13, fontFamily: "Inter_600SemiBold" },
  btnDismiss: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
  },
  btnDismissText: { fontSize: 13, fontFamily: "Inter_500Medium" },
});
