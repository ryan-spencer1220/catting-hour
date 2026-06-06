import { useColorScheme } from "@/hooks/use-color-scheme";
import { fetchAllCats } from "@/lib/cats";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Animated, FlatList, Image, Pressable, RefreshControl, SafeAreaView, StyleSheet, Text, View } from "react-native";

export default function RecentlyScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const dark = colorScheme === "dark";

  const [cats, setCats] = useState<any[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const fetchingOpacity = useRef(new Animated.Value(0)).current;

  function animateFetchLabel(visible: boolean) {
    Animated.timing(fetchingOpacity, {
      toValue: visible ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }

  async function loadCats(opts?: { refresh?: boolean }) {
    if (opts?.refresh) {
      setRefreshing(true);
      animateFetchLabel(true);
    }
    try {
      const rows = await fetchAllCats();
      setCats(rows);
    } catch {
      setCats([]);
    } finally {
      if (opts?.refresh) {
        animateFetchLabel(false);
        setRefreshing(false);
      }
    }
  }

  useEffect(() => {
    loadCats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sorted = useMemo(() => {
    try {
      return (cats || []).slice().sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } catch {
      return [];
    }
  }, [cats]);

  function renderItem({ item }: { item: any }) {
    return (
      <Pressable style={[styles.card, dark && styles.darkCard]} onPress={() => router.push(`/cats/${item.id}`)}>
        {item.image ? <Image source={{ uri: item.image }} style={styles.image} /> : <View style={[styles.imagePlaceholder, dark && styles.darkPlaceholder]} />}
        <View style={styles.info}>
          <Text style={[styles.name, dark && styles.darkText]}>{item.name}</Text>
          <Text style={styles.meta}>
            {item.type} · {item.temperament}
          </Text>
          <Text style={styles.time}>{new Date(item.createdAt).toLocaleString()}</Text>
        </View>
      </Pressable>
    );
  }

  return (
    <SafeAreaView style={[styles.container, dark && styles.darkBg]}>
      <Text style={[styles.heading, dark && styles.darkText]}>Recently Added</Text>
      <Animated.Text style={[styles.fetchingLabel, dark && styles.fetchingLabelDark, { opacity: fetchingOpacity }]}>
        🐱 fetching cats...
      </Animated.Text>
      {cats === null ? (
        <ActivityIndicator color={dark ? "#fff" : "#111"} />
      ) : (
        <FlatList
          data={sorted}
          keyExtractor={(i) => String(i.id)}
          renderItem={renderItem}
          ItemSeparatorComponent={() => <View style={styles.sep} />}
          contentContainerStyle={{ padding: 12 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadCats({ refresh: true })}
              tintColor={dark ? "#a78bfa" : "#111827"}
              colors={["#a78bfa"]}
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  darkBg: { backgroundColor: "#0f1720" },
  darkText: { color: "#fff" },
  card: { flexDirection: "row", alignItems: "center", padding: 12, backgroundColor: "#f9fafb", borderRadius: 8 },
  darkCard: { backgroundColor: "#1a2535" },
  image: { width: 72, height: 72, borderRadius: 8, marginRight: 12 },
  imagePlaceholder: { width: 72, height: 72, borderRadius: 8, marginRight: 12, backgroundColor: "#e5e7eb" },
  darkPlaceholder: { backgroundColor: "#2d3f55" },
  info: { flex: 1 },
  name: { fontSize: 16, fontWeight: "700", color: "#111827" },
  meta: { color: "#6b7280", marginTop: 4 },
  time: { color: "#9ca3af", marginTop: 6, fontSize: 12 },
  sep: { height: 12 },
  heading: { fontSize: 24, fontWeight: "700", color: "#111827", paddingHorizontal: 16, paddingTop: 16, paddingBottom: 4 },
  fetchingLabel: { fontSize: 13, color: "#9ca3af", paddingHorizontal: 16, paddingBottom: 8, fontStyle: "italic" },
  fetchingLabelDark: { color: "#6b7280" },
});
