import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  ActivityIndicator,
  useColorScheme,
  Platform,
  Dimensions,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Feather, Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import * as Speech from "expo-speech";

import Colors from "@/constants/colors";
import { GuideAvatar } from "@/components/GuideAvatar";
import { incrementStat } from "./(tabs)/logros";

const BASE_URL = `https://${process.env.EXPO_PUBLIC_DOMAIN}`;
const { width } = Dimensions.get("window");

interface PlaceSummary {
  id: number;
  name: string;
  shortDescription: string;
  category: string;
  video360Url?: string | null;
  history?: string;
}

export default function ScanResultScreen() {
  const { qrCode } = useLocalSearchParams<{ qrCode: string }>();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();

  const [place, setPlace] = useState<PlaceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const containerAnim = useRef(new Animated.Value(0)).current;
  const buttonsAnim = useRef(new Animated.Value(40)).current;
  const buttonsOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!qrCode) { setNotFound(true); setLoading(false); return; }
    fetchPlace(qrCode);
  }, [qrCode]);

  useEffect(() => {
    if (!loading && place) {
      Animated.parallel([
        Animated.spring(containerAnim, { toValue: 1, useNativeDriver: true, tension: 60, friction: 8 }),
        Animated.timing(buttonsAnim, { toValue: 0, duration: 400, delay: 300, useNativeDriver: true }),
        Animated.timing(buttonsOpacity, { toValue: 1, duration: 400, delay: 300, useNativeDriver: true }),
      ]).start();
      // Track scan in achievements
      incrementStat("scansCount");
      if (place.id) incrementStat("placesVisited", place.id);
    }
  }, [loading, place]);

  const fetchPlace = async (code: string) => {
    try {
      const res = await fetch(`${BASE_URL}/api/places/qr/${encodeURIComponent(code)}`);
      if (res.ok) {
        const data = await res.json();
        setPlace(data);
      } else {
        setNotFound(true);
      }
    } catch {
      setNotFound(true);
    }
    setLoading(false);
  };

  const handleListenHistory = async () => {
    if (!place) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    // Navigate to place detail with autoSpeak flag
    router.replace({ pathname: "/place/[id]", params: { id: String(place.id), autoSpeak: "1" } });
  };

  const handleWatch360 = () => {
    if (!place) return;
    if (!place.video360Url) {
      router.replace({ pathname: "/place/[id]", params: { id: String(place.id) } });
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    incrementStat("vrVideosWatched");
    router.replace({ pathname: "/vr/[id]", params: { id: String(place.id) } });
  };

  const handleViewDetails = () => {
    if (!place) return;
    router.replace({ pathname: "/place/[id]", params: { id: String(place.id) } });
  };

  const handleClose = () => {
    router.replace("/(tabs)");
  };

  const avatarScale = containerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.5, 1],
  });

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContent}>
          <GuideAvatar autoAnimate size={100} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Identificando lugar...</Text>
          <ActivityIndicator color={colors.tint} style={{ marginTop: 8 }} />
        </View>
      </View>
    );
  }

  if (notFound || !place) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.card, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}>
          <GuideAvatar
            message="¡Ups! No encontré ese lugar. ¿Lo intento de nuevo?"
            size={100}
            showBubbleOnMount
          />
          <Text style={[styles.notFoundTitle, { color: colors.text }]}>QR no reconocido</Text>
          <Text style={[styles.notFoundDesc, { color: colors.textSecondary }]}>
            No se encontró ningún lugar turístico asociado a este código QR.
          </Text>
          <TouchableOpacity style={[styles.retryBtn, { backgroundColor: colors.tint }]} onPress={() => router.replace("/scanner")}>
            <Feather name="camera" size={16} color="#fff" />
            <Text style={styles.retryBtnText}>Escanear de nuevo</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleClose} style={styles.backLink}>
            <Text style={[styles.backLinkText, { color: colors.textMuted }]}>Volver al inicio</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <TouchableOpacity style={[styles.closeBtn, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 0) + 8 }]} onPress={handleClose}>
        <Feather name="x" size={22} color={colors.textMuted} />
      </TouchableOpacity>

      <Animated.View style={[styles.content, { transform: [{ scale: avatarScale }] }]}>
        {/* Avatar */}
        <GuideAvatar
          message={`¡Encontré "${place.name}"! ¿Qué quieres hacer?`}
          size={120}
          autoAnimate
          showBubbleOnMount
        />

        {/* Place name */}
        <Text style={[styles.placeCategory, { color: colors.tint }]}>{place.category}</Text>
        <Text style={[styles.placeName, { color: colors.text }]}>{place.name}</Text>
        <Text style={[styles.placeDesc, { color: colors.textSecondary }]} numberOfLines={2}>
          {place.shortDescription}
        </Text>
      </Animated.View>

      {/* Action buttons */}
      <Animated.View
        style={[
          styles.buttonsContainer,
          {
            transform: [{ translateY: buttonsAnim }],
            opacity: buttonsOpacity,
            paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) + 16,
          },
        ]}
      >
        {/* Listen to history */}
        <TouchableOpacity
          style={[styles.actionBtnLarge, { backgroundColor: colors.tint }]}
          onPress={handleListenHistory}
          activeOpacity={0.85}
        >
          <View style={[styles.actionBtnIcon, { backgroundColor: "rgba(255,255,255,0.2)" }]}>
            <Ionicons name="volume-high" size={28} color="#fff" />
          </View>
          <View style={styles.actionBtnText}>
            <Text style={styles.actionBtnTitle}>Escuchar la historia</Text>
            <Text style={styles.actionBtnSub}>Narración de audio del lugar</Text>
          </View>
          <Feather name="chevron-right" size={18} color="rgba(255,255,255,0.7)" />
        </TouchableOpacity>

        {/* Watch 360° */}
        <TouchableOpacity
          style={[
            styles.actionBtnLarge,
            {
              backgroundColor: place.video360Url ? "#0D1B2A" : colors.backgroundCard,
              borderColor: colors.border,
              borderWidth: place.video360Url ? 0 : 1,
              opacity: place.video360Url ? 1 : 0.6,
            },
          ]}
          onPress={handleWatch360}
          activeOpacity={0.85}
        >
          <View style={[styles.actionBtnIcon, { backgroundColor: "rgba(26,95,122,0.5)" }]}>
            <Ionicons name="glasses" size={28} color={place.video360Url ? "#fff" : colors.textMuted} />
          </View>
          <View style={styles.actionBtnText}>
            <Text style={[styles.actionBtnTitle, { color: place.video360Url ? "#fff" : colors.text }]}>
              Ver en 360°
            </Text>
            <Text style={[styles.actionBtnSub, { color: place.video360Url ? "rgba(255,255,255,0.7)" : colors.textMuted }]}>
              {place.video360Url ? "Experiencia de video inmersivo" : "Video no disponible aún"}
            </Text>
          </View>
          <Feather name="chevron-right" size={18} color={place.video360Url ? "rgba(255,255,255,0.7)" : colors.textMuted} />
        </TouchableOpacity>

        {/* View full details */}
        <TouchableOpacity
          style={[styles.detailsBtn, { borderColor: colors.border }]}
          onPress={handleViewDetails}
          activeOpacity={0.8}
        >
          <Feather name="info" size={16} color={colors.textSecondary} />
          <Text style={[styles.detailsBtnText, { color: colors.textSecondary }]}>Ver todos los detalles</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "space-between" },
  closeBtn: {
    position: "absolute",
    top: 0,
    right: 16,
    zIndex: 10,
    padding: 8,
  },
  loadingContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  loadingText: { fontSize: 15, fontFamily: "Inter_400Regular" },
  card: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    margin: 24,
    borderRadius: 24,
    padding: 32,
    borderWidth: 1,
    gap: 12,
  },
  notFoundTitle: { fontSize: 22, fontFamily: "Inter_700Bold", textAlign: "center" },
  notFoundDesc: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20 },
  retryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 13,
    borderRadius: 14,
    marginTop: 8,
  },
  retryBtnText: { color: "#fff", fontSize: 15, fontFamily: "Inter_600SemiBold" },
  backLink: { padding: 12 },
  backLinkText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingTop: 80,
    gap: 8,
  },
  placeCategory: { fontSize: 12, fontFamily: "Inter_600SemiBold", textTransform: "uppercase", letterSpacing: 1, marginTop: 16 },
  placeName: { fontSize: 26, fontFamily: "Inter_700Bold", textAlign: "center", lineHeight: 33 },
  placeDesc: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20 },
  buttonsContainer: {
    paddingHorizontal: 20,
    gap: 12,
  },
  actionBtnLarge: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 18,
    padding: 16,
    gap: 14,
  },
  actionBtnIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
  },
  actionBtnText: { flex: 1 },
  actionBtnTitle: { color: "#fff", fontSize: 16, fontFamily: "Inter_700Bold" },
  actionBtnSub: { color: "rgba(255,255,255,0.7)", fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  detailsBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  detailsBtnText: { fontSize: 14, fontFamily: "Inter_500Medium" },
});
