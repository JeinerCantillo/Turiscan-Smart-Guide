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

const { width } = Dimensions.get("window");
const CARD_WIDTH = width * 0.72;

const CATEGORIES = ["Todos", "Plaza", "Religioso", "Natural", "Patrimonio", "Cultural"];

function PlaceCard({ place }: { place: Place }) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = isDark ? Colors.dark : Colors.light;

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({ pathname: "/place/[id]", params: { id: String(place.id) } });
  };

  return (
    <TouchableOpacity style={[styles.card, { backgroundColor: colors.backgroundCard }]} onPress={handlePress} activeOpacity={0.85}>
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
        {place.visitDuration ? (
          <View style={styles.cardMeta}>
            <Feather name="clock" size={12} color={colors.textMuted} />
            <Text style={[styles.cardMetaText, { color: colors.textMuted }]}>{place.visitDuration}</Text>
          </View>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

function FeaturedCard({ place }: { place: Place }) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = isDark ? Colors.dark : Colors.light;

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({ pathname: "/place/[id]", params: { id: String(place.id) } });
  };

  return (
    <TouchableOpacity style={[styles.featuredCard, { width: CARD_WIDTH }]} onPress={handlePress} activeOpacity={0.9}>
      {place.imageUrl ? (
        <Image source={{ uri: place.imageUrl }} style={styles.featuredImage} resizeMode="cover" />
      ) : (
        <View style={[styles.featuredImage, { backgroundColor: colors.backgroundSecondary }]} />
      )}
      <View style={styles.featuredOverlay}>
        <View style={[styles.categoryBadge, { backgroundColor: colors.accent }]}>
          <Text style={styles.categoryBadgeText}>{place.category}</Text>
        </View>
        <Text style={styles.featuredName} numberOfLines={2}>{place.name}</Text>
        <View style={styles.featuredMeta}>
          <Feather name="map-pin" size={12} color="rgba(255,255,255,0.8)" />
          <Text style={styles.featuredCity}>{place.cityName}</Text>
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
          <View>
            <Text style={[styles.headerGreeting, { color: colors.textSecondary }]}>Bienvenido a</Text>
            <Text style={[styles.headerTitle, { color: colors.text }]}>Turiscan</Text>
          </View>
          <TouchableOpacity
            onPress={handleScan}
            style={[styles.scanButton, { backgroundColor: colors.tint }]}
            activeOpacity={0.85}
          >
            <Feather name="camera" size={20} color="#fff" />
          </TouchableOpacity>
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
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  headerGreeting: { fontSize: 13, fontFamily: "Inter_400Regular" },
  headerTitle: { fontSize: 28, fontFamily: "Inter_700Bold" },
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
    paddingTop: 40,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  featuredName: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    marginVertical: 4,
  },
  featuredMeta: { flexDirection: "row", alignItems: "center", gap: 4 },
  featuredCity: { color: "rgba(255,255,255,0.85)", fontSize: 12, fontFamily: "Inter_400Regular" },
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
  },
  cardImageContainer: { position: "relative" },
  cardImage: { width: "100%", height: 160 },
  cardImagePlaceholder: { width: "100%", height: 160, alignItems: "center", justifyContent: "center" },
  cardBody: { padding: 14 },
  cardCity: { fontSize: 11, fontFamily: "Inter_600SemiBold", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 },
  cardName: { fontSize: 16, fontFamily: "Inter_700Bold", marginBottom: 4 },
  cardDesc: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18 },
  cardMeta: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 8 },
  cardMetaText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  emptyState: { alignItems: "center", paddingVertical: 40, gap: 12 },
  emptyText: { fontSize: 15, fontFamily: "Inter_400Regular" },
});
