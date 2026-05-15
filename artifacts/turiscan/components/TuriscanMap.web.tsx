import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";

export type MapPoint = {
  latitude: number;
  longitude: number;
  title?: string;
  category?: string;
  id?: number;
};

type Props = {
  latitude: number;
  longitude: number;
  title?: string;
  allPoints?: MapPoint[];
  scrollEnabled?: boolean;
  zoomEnabled?: boolean;
  style?: object;
  tintColor?: string;
  onMarkerPress?: (point: MapPoint, index: number) => void;
  selectedIndex?: number;
};

const CATEGORY_COLORS: Record<string, string> = {
  Plaza: "#F5A623",
  Religioso: "#9B59B6",
  Natural: "#27AE60",
  Patrimonio: "#E74C3C",
  Cultural: "#2980B9",
};

export function TuriscanMap({ latitude, longitude, allPoints, style, tintColor, title, onMarkerPress, selectedIndex }: Props) {
  const color = tintColor ?? "#1A6B4A";

  const zoom = allPoints && allPoints.length > 1 ? 14 : 16;
  const mapUrl = allPoints && allPoints.length > 1
    ? `https://maps.google.com/maps?q=${latitude},${longitude}&z=${zoom}&output=embed`
    : `https://maps.google.com/maps?q=${latitude},${longitude}&z=${zoom}&output=embed`;

  return (
    <View style={[styles.container, style]}>
      <iframe
        src={mapUrl}
        style={{ width: "100%", height: "100%", border: "none", display: "block" } as React.CSSProperties}
        title={title ?? "Mapa turístico"}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
      />
      {allPoints && allPoints.length > 0 && (
        <View style={styles.markersOverlay} pointerEvents="none">
          {allPoints.map((pt, i) => {
            const catColor = (pt.category && CATEGORY_COLORS[pt.category]) ?? color;
            const isSelected = selectedIndex === i;
            return (
              <View
                key={i}
                style={[
                  styles.markerBadge,
                  { backgroundColor: catColor, opacity: isSelected ? 1 : 0.85 },
                  isSelected && styles.markerBadgeSelected,
                ]}
              />
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    height: 180,
    overflow: "hidden",
    backgroundColor: "#e8f4e8",
  },
  markersOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: "none" as any,
  },
  markerBadge: {
    position: "absolute",
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#fff",
  },
  markerBadgeSelected: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  coordText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  note: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
});
