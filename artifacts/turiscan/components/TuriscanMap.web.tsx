import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";

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

export function TuriscanMap({ latitude, longitude, style, tintColor }: Props) {
  const color = tintColor ?? "#1A6B4A";
  return (
    <View style={[styles.container, style]}>
      <Feather name="map-pin" size={28} color={color} />
      <Text style={[styles.coordText, { color: "#888" }]}>
        {latitude.toFixed(5)}, {longitude.toFixed(5)}
      </Text>
      <Text style={[styles.note, { color: "#aaa" }]}>
        Mapa disponible en app móvil
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    height: 180,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f5f5f5",
    gap: 6,
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
