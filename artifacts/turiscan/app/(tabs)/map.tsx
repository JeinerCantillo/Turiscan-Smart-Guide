import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Platform,
  TouchableOpacity,
  useColorScheme,
  ScrollView,
} from "react-native";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";

import Colors from "@/constants/colors";
import { TuriscanMap, type MapPoint } from "@/components/TuriscanMap";
import { useGetPlaces } from "@workspace/api-client-react";
import type { Place } from "@workspace/api-client-react";


function PlaceListItem({ place, onPress }: { place: Place; onPress: () => void }) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = isDark ? Colors.dark : Colors.light;

  return (
    <TouchableOpacity
      style={[styles.listItem, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={[styles.listItemDot, { backgroundColor: colors.tint }]} />
      <View style={{ flex: 1 }}>
        <Text style={[styles.listItemName, { color: colors.text }]} numberOfLines={1}>{place.name}</Text>
        <Text style={[styles.listItemDesc, { color: colors.textSecondary }]} numberOfLines={1}>{place.category} · {place.cityName}</Text>
      </View>
      <Feather name="chevron-right" size={16} color={colors.textMuted} />
    </TouchableOpacity>
  );
}

export default function MapScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";

  const { data: places, isLoading } = useGetPlaces({});

  const handlePlacePress = (place: Place) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({ pathname: "/place/[id]", params: { id: String(place.id) } });
  };

  const allPoints: MapPoint[] = (places ?? []).map((p) => ({
    latitude: p.latitude,
    longitude: p.longitude,
    title: p.name,
  }));

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + (isWeb ? 67 : 0) + 12, backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Mapa Turístico</Text>
        <Text style={[styles.headerSub, { color: colors.textSecondary }]}>Ciénaga, Magdalena</Text>
      </View>

      {/* Map */}
      <TuriscanMap
        latitude={11.005}
        longitude={-74.249}
        allPoints={allPoints}
        scrollEnabled={true}
        zoomEnabled={true}
        style={styles.map}
        tintColor={colors.tint}
      />

      {/* Places list */}
      <View style={[styles.listContainer, { backgroundColor: colors.background }]}>
        <Text style={[styles.listTitle, { color: colors.text }]}>
          {places?.length ?? 0} sitios en Ciénaga
        </Text>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: insets.bottom + (isWeb ? 34 : 0) + 80 }}
        >
          {isLoading ? (
            <Text style={[styles.loadingText, { color: colors.textMuted }]}>Cargando lugares...</Text>
          ) : (
            places?.map((place) => (
              <PlaceListItem key={place.id} place={place} onPress={() => handlePlacePress(place)} />
            ))
          )}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 22, fontFamily: "Inter_700Bold" },
  headerSub: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 2 },
  map: { width: "100%", height: 260 },
  listContainer: { flex: 1, paddingHorizontal: 16, paddingTop: 14 },
  listTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold", marginBottom: 10 },
  listItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
    gap: 12,
  },
  listItemDot: { width: 10, height: 10, borderRadius: 5 },
  listItemName: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  listItemDesc: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  loadingText: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", marginTop: 20 },
});
