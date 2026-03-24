import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  useColorScheme,
  Platform,
  Dimensions,
  ActivityIndicator,
  Animated,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Feather, Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import * as Speech from "expo-speech";

import Colors from "@/constants/colors";
import { TuriscanMap } from "@/components/TuriscanMap";
import { useGetPlaceById, useGetPlaceByQrCode } from "@workspace/api-client-react";

const { width, height } = Dimensions.get("window");
const IMAGE_HEIGHT = height * 0.42;

const CATEGORY_ICONS: Record<string, string> = {
  Plaza: "map",
  Religioso: "activity",
  Natural: "sunset",
  Patrimonio: "archive",
  Cultural: "book-open",
};

export default function PlaceDetailScreen() {
  const { id, qrCode } = useLocalSearchParams<{ id: string; qrCode?: string }>();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();

  const [isSpeaking, setIsSpeaking] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const scrollY = useRef(new Animated.Value(0)).current;
  const speakAnim = useRef(new Animated.Value(1)).current;

  const isQrMode = id === "qr" && !!qrCode;

  const {
    data: placeById,
    isLoading: loadingById,
    isError: errorById,
  } = useGetPlaceById(Number(id), { query: { enabled: !isQrMode && !isNaN(Number(id)) } });

  const {
    data: placeByQr,
    isLoading: loadingByQr,
    isError: errorByQr,
  } = useGetPlaceByQrCode(qrCode ?? "", { query: { enabled: isQrMode && !!qrCode } });

  const place = isQrMode ? placeByQr : placeById;
  const isLoading = isQrMode ? loadingByQr : loadingById;
  const isError = isQrMode ? errorByQr : errorById;

  const headerOpacity = scrollY.interpolate({
    inputRange: [IMAGE_HEIGHT - 120, IMAGE_HEIGHT - 60],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });

  useEffect(() => {
    return () => {
      Speech.stop();
    };
  }, []);

  useEffect(() => {
    if (isSpeaking) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(speakAnim, { toValue: 1.12, duration: 600, useNativeDriver: true }),
          Animated.timing(speakAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    } else {
      speakAnim.setValue(1);
    }
  }, [isSpeaking]);

  const handleSpeak = async () => {
    if (!place) return;

    if (isSpeaking) {
      Speech.stop();
      setIsSpeaking(false);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsSpeaking(true);

    const textToRead = `${place.name}. ${place.shortDescription}. ${place.history}`;

    Speech.speak(textToRead, {
      language: "es-CO",
      rate: 0.9,
      pitch: 1.0,
      onDone: () => setIsSpeaking(false),
      onStopped: () => setIsSpeaking(false),
      onError: () => setIsSpeaking(false),
    });
  };

  const handleBack = () => {
    Speech.stop();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

  const handleScanAnother = () => {
    Speech.stop();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.replace("/scanner");
  };

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.tint} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
          {isQrMode ? "Identificando lugar..." : "Cargando información..."}
        </Text>
      </View>
    );
  }

  if (isError || !place) {
    return (
      <View style={[styles.errorContainer, { backgroundColor: colors.background }]}>
        <Ionicons name="qr-code-outline" size={64} color={colors.textMuted} />
        <Text style={[styles.errorTitle, { color: colors.text }]}>
          {isQrMode ? "Código QR no reconocido" : "Lugar no encontrado"}
        </Text>
        <Text style={[styles.errorDesc, { color: colors.textSecondary }]}>
          {isQrMode
            ? `No se encontró ningún lugar turístico asociado al código: ${qrCode}`
            : "No se encontró información de este lugar."}
        </Text>
        <TouchableOpacity
          style={[styles.errorBtn, { backgroundColor: colors.tint }]}
          onPress={handleBack}
        >
          <Text style={styles.errorBtnText}>Volver</Text>
        </TouchableOpacity>
        {isQrMode && (
          <TouchableOpacity style={styles.scanAgainBtn} onPress={handleScanAnother}>
            <Feather name="camera" size={16} color={colors.tint} />
            <Text style={[styles.scanAgainText, { color: colors.tint }]}>Escanear otro QR</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  const iconName = CATEGORY_ICONS[place.category] || "map-pin";

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Floating animated header */}
      <Animated.View
        style={[
          styles.floatingHeader,
          {
            opacity: headerOpacity,
            backgroundColor: colors.backgroundSecondary,
            paddingTop: insets.top,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <View style={styles.floatingHeaderContent}>
          <TouchableOpacity onPress={handleBack} style={styles.floatingBackBtn}>
            <Feather name="chevron-left" size={22} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.floatingHeaderTitle, { color: colors.text }]} numberOfLines={1}>
            {place.name}
          </Text>
          <View style={{ width: 36 }} />
        </View>
      </Animated.View>

      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) + 60 }}
      >
        {/* Hero Image */}
        <View style={[styles.heroContainer, { height: IMAGE_HEIGHT }]}>
          {place.imageUrl ? (
            <Image
              source={{ uri: place.imageUrl }}
              style={styles.heroImage}
              resizeMode="cover"
              onLoad={() => setImageLoaded(true)}
            />
          ) : (
            <View style={[styles.heroImagePlaceholder, { backgroundColor: colors.backgroundSecondary }]}>
              <Feather name={iconName as any} size={64} color={colors.textMuted} />
            </View>
          )}
          {/* Gradient overlay at bottom */}
          <View style={[styles.heroGradient, { backgroundColor: isDark ? "rgba(14,26,20,0)" : "rgba(247,245,240,0)" }]} />

          {/* Back button over image */}
          <View style={[styles.imageTopControls, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 0) + 8 }]}>
            <TouchableOpacity onPress={handleBack} style={styles.imageBackBtn}>
              <Feather name="chevron-left" size={22} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* Category badge */}
          <View style={styles.heroBadgeContainer}>
            <View style={[styles.heroBadge, { backgroundColor: colors.tint }]}>
              <Feather name={iconName as any} size={12} color="#fff" />
              <Text style={styles.heroBadgeText}>{place.category}</Text>
            </View>
            <View style={[styles.heroCityBadge, { backgroundColor: "rgba(0,0,0,0.5)" }]}>
              <Feather name="map-pin" size={12} color="#fff" />
              <Text style={styles.heroCityText}>{place.cityName}</Text>
            </View>
          </View>
        </View>

        {/* Content */}
        <View style={styles.content}>
          {/* Title and narration button */}
          <View style={styles.titleRow}>
            <Text style={[styles.placeName, { color: colors.text }]} numberOfLines={3}>
              {place.name}
            </Text>
            <Animated.View style={{ transform: [{ scale: speakAnim }] }}>
              <TouchableOpacity
                onPress={handleSpeak}
                style={[
                  styles.speakBtn,
                  {
                    backgroundColor: isSpeaking ? colors.tint : `${colors.tint}18`,
                  },
                ]}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={isSpeaking ? "pause" : "volume-high"}
                  size={22}
                  color={isSpeaking ? "#fff" : colors.tint}
                />
              </TouchableOpacity>
            </Animated.View>
          </View>

          {/* Short description */}
          <Text style={[styles.shortDesc, { color: colors.textSecondary }]}>
            {place.shortDescription}
          </Text>

          {/* Voice narration card */}
          <TouchableOpacity
            onPress={handleSpeak}
            style={[
              styles.narrateCard,
              {
                backgroundColor: isSpeaking ? colors.tint : `${colors.tint}12`,
                borderColor: isSpeaking ? colors.tint : `${colors.tint}30`,
              },
            ]}
            activeOpacity={0.85}
          >
            <Ionicons
              name={isSpeaking ? "pause-circle" : "play-circle"}
              size={32}
              color={isSpeaking ? "#fff" : colors.tint}
            />
            <View style={{ flex: 1 }}>
              <Text style={[styles.narrateTitle, { color: isSpeaking ? "#fff" : colors.tint }]}>
                {isSpeaking ? "Pausar narración" : "Escuchar narración"}
              </Text>
              <Text style={[styles.narrateSubtitle, { color: isSpeaking ? "rgba(255,255,255,0.8)" : colors.textMuted }]}>
                {isSpeaking ? "Narrando la historia del lugar..." : "Toca para escuchar la historia narrada"}
              </Text>
            </View>
          </TouchableOpacity>

          {/* Visit info */}
          {(place.visitHours || place.visitDuration) && (
            <View style={[styles.visitInfoRow]}>
              {place.visitHours && (
                <View style={[styles.visitInfoItem, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}>
                  <Feather name="clock" size={16} color={colors.tint} />
                  <View>
                    <Text style={[styles.visitInfoLabel, { color: colors.textMuted }]}>Horario</Text>
                    <Text style={[styles.visitInfoValue, { color: colors.text }]}>{place.visitHours}</Text>
                  </View>
                </View>
              )}
              {place.visitDuration && (
                <View style={[styles.visitInfoItem, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}>
                  <Feather name="navigation" size={16} color={colors.tint} />
                  <View>
                    <Text style={[styles.visitInfoLabel, { color: colors.textMuted }]}>Duración</Text>
                    <Text style={[styles.visitInfoValue, { color: colors.text }]}>{place.visitDuration}</Text>
                  </View>
                </View>
              )}
            </View>
          )}

          {/* History */}
          <View style={styles.historySection}>
            <View style={styles.historySectionHeader}>
              <View style={[styles.historyDot, { backgroundColor: colors.tint }]} />
              <Text style={[styles.historySectionTitle, { color: colors.text }]}>Historia del lugar</Text>
            </View>
            <Text style={[styles.historyText, { color: colors.textSecondary }]}>
              {place.history}
            </Text>
          </View>

          {/* Map */}
          <View style={styles.mapSection}>
            <View style={styles.historySectionHeader}>
              <View style={[styles.historyDot, { backgroundColor: colors.tint }]} />
              <Text style={[styles.historySectionTitle, { color: colors.text }]}>Ubicación</Text>
            </View>
            <View style={[styles.mapContainer, { borderColor: colors.border }]}>
              <TuriscanMap
                latitude={place.latitude}
                longitude={place.longitude}
                title={place.name}
                style={styles.miniMap}
                tintColor={colors.tint}
              />
            </View>
          </View>

          {/* QR Code info */}
          <View style={[styles.qrInfoCard, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}>
            <Ionicons name="qr-code-outline" size={20} color={colors.textMuted} />
            <Text style={[styles.qrInfoText, { color: colors.textMuted }]}>
              Código QR: {place.qrCode}
            </Text>
          </View>

          {/* Scan another */}
          <TouchableOpacity
            onPress={handleScanAnother}
            style={[styles.scanAnotherBtn, { borderColor: colors.tint }]}
            activeOpacity={0.8}
          >
            <Feather name="camera" size={18} color={colors.tint} />
            <Text style={[styles.scanAnotherText, { color: colors.tint }]}>Escanear otro lugar</Text>
          </TouchableOpacity>
        </View>
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16 },
  loadingText: { fontSize: 15, fontFamily: "Inter_400Regular" },
  errorContainer: { flex: 1, alignItems: "center", justifyContent: "center", padding: 40, gap: 12 },
  errorTitle: { fontSize: 20, fontFamily: "Inter_700Bold", textAlign: "center" },
  errorDesc: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20 },
  errorBtn: { paddingHorizontal: 32, paddingVertical: 14, borderRadius: 12, marginTop: 8 },
  errorBtnText: { color: "#fff", fontSize: 16, fontFamily: "Inter_600SemiBold" },
  scanAgainBtn: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4, padding: 12 },
  scanAgainText: { fontSize: 15, fontFamily: "Inter_500Medium" },
  floatingHeader: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    borderBottomWidth: 1,
  },
  floatingHeaderContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  floatingBackBtn: { padding: 4 },
  floatingHeaderTitle: { flex: 1, fontSize: 16, fontFamily: "Inter_600SemiBold", textAlign: "center", marginHorizontal: 8 },
  heroContainer: { width, overflow: "hidden" },
  heroImage: { width: "100%", height: "100%", position: "absolute" },
  heroImagePlaceholder: { flex: 1, alignItems: "center", justifyContent: "center" },
  heroGradient: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 120,
  },
  imageTopControls: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    flexDirection: "row",
  },
  imageBackBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.4)",
    alignItems: "center",
    justifyContent: "center",
  },
  heroBadgeContainer: {
    position: "absolute",
    bottom: 16,
    left: 16,
    flexDirection: "row",
    gap: 8,
  },
  heroBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  heroBadgeText: { color: "#fff", fontSize: 12, fontFamily: "Inter_600SemiBold" },
  heroCityBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  heroCityText: { color: "#fff", fontSize: 12, fontFamily: "Inter_400Regular" },
  content: { padding: 20 },
  titleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 8,
  },
  placeName: {
    flex: 1,
    fontSize: 24,
    fontFamily: "Inter_700Bold",
    lineHeight: 32,
  },
  speakBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  shortDesc: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    lineHeight: 22,
    marginBottom: 16,
  },
  narrateCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    gap: 14,
    marginBottom: 16,
  },
  narrateTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  narrateSubtitle: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  visitInfoRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 20,
  },
  visitInfoItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  visitInfoLabel: { fontSize: 10, fontFamily: "Inter_400Regular", textTransform: "uppercase", letterSpacing: 0.5 },
  visitInfoValue: { fontSize: 12, fontFamily: "Inter_600SemiBold", marginTop: 1 },
  historySection: { marginBottom: 24 },
  historySectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  historyDot: { width: 4, height: 20, borderRadius: 2 },
  historySectionTitle: { fontSize: 17, fontFamily: "Inter_700Bold" },
  historyText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    lineHeight: 24,
    letterSpacing: 0.1,
  },
  mapSection: { marginBottom: 20 },
  mapContainer: { borderRadius: 16, overflow: "hidden", borderWidth: 1 },
  miniMap: { width: "100%", height: 180 },
  mapFallback: { alignItems: "center", justifyContent: "center", gap: 8 },
  mapCoords: { fontSize: 12, fontFamily: "Inter_400Regular" },
  qrInfoCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 16,
  },
  qrInfoText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  scanAnotherBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  scanAnotherText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
});
