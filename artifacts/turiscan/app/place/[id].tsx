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
  TextInput,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Feather, Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import * as Speech from "expo-speech";

import Colors from "@/constants/colors";
import { TuriscanMap } from "@/components/TuriscanMap";
import { useGetPlaceById, useGetPlaceByQrCode } from "@workspace/api-client-react";
import { useAuth } from "@/context/AuthContext";

const BASE_URL = `https://${process.env.EXPO_PUBLIC_DOMAIN}`;

const { width, height } = Dimensions.get("window");
const IMAGE_HEIGHT = height * 0.42;

const CATEGORY_ICONS: Record<string, string> = {
  Plaza: "map",
  Religioso: "activity",
  Natural: "sunset",
  Patrimonio: "archive",
  Cultural: "book-open",
};

interface Review {
  id: number;
  userName: string;
  rating: number;
  comment?: string | null;
  createdAt: string;
}

function StarRow({ rating, max = 5, size = 14, color = "#F4D03F", emptyColor = "#D0D0D0" }: {
  rating: number; max?: number; size?: number; color?: string; emptyColor?: string;
}) {
  return (
    <View style={{ flexDirection: "row", gap: 2 }}>
      {Array.from({ length: max }).map((_, i) => (
        <Ionicons
          key={i}
          name={i < Math.round(rating) ? "star" : "star-outline"}
          size={size}
          color={i < Math.round(rating) ? color : emptyColor}
        />
      ))}
    </View>
  );
}

function StarPicker({ rating, onRate }: { rating: number; onRate: (r: number) => void }) {
  return (
    <View style={{ flexDirection: "row", gap: 6, justifyContent: "center" }}>
      {[1, 2, 3, 4, 5].map((star) => (
        <TouchableOpacity key={star} onPress={() => { Haptics.selectionAsync(); onRate(star); }}>
          <Ionicons
            name={star <= rating ? "star" : "star-outline"}
            size={32}
            color={star <= rating ? "#F4D03F" : "#D0D0D0"}
          />
        </TouchableOpacity>
      ))}
    </View>
  );
}

function ReviewCard({ review, colors }: { review: Review; colors: any }) {
  const date = new Date(review.createdAt);
  const dateStr = date.toLocaleDateString("es-CO", { year: "numeric", month: "short", day: "numeric" });
  const initials = review.userName.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();

  return (
    <View style={[reviewStyles.card, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}>
      <View style={reviewStyles.header}>
        <View style={[reviewStyles.avatar, { backgroundColor: `${colors.tint}20` }]}>
          <Text style={[reviewStyles.avatarText, { color: colors.tint }]}>{initials}</Text>
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={[reviewStyles.name, { color: colors.text }]}>{review.userName}</Text>
          <StarRow rating={review.rating} size={12} />
        </View>
        <Text style={[reviewStyles.date, { color: colors.textMuted }]}>{dateStr}</Text>
      </View>
      {review.comment && (
        <Text style={[reviewStyles.comment, { color: colors.textSecondary }]}>{review.comment}</Text>
      )}
    </View>
  );
}

const reviewStyles = StyleSheet.create({
  card: { borderRadius: 14, padding: 14, borderWidth: 1, gap: 10 },
  header: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  avatar: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 13, fontFamily: "Inter_700Bold" },
  name: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  date: { fontSize: 11, fontFamily: "Inter_400Regular" },
  comment: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 19 },
});

