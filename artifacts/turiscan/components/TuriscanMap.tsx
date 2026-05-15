import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import MapView, { Marker, Callout } from "react-native-maps";

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

function getCategoryColor(category?: string): string {
  return (category && CATEGORY_COLORS[category]) ?? "#1A6B4A";
}

export function TuriscanMap({
  latitude,
  longitude,
  title,
  allPoints,
  scrollEnabled = false,
  zoomEnabled = false,
  style,
  tintColor,
  onMarkerPress,
  selectedIndex,
}: Props) {
  return (
    <MapView
      style={[styles.map, style]}
      initialRegion={{
        latitude,
        longitude,
        latitudeDelta: allPoints ? 0.025 : 0.004,
        longitudeDelta: allPoints ? 0.025 : 0.004,
      }}
      scrollEnabled={scrollEnabled}
      zoomEnabled={zoomEnabled}
    >
      {allPoints ? (
        allPoints.map((pt, i) => {
          const color = getCategoryColor(pt.category);
          const isSelected = selectedIndex === i;
          return (
            <Marker
              key={i}
              coordinate={{ latitude: pt.latitude, longitude: pt.longitude }}
              onPress={() => onMarkerPress?.(pt, i)}
              zIndex={isSelected ? 10 : 1}
            >
              <View style={[
                styles.customMarker,
                { backgroundColor: color, borderColor: "#fff" },
                isSelected && styles.customMarkerSelected,
              ]}>
                <View style={[styles.markerDot, { backgroundColor: "#fff" }]} />
              </View>
            </Marker>
          );
        })
      ) : (
        <Marker
          coordinate={{ latitude, longitude }}
          title={title}
        >
          <View style={[styles.customMarker, { backgroundColor: tintColor ?? "#1A6B4A", borderColor: "#fff" }]}>
            <View style={[styles.markerDot, { backgroundColor: "#fff" }]} />
          </View>
        </Marker>
      )}
    </MapView>
  );
}

const styles = StyleSheet.create({
  map: { width: "100%", height: 180 },
  customMarker: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 3,
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
  },
  customMarkerSelected: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 4,
  },
  markerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
