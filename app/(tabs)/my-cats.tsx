import React from "react";
import { StyleSheet, Text, View } from "react-native";

export default function MyCatsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Your cats will be listed here.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center" },
  text: { fontSize: 16, color: "#374151" },
});
