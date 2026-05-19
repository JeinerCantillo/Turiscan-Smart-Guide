import React, { useRef, useState } from "react";
import {
  View,
  FlatList,
  Image,
  StyleSheet,
  Dimensions,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from "react-native";
import { Feather } from "@expo/vector-icons";

const { width } = Dimensions.get("window");

interface PlaceCarouselProps {
  imageUrl?: string | null;
  galleryUrls?: string[] | null;
  height: number;
  children?: React.ReactNode;
  placeholderIcon?: string;
  placeholderColor?: string;
}

export function PlaceCarousel({
  imageUrl,
  galleryUrls,
  height,
  children,
  placeholderIcon = "image",
  placeholderColor = "#C8DFF0",
}: PlaceCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const listRef = useRef<FlatList>(null);

  // Build images array: imageUrl first, then extra gallery images (deduped)
  const allImages: string[] = [];
  if (imageUrl) allImages.push(imageUrl);
  if (galleryUrls && Array.isArray(galleryUrls)) {
    galleryUrls.forEach((u) => {
      if (u && !allImages.includes(u)) allImages.push(u);
    });
  }

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / width);
    if (idx !== activeIndex) setActiveIndex(idx);
  };

  if (allImages.length === 0) {
    return (
      <View style={[styles.placeholder, { height, backgroundColor: placeholderColor }]}>
        <Feather name={placeholderIcon as any} size={64} color="rgba(0,0,0,0.2)" />
        {children}
      </View>
    );
  }

  return (
    <View style={{ height, width }}>
      <FlatList
        ref={listRef}
        data={allImages}
        keyExtractor={(item, i) => `${item}_${i}`}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        scrollEventThrottle={16}
        bounces={false}
        renderItem={({ item }) => (
          <Image
            source={{ uri: item }}
            style={{ width, height }}
            resizeMode="cover"
          />
        )}
      />

      {/* Dots */}
      {allImages.length > 1 && (
        <View style={styles.dotsContainer}>
          {allImages.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                i === activeIndex ? styles.dotActive : styles.dotInactive,
              ]}
            />
          ))}
        </View>
      )}

      {/* Page indicator (top right) */}
      {allImages.length > 1 && (
        <View style={styles.pageIndicator}>
          <View style={styles.pageIndicatorPill}>
            <Feather name="image" size={10} color="#fff" />
            <View style={styles.pageIndicatorText}>
              {/* rendered as part of the pill */}
            </View>
          </View>
        </View>
      )}

      {/* Overlay children (back button, badges, vr button, etc.) */}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  placeholder: {
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  dotsContainer: {
    position: "absolute",
    bottom: 14,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  dotActive: {
    width: 18,
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
  },
  dotInactive: {
    width: 6,
    backgroundColor: "rgba(255,255,255,0.55)",
  },
  pageIndicator: {
    position: "absolute",
    top: 12,
    right: 12,
  },
  pageIndicatorPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(0,0,0,0.45)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  pageIndicatorText: {},
});
