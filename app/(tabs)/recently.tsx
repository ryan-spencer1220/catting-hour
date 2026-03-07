import React from "react";
import { StyleSheet, Text, View } from "react-native";

export default function RecentlyScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Recently added cats will appear here.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center" },
  text: { fontSize: 16, color: "#374151" },
});
