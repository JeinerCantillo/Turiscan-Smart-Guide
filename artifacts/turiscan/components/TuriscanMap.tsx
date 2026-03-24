import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import MapView, { Marker } from "react-native-maps";

export type MapPoint = {
  latitude: number;
  longitude: number;
  title?: string;
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
};

export function TuriscanMap({ latitude, longitude, title, allPoints, scrollEnabled = false, zoomEnabled = false, style, tintColor }: Props) {
  return (
    <MapView
      style={[styles.map, style]}
      initialRegion={{
        latitude,
        longitude,
        latitudeDelta: allPoints ? 0.03 : 0.005,
        longitudeDelta: allPoints ? 0.03 : 0.005,
      }}
      scrollEnabled={scrollEnabled}
      zoomEnabled={zoomEnabled}
    >
      {allPoints ? (
        allPoints.map((pt, i) => (
          <Marker key={i} coordinate={{ latitude: pt.latitude, longitude: pt.longitude }} title={pt.title} />
        ))
      ) : (
        <Marker coordinate={{ latitude, longitude }} title={title} />
      )}
    </MapView>
  );
}

const styles = StyleSheet.create({
  map: { width: "100%", height: 180 },
});