export default function PlaceDetailScreen() {
  const { id, qrCode, autoSpeak } = useLocalSearchParams<{ id: string; qrCode?: string; autoSpeak?: string }>();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const { user, token } = useAuth();

  const [isSpeaking, setIsSpeaking] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [newRating, setNewRating] = useState(0);
  const [newComment, setNewComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [reviewError, setReviewError] = useState("");
  const scrollY = useRef(new Animated.Value(0)).current;
  const speakAnim = useRef(new Animated.Value(1)).current;

  const isQrMode = id === "qr" && !!qrCode;

  const { data: placeById, isLoading: loadingById, isError: errorById } = useGetPlaceById(
    Number(id), { query: { enabled: !isQrMode && !isNaN(Number(id)) } }
  );
  const { data: placeByQr, isLoading: loadingByQr, isError: errorByQr } = useGetPlaceByQrCode(
    qrCode ?? "", { query: { enabled: isQrMode && !!qrCode } }
  );

  const place = isQrMode ? placeByQr : placeById;
  const isLoading = isQrMode ? loadingByQr : loadingById;
  const isError = isQrMode ? errorByQr : errorById;

  const headerOpacity = scrollY.interpolate({
    inputRange: [IMAGE_HEIGHT - 120, IMAGE_HEIGHT - 60],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });

  useEffect(() => {
    return () => { Speech.stop(); };
  }, []);

  useEffect(() => {
    if (autoSpeak === "1" && place && !isSpeaking) {
      const timer = setTimeout(() => handleSpeak(), 600);
      return () => clearTimeout(timer);
    }
  }, [autoSpeak, place?.id]);

  useEffect(() => {
    if (place?.id) fetchReviews(place.id);
  }, [place?.id]);

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

  const fetchReviews = async (placeId: number) => {
    setLoadingReviews(true);
    try {
      const res = await fetch(`${BASE_URL}/api/places/${placeId}/reviews`);
      const data = await res.json();
      setReviews(Array.isArray(data) ? data : []);
    } catch {}
    setLoadingReviews(false);
  };

  const submitReview = async () => {
    if (!token) { router.push("/login"); return; }
    if (newRating === 0) { setReviewError("Selecciona una calificación"); return; }
    setSubmitting(true);
    setReviewError("");
    try {
      const res = await fetch(`${BASE_URL}/api/places/${place?.id}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ rating: newRating, comment: newComment.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? "Error");
      setReviews((prev) => [data, ...prev]);
      setNewRating(0);
      setNewComment("");
    } catch (e: any) {
      setReviewError(e.message ?? "Error al enviar reseña");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSpeak = async () => {
    if (!place) return;
    if (isSpeaking) { Speech.stop(); setIsSpeaking(false); return; }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsSpeaking(true);
    Speech.speak(`${place.name}. ${place.shortDescription}. ${place.history}`, {
      language: "es-CO", rate: 0.9, pitch: 1.0,
      onDone: () => setIsSpeaking(false),
      onStopped: () => setIsSpeaking(false),
      onError: () => setIsSpeaking(false),
    });
  };

  const handleBack = () => { Speech.stop(); router.back(); };
  const handleScanAnother = () => { Speech.stop(); router.replace("/scanner"); };
  const handleOpenVR = () => {
    if (!place) return;
    Speech.stop();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    router.push({ pathname: "/vr/[id]", params: { id: String(place.id) } });
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
          {isQrMode ? `Código no encontrado: ${qrCode}` : "No se encontró este lugar."}
        </Text>
        <TouchableOpacity style={[styles.errorBtn, { backgroundColor: colors.tint }]} onPress={handleBack}>
          <Text style={styles.errorBtnText}>Volver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const iconName = CATEGORY_ICONS[place.category] || "map-pin";
  const avgRating = Number(place.avgRating ?? 0);
  const reviewCount = place.reviewCount ?? 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Floating header */}
      <Animated.View
        style={[styles.floatingHeader, { opacity: headerOpacity, backgroundColor: colors.backgroundSecondary, paddingTop: insets.top, borderBottomColor: colors.border }]}
      >
        <View style={styles.floatingHeaderContent}>
          <TouchableOpacity onPress={handleBack} style={styles.floatingBackBtn}>
            <Feather name="chevron-left" size={22} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.floatingHeaderTitle, { color: colors.text }]} numberOfLines={1}>{place.name}</Text>
          <View style={{ width: 36 }} />
        </View>
      </Animated.View>

      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) + 60 }}
      >
        {/* Hero image */}
        <View style={[styles.heroContainer, { height: IMAGE_HEIGHT }]}>
          {place.imageUrl ? (
            <Image source={{ uri: place.imageUrl }} style={styles.heroImage} resizeMode="cover" onLoad={() => setImageLoaded(true)} />
          ) : (
            <View style={[styles.heroImagePlaceholder, { backgroundColor: colors.backgroundSecondary }]}>
              <Feather name={iconName as any} size={64} color={colors.textMuted} />
            </View>
          )}
          <View style={[styles.imageTopControls, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 0) + 8 }]}>
            <TouchableOpacity onPress={handleBack} style={styles.imageBackBtn}>
              <Feather name="chevron-left" size={22} color="#fff" />
            </TouchableOpacity>
          </View>
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

          {/* Floating 360° VR button on hero image */}
          {place.video360Url && (
            <TouchableOpacity onPress={handleOpenVR} style={styles.vrHeroFloat} activeOpacity={0.82}>
              <Ionicons name="glasses" size={20} color="#fff" />
              <Text style={styles.vrHeroFloatText}>360°</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Content */}
        <View style={styles.content}>
          {/* Title row */}
          <View style={styles.titleRow}>
            <View style={{ flex: 1, gap: 6 }}>
              <Text style={[styles.placeName, { color: colors.text }]}>{place.name}</Text>
              {/* Rating row */}
              <View style={styles.ratingRow}>
                <StarRow rating={avgRating} size={14} />
                <Text style={[styles.ratingNum, { color: colors.textSecondary }]}>
                  {avgRating > 0 ? avgRating.toFixed(1) : "Sin calificaciones"}
                </Text>
                {reviewCount > 0 && (
                  <Text style={[styles.reviewCountText, { color: colors.textMuted }]}>({reviewCount})</Text>
                )}
              </View>
            </View>
            <Animated.View style={{ transform: [{ scale: speakAnim }] }}>
              <TouchableOpacity
                onPress={handleSpeak}
                style={[styles.speakBtn, { backgroundColor: isSpeaking ? colors.tint : `${colors.tint}18` }]}
                activeOpacity={0.8}
              >
                <Ionicons name={isSpeaking ? "pause" : "volume-high"} size={22} color={isSpeaking ? "#fff" : colors.tint} />
              </TouchableOpacity>
            </Animated.View>
          </View>

          <Text style={[styles.shortDesc, { color: colors.textSecondary }]}>{place.shortDescription}</Text>

          {/* Address */}
          {(place as any).address && (
            <View style={[styles.addressRow, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}>
              <Feather name="map-pin" size={14} color={colors.tint} />
              <Text style={[styles.addressText, { color: colors.textSecondary }]}>{(place as any).address}</Text>
            </View>
          )}

          {/* Narration card */}
          <TouchableOpacity
            onPress={handleSpeak}
            style={[styles.narrateCard, { backgroundColor: isSpeaking ? colors.tint : `${colors.tint}12`, borderColor: isSpeaking ? colors.tint : `${colors.tint}30` }]}
            activeOpacity={0.85}
          >
            <Ionicons name={isSpeaking ? "pause-circle" : "play-circle"} size={32} color={isSpeaking ? "#fff" : colors.tint} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.narrateTitle, { color: isSpeaking ? "#fff" : colors.tint }]}>
                {isSpeaking ? "Pausar narración" : "Escuchar narración"}
              </Text>
              <Text style={[styles.narrateSubtitle, { color: isSpeaking ? "rgba(255,255,255,0.8)" : colors.textMuted }]}>
                {isSpeaking ? "Narrando la historia del lugar..." : "Toca para escuchar la historia narrada"}
              </Text>
            </View>
          </TouchableOpacity>

          {/* Prominent VR card — right below narration */}
          {place.video360Url && (
            <TouchableOpacity onPress={handleOpenVR} style={styles.vrCard} activeOpacity={0.85}>
              <View style={styles.vrCardLeft}>
                <View style={styles.vrCardIconCircle}>
                  <Ionicons name="glasses" size={26} color="#fff" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.vrCardTitle}>Ver en Realidad Virtual 360°</Text>
                  <Text style={styles.vrCardSub}>Experiencia de video inmersivo del lugar</Text>
                </View>
              </View>
              <Feather name="play-circle" size={30} color="rgba(255,255,255,0.8)" />
            </TouchableOpacity>
          )}

          {/* Visit info */}
          {(place.visitHours || place.visitDuration) && (
            <View style={styles.visitInfoRow}>
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
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionDot, { backgroundColor: colors.tint }]} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Historia del lugar</Text>
            </View>
            <Text style={[styles.historyText, { color: colors.textSecondary }]}>{place.history}</Text>
          </View>

          {/* Map */}
          <View style={styles.mapSection}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionDot, { backgroundColor: colors.tint }]} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Ubicación</Text>
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

          {/* Reviews section */}
          <View style={styles.reviewsSection}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionDot, { backgroundColor: colors.accent }]} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Reseñas</Text>
              <Text style={[styles.reviewCountLabel, { color: colors.textMuted }]}>
                {reviews.length > 0 ? `(${reviews.length})` : ""}
              </Text>
            </View>

            {/* Add review form */}
            {user ? (
              <View style={[styles.reviewForm, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}>
                <Text style={[styles.reviewFormTitle, { color: colors.text }]}>Escribe una reseña</Text>
                <StarPicker rating={newRating} onRate={setNewRating} />
                <TextInput
                  style={[styles.reviewInput, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border, color: colors.text }]}
                  placeholder="Comparte tu experiencia (opcional)..."
                  placeholderTextColor={colors.textMuted}
                  value={newComment}
                  onChangeText={setNewComment}
                  multiline
                  numberOfLines={3}
                />
                {!!reviewError && <Text style={{ color: colors.error, fontSize: 12, fontFamily: "Inter_400Regular" }}>{reviewError}</Text>}
                <TouchableOpacity
                  style={[styles.submitReviewBtn, { backgroundColor: colors.tint, opacity: submitting ? 0.7 : 1 }]}
                  onPress={submitReview}
                  disabled={submitting}
                  activeOpacity={0.85}
                >
                  {submitting ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.submitReviewBtnText}>Publicar reseña</Text>
                  )}
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={[styles.loginToReview, { backgroundColor: `${colors.tint}12`, borderColor: `${colors.tint}30` }]}
                onPress={() => router.push("/login")}
                activeOpacity={0.85}
              >
                <Feather name="edit-3" size={18} color={colors.tint} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.loginToReviewText, { color: colors.tint }]}>Inicia sesión para dejar una reseña</Text>
                  <Text style={[styles.loginToReviewSub, { color: colors.textMuted }]}>Comparte tu experiencia con otros turistas</Text>
                </View>
                <Feather name="chevron-right" size={16} color={colors.tint} />
              </TouchableOpacity>
            )}

            {/* Reviews list */}
            {loadingReviews ? (
              <ActivityIndicator color={colors.tint} style={{ marginVertical: 16 }} />
            ) : reviews.length === 0 ? (
              <View style={styles.noReviews}>
                <Ionicons name="chatbubble-outline" size={32} color={colors.textMuted} />
                <Text style={[styles.noReviewsText, { color: colors.textMuted }]}>Sé el primero en reseñar este lugar</Text>
              </View>
            ) : (
              <View style={styles.reviewsList}>
                {reviews.map((r) => (
                  <ReviewCard key={r.id} review={r} colors={colors} />
                ))}
              </View>
            )}
          </View>

          {/* QR info */}
          <View style={[styles.qrInfoCard, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}>
            <Ionicons name="qr-code-outline" size={20} color={colors.textMuted} />
            <Text style={[styles.qrInfoText, { color: colors.textMuted }]}>Código QR: {place.qrCode}</Text>
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
  floatingHeader: { position: "absolute", top: 0, left: 0, right: 0, zIndex: 100, borderBottomWidth: 1 },
  floatingHeaderContent: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12 },
  floatingBackBtn: { padding: 4 },
  floatingHeaderTitle: { flex: 1, fontSize: 16, fontFamily: "Inter_600SemiBold", textAlign: "center", marginHorizontal: 8 },
  heroContainer: { width, overflow: "hidden" },
  heroImage: { width: "100%", height: "100%", position: "absolute" },
  heroImagePlaceholder: { flex: 1, alignItems: "center", justifyContent: "center" },
  imageTopControls: { position: "absolute", top: 0, left: 0, right: 0, paddingHorizontal: 16, flexDirection: "row" },
  imageBackBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(0,0,0,0.4)", alignItems: "center", justifyContent: "center" },
  heroBadgeContainer: { position: "absolute", bottom: 16, left: 16, flexDirection: "row", gap: 8 },
  heroBadge: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  heroBadgeText: { color: "#fff", fontSize: 12, fontFamily: "Inter_600SemiBold" },
  heroCityBadge: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  heroCityText: { color: "#fff", fontSize: 12, fontFamily: "Inter_400Regular" },
  content: { padding: 20 },
  titleRow: { flexDirection: "row", alignItems: "flex-start", gap: 12, marginBottom: 8 },
  placeName: { fontSize: 24, fontFamily: "Inter_700Bold", lineHeight: 32 },
  ratingRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  ratingNum: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  reviewCountText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  speakBtn: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center", marginTop: 2 },
  shortDesc: { fontSize: 15, fontFamily: "Inter_400Regular", lineHeight: 22, marginBottom: 12 },
  addressRow: { flexDirection: "row", alignItems: "center", gap: 8, padding: 10, borderRadius: 10, borderWidth: 1, marginBottom: 12 },
  addressText: { fontSize: 13, fontFamily: "Inter_400Regular", flex: 1 },
  narrateCard: { flexDirection: "row", alignItems: "center", padding: 16, borderRadius: 16, borderWidth: 1, gap: 14, marginBottom: 16 },
  narrateTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  narrateSubtitle: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  visitInfoRow: { flexDirection: "row", gap: 10, marginBottom: 20 },
  visitInfoItem: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderRadius: 12, borderWidth: 1 },
  visitInfoLabel: { fontSize: 10, fontFamily: "Inter_400Regular", textTransform: "uppercase", letterSpacing: 0.5 },
  visitInfoValue: { fontSize: 12, fontFamily: "Inter_600SemiBold", marginTop: 1 },
  historySection: { marginBottom: 24 },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },
  sectionDot: { width: 4, height: 20, borderRadius: 2 },
  sectionTitle: { fontSize: 17, fontFamily: "Inter_700Bold" },
  historyText: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 24, letterSpacing: 0.1 },
  mapSection: { marginBottom: 20 },
  mapContainer: { borderRadius: 16, overflow: "hidden", borderWidth: 1 },
  miniMap: { width: "100%", height: 180 },
  vrHeroFloat: {
    position: "absolute",
    bottom: 16,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(13,27,42,0.85)",
    borderRadius: 22,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
  },
  vrHeroFloatText: { color: "#fff", fontSize: 14, fontFamily: "Inter_700Bold", letterSpacing: 0.5 },
  vrCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#0D1B2A",
    padding: 16,
    borderRadius: 18,
    marginBottom: 16,
    gap: 12,
  },
  vrCardLeft: { flexDirection: "row", alignItems: "center", gap: 14, flex: 1 },
  vrCardIconCircle: { width: 50, height: 50, borderRadius: 25, backgroundColor: "rgba(26,95,122,0.8)", alignItems: "center", justifyContent: "center" },
  vrCardTitle: { color: "#fff", fontSize: 14, fontFamily: "Inter_700Bold" },
  vrCardSub: { color: "rgba(255,255,255,0.6)", fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  reviewsSection: { marginBottom: 24, gap: 12 },
  reviewCountLabel: { fontSize: 14, fontFamily: "Inter_400Regular", marginLeft: 4 },
  reviewForm: { borderRadius: 16, padding: 16, borderWidth: 1, gap: 12 },
  reviewFormTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold", textAlign: "center" },
  reviewInput: { borderRadius: 12, borderWidth: 1, padding: 12, fontSize: 14, fontFamily: "Inter_400Regular", textAlignVertical: "top", minHeight: 80 },
  submitReviewBtn: { borderRadius: 12, paddingVertical: 13, alignItems: "center" },
  submitReviewBtnText: { color: "#fff", fontSize: 15, fontFamily: "Inter_600SemiBold" },
  loginToReview: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 14, borderWidth: 1 },
  loginToReviewText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  loginToReviewSub: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 1 },
  noReviews: { alignItems: "center", paddingVertical: 24, gap: 8 },
  noReviewsText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  reviewsList: { gap: 10 },
  qrInfoCard: { flexDirection: "row", alignItems: "center", gap: 8, padding: 12, borderRadius: 10, borderWidth: 1, marginBottom: 16 },
  qrInfoText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  scanAnotherBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14, borderRadius: 12, borderWidth: 1.5 },
  scanAnotherText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
});
