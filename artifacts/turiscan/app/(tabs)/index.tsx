import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  useColorScheme,
  Platform,
  ActivityIndicator,
  TextInput,
  Dimensions,
} from "react-native";
import { router } from "expo-router";
import { Feather, Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";

import Colors from "@/constants/colors";
import { useGetPlaces } from "@workspace/api-client-react";
import type { Place } from "@workspace/api-client-react";
import { useAuth } from "@/context/AuthContext";
import { GuideAvatar } from "@/components/GuideAvatar";

const { width } = Dimensions.get("window");
const CARD_WIDTH = width * 0.72;

const CATEGORIES = ["Todos", "Plaza", "Religioso", "Natural", "Patrimonio", "Cultural"];

function StarRow({ rating, count }: { rating: number; count?: number }) {
  const filled = Math.round(rating);
  if (!rating) return null;
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
      {[1,2,3,4,5].map((i) => (
        <Ionicons key={i} name={i <= filled ? "star" : "star-outline"} size={11} color={i <= filled ? "#F4D03F" : "#CBD5E0"} />
      ))}
      {count != null && count > 0 && (
        <Text style={{ fontSize: 10, fontFamily: "Inter_400Regular", color: "#888", marginLeft: 2 }}>
          ({count})
        </Text>
      )}
    </View>
  );
}

function PlaceCard({ place }: { place: Place }) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = isDark ? Colors.dark : Colors.light;

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({ pathname: "/place/[id]", params: { id: String(place.id) } });
  };

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.backgroundCard, shadowColor: colors.shadow }]}
      onPress={handlePress}
      activeOpacity={0.85}
    >
      <View style={styles.cardImageContainer}>
        {place.imageUrl ? (
          <Image source={{ uri: place.imageUrl }} style={styles.cardImage} resizeMode="cover" />
        ) : (
          <View style={[styles.cardImagePlaceholder, { backgroundColor: colors.backgroundSecondary }]}>
            <Feather name="image" size={32} color={colors.textMuted} />
          </View>
        )}
        <View style={[styles.categoryBadge, { backgroundColor: colors.tint }]}>
          <Text style={styles.categoryBadgeText}>{place.category}</Text>
        </View>
      </View>
      <View style={styles.cardBody}>
        <Text style={[styles.cardCity, { color: colors.tint }]}>{place.cityName}</Text>
        <Text style={[styles.cardName, { color: colors.text }]} numberOfLines={2}>{place.name}</Text>
        <Text style={[styles.cardDesc, { color: colors.textSecondary }]} numberOfLines={2}>{place.shortDescription}</Text>
        <View style={styles.cardFooter}>
          <StarRow rating={Number(place.avgRating ?? 0)} count={place.reviewCount ?? 0} />
          {place.visitDuration ? (
            <View style={styles.cardMeta}>
              <Feather name="clock" size={11} color={colors.textMuted} />
              <Text style={[styles.cardMetaText, { color: colors.textMuted }]}>{place.visitDuration}</Text>
            </View>
          ) : null}
        </View>
      </View>
    </TouchableOpacity>
  );
}

