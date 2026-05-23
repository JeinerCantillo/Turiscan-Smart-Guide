import React, { useRef, useEffect, forwardRef } from "react";
import { View, StyleSheet } from "react-native";
import MapView, { Marker, Circle } from "react-native-maps";

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
  showsUserLocation?: boolean;
  userLocation?: { latitude: number; longitude: number } | null;
  animateToUser?: boolean;
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
  showsUserLocation = false,
  userLocation,
  animateToUser = false,
}: Props) {
  const mapRef = useRef<MapView>(null);

  // Animate map to user position when it becomes available
  useEffect(() => {
    if (animateToUser && userLocation && mapRef.current) {
      mapRef.current.animateToRegion(
        {
          latitude: userLocation.latitude,
          longitude: userLocation.longitude,
          latitudeDelta: 0.005,
          longitudeDelta: 0.005,
        },
        900
      );
    }
  }, [userLocation, animateToUser]);

  return (
    <MapView
      ref={mapRef}
      style={[styles.map, style]}
      initialRegion={{
        latitude,
        longitude,
        latitudeDelta: allPoints ? 0.025 : 0.004,
        longitudeDelta: allPoints ? 0.025 : 0.004,
      }}
      scrollEnabled={scrollEnabled}
      zoomEnabled={zoomEnabled}
      showsUserLocation={showsUserLocation}
      showsMyLocationButton={false}
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
              <View
                style={[
                  styles.customMarker,
                  { backgroundColor: color, borderColor: "#fff" },
                  isSelected && styles.customMarkerSelected,
                ]}
              >
                <View style={[styles.markerDot, { backgroundColor: "#fff" }]} />
              </View>
            </Marker>
          );
        })
      ) : (
        <Marker coordinate={{ latitude, longitude }} title={title}>
          <View
            style={[
              styles.customMarker,
              { backgroundColor: tintColor ?? "#1A6B4A", borderColor: "#fff" },
            ]}
          >
            <View style={[styles.markerDot, { backgroundColor: "#fff" }]} />
          </View>
        </Marker>
      )}

      {/* Fallback user-location marker (for web where showsUserLocation doesn't work) */}
      {userLocation && (
        <>
          <Circle
            center={userLocation}
            radius={60}
            strokeColor="rgba(26,95,122,0.3)"
            fillColor="rgba(26,95,122,0.12)"
            strokeWidth={1}
          />
          <Marker coordinate={userLocation} zIndex={20} anchor={{ x: 0.5, y: 0.5 }}>
            <View style={styles.userMarkerOuter}>
              <View style={[styles.userMarkerInner, { backgroundColor: tintColor ?? "#1A5F7A" }]} />
            </View>
          </Marker>
        </>
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
  markerDot: { width: 8, height: 8, borderRadius: 4 },
  userMarkerOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "rgba(255,255,255,0.9)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#1A5F7A",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 6,
  },
  userMarkerInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
});