function FeaturedCard({ place }: { place: Place }) {
  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({ pathname: "/place/[id]", params: { id: String(place.id) } });
  };

  return (
    <TouchableOpacity style={[styles.featuredCard, { width: CARD_WIDTH }]} onPress={handlePress} activeOpacity={0.9}>
      {place.imageUrl ? (
        <Image source={{ uri: place.imageUrl }} style={styles.featuredImage} resizeMode="cover" />
      ) : (
        <View style={[styles.featuredImage, { backgroundColor: "#1A2C3D" }]} />
      )}
      <View style={styles.featuredOverlay}>
        <View style={[styles.categoryBadge, { backgroundColor: "rgba(244,208,63,0.9)" }]}>
          <Text style={[styles.categoryBadgeText, { color: "#1A2C3D" }]}>{place.category}</Text>
        </View>
        <Text style={styles.featuredName} numberOfLines={2}>{place.name}</Text>
        <View style={styles.featuredBottom}>
          <View style={styles.featuredMeta}>
            <Feather name="map-pin" size={11} color="rgba(255,255,255,0.8)" />
            <Text style={styles.featuredCity}>{place.cityName}</Text>
          </View>
          {Number(place.avgRating ?? 0) > 0 && (
            <View style={styles.featuredRating}>
              <Ionicons name="star" size={11} color="#F4D03F" />
              <Text style={styles.featuredRatingText}>{Number(place.avgRating).toFixed(1)}</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function ExploreScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const { user } = useAuth();

  const [selectedCategory, setSelectedCategory] = useState("Todos");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: places, isLoading } = useGetPlaces(
    searchQuery ? { search: searchQuery } : {}
  );

  const filtered = places?.filter((p) =>
    selectedCategory === "Todos" ? true : p.category === selectedCategory
  ) ?? [];

  const featured = places?.slice(0, 3) ?? [];

  const handleScan = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push("/scanner");
  };

  const greeting = user
    ? `¡Hola, ${user.name.split(" ")[0]}!`
    : "Bienvenido a";

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingTop: insets.top + (isWeb ? 67 : 0),
          paddingBottom: insets.bottom + (isWeb ? 34 : 0) + 100,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={[styles.headerGreeting, { color: colors.textSecondary }]}>{greeting}</Text>
            {!user && <Text style={[styles.headerTitle, { color: colors.text }]}>Turiscan</Text>}
            {user && (
              <View style={styles.headerUserRow}>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Ciénaga</Text>
                {user.role === "admin" && (
                  <View style={[styles.adminBadge, { backgroundColor: colors.accent }]}>
                    <Feather name="shield" size={10} color="#1A2C3D" />
                    <Text style={[styles.adminBadgeText, { color: "#1A2C3D" }]}>Admin</Text>
                  </View>
                )}
              </View>
            )}
          </View>
          <View style={styles.headerRight}>
            <GuideAvatar
              message={user ? `¡Bienvenido! Explora los mejores lugares de Ciénaga.` : "Escanea un código QR o explora los sitios turísticos de Ciénaga"}
              autoAnimate
            />
            <TouchableOpacity
              onPress={handleScan}
              style={[styles.scanButton, { backgroundColor: colors.tint }]}
              activeOpacity={0.85}
            >
              <Feather name="camera" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Search */}
        <View style={[styles.searchContainer, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}>
          <Feather name="search" size={16} color={colors.textMuted} />
          <TextInput
            style={[styles.searchInput, { color: colors.text, fontFamily: "Inter_400Regular" }]}
            placeholder="Buscar lugares turísticos..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <Feather name="x" size={16} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* Scan CTA Banner */}
        <TouchableOpacity
          onPress={handleScan}
          style={[styles.scanBanner, { backgroundColor: colors.tint }]}
          activeOpacity={0.88}
        >
          <View style={styles.scanBannerContent}>
            <View style={styles.scanBannerText}>
              <Text style={styles.scanBannerTitle}>Escanear QR Turístico</Text>
              <Text style={styles.scanBannerSub}>Apunta tu cámara al código QR del sitio</Text>
            </View>
            <View style={[styles.scanIconCircle, { backgroundColor: "rgba(255,255,255,0.2)" }]}>
              <Ionicons name="qr-code-outline" size={28} color="#fff" />
            </View>
          </View>
        </TouchableOpacity>

        {/* Featured */}
        {!searchQuery && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Destacados</Text>
            {isLoading ? (
              <ActivityIndicator color={colors.tint} style={{ marginVertical: 24 }} />
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.featuredList}>
                {featured.map((p) => (
                  <FeaturedCard key={p.id} place={p} />
                ))}
              </ScrollView>
            )}
          </View>
        )}

        {/* Categories */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoriesContainer}>
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat}
              onPress={() => {
                setSelectedCategory(cat);
                Haptics.selectionAsync();
              }}
              style={[
                styles.categoryChip,
                {
                  backgroundColor: selectedCategory === cat ? colors.tint : colors.backgroundCard,
                  borderColor: selectedCategory === cat ? colors.tint : colors.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.categoryChipText,
                  { color: selectedCategory === cat ? "#fff" : colors.textSecondary },
                ]}
              >
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* All Places */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            {searchQuery ? `Resultados para "${searchQuery}"` : "Todos los lugares"}
          </Text>
          {isLoading ? (
            <ActivityIndicator color={colors.tint} style={{ marginVertical: 24 }} />
          ) : filtered.length === 0 ? (
            <View style={styles.emptyState}>
              <Feather name="map-pin" size={40} color={colors.textMuted} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No se encontraron lugares</Text>
            </View>
          ) : (
            <View style={styles.placeGrid}>
              {filtered.map((p) => (
                <PlaceCard key={p.id} place={p} />
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  headerLeft: { flex: 1 },
  headerRight: { flexDirection: "row", alignItems: "flex-end", gap: 10 },
  headerGreeting: { fontSize: 13, fontFamily: "Inter_400Regular" },
  headerTitle: { fontSize: 28, fontFamily: "Inter_700Bold" },
  headerUserRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  adminBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
  },
  adminBadgeText: { fontSize: 10, fontFamily: "Inter_700Bold" },
  scanButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 20,
    marginVertical: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 14 },
  scanBanner: {
    marginHorizontal: 20,
    borderRadius: 16,
    marginBottom: 8,
    overflow: "hidden",
  },
  scanBannerContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: 18,
    justifyContent: "space-between",
  },
  scanBannerText: { flex: 1 },
  scanBannerTitle: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    marginBottom: 2,
  },
  scanBannerSub: { color: "rgba(255,255,255,0.8)", fontSize: 12, fontFamily: "Inter_400Regular" },
  scanIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
  },
  section: { marginTop: 20 },
  sectionTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  featuredList: { paddingHorizontal: 20, gap: 12 },
  featuredCard: {
    height: 200,
    borderRadius: 18,
    overflow: "hidden",
  },
  featuredImage: { width: "100%", height: "100%", position: "absolute" },
  featuredOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 14,
    paddingTop: 50,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  featuredName: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    marginVertical: 4,
  },
  featuredBottom: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  featuredMeta: { flexDirection: "row", alignItems: "center", gap: 4 },
  featuredCity: { color: "rgba(255,255,255,0.85)", fontSize: 12, fontFamily: "Inter_400Regular" },
  featuredRating: { flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: "rgba(0,0,0,0.4)", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 },
  featuredRatingText: { color: "#fff", fontSize: 11, fontFamily: "Inter_600SemiBold" },
  categoryBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 4,
  },
  categoryBadgeText: { color: "#fff", fontSize: 11, fontFamily: "Inter_600SemiBold" },
  categoriesContainer: { paddingHorizontal: 20, gap: 8, paddingVertical: 4, marginBottom: 4 },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  categoryChipText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  placeGrid: { paddingHorizontal: 20, gap: 12 },
  card: {
    borderRadius: 16,
    overflow: "hidden",
    elevation: 3,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
  },
  cardImageContainer: { position: "relative" },
  cardImage: { width: "100%", height: 160 },
  cardImagePlaceholder: { width: "100%", height: 160, alignItems: "center", justifyContent: "center" },
  cardBody: { padding: 14, gap: 4 },
  cardCity: { fontSize: 11, fontFamily: "Inter_600SemiBold", textTransform: "uppercase", letterSpacing: 0.5 },
  cardName: { fontSize: 16, fontFamily: "Inter_700Bold" },
  cardDesc: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18 },
  cardFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 6 },
  cardMeta: { flexDirection: "row", alignItems: "center", gap: 3 },
  cardMetaText: { fontSize: 11, fontFamily: "Inter_400Regular" },
  emptyState: { alignItems: "center", paddingVertical: 40, gap: 12 },
  emptyText: { fontSize: 15, fontFamily: "Inter_400Regular" },
});
