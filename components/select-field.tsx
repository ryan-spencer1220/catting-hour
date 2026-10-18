import { useAccent } from "@/context/theme";
import { Check, ChevronRight } from "lucide-react-native";
import React, { useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Props = {
  value: string;
  options: string[];
  onChange: (val: string) => void;
  dark: boolean;
  placeholder?: string;
  /** Name of the field read by screen readers, for example "Type". */
  label?: string;
};

export function SelectField({ value, options, onChange, dark, placeholder = "Select…", label }: Props) {
  const accent = useAccent();
  const [open, setOpen] = useState(false);
  const insets = useSafeAreaInsets();

  const borderColor = dark ? "#374151" : "#e5e7eb";
  const bg = dark ? "#1a2535" : "#fff";
  const sheetBg = dark ? "#1a2535" : "#fff";
  const textColor = dark ? "#fff" : "#111827";
  const mutedColor = dark ? "#6b7280" : "#9ca3af";
  const separatorColor = dark ? "#1e2d3d" : "#f3f4f6";
  const activeBg = dark ? "#2d3f55" : "#f3f4f6";
  const chevronColor = dark ? "#6b7280" : "#9ca3af";

  function select(option: string) {
    onChange(option);
    setOpen(false);
  }

  return (
    <>
      <Pressable
        style={[styles.field, { borderColor, backgroundColor: bg }]}
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={`${label ? `${label}, ` : ""}${value || "Not selected"}`}
        accessibilityHint="Opens a list of options"
        accessibilityState={{ expanded: open }}
      >
        <Text style={[styles.fieldText, { color: value ? textColor : mutedColor }]}>
          {value || placeholder}
        </Text>
        <ChevronRight size={18} color={chevronColor} accessible={false} />
      </Pressable>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <Pressable
          style={styles.backdrop}
          onPress={() => setOpen(false)}
          accessibilityRole="button"
          accessibilityLabel="Close options"
        />

        <View
          style={[styles.sheet, { backgroundColor: sheetBg, paddingBottom: insets.bottom + 8 }]}
          accessibilityViewIsModal
        >
          <View importantForAccessibility="no" style={[styles.handle, { backgroundColor: dark ? "#374151" : "#d1d5db" }]} />

          <ScrollView bounces={false} showsVerticalScrollIndicator={false}>
            {options.map((opt, i) => (
              <Pressable
                key={opt}
                style={({ pressed }) => [
                  styles.option,
                  i < options.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: separatorColor },
                  (pressed || opt === value) && { backgroundColor: activeBg },
                ]}
                onPress={() => select(opt)}
                accessibilityRole="button"
                accessibilityLabel={opt}
                accessibilityState={{ selected: opt === value }}
              >
                <Text style={[styles.optionText, { color: textColor }]}>{opt}</Text>
                {opt === value ? (
                  <Check size={16} color={dark ? accent : "#111827"} />
                ) : null}
              </Pressable>
            ))}
          </ScrollView>

          <Pressable
            style={[styles.cancelBtn, { borderTopColor: separatorColor }]}
            onPress={() => setOpen(false)}
            accessibilityRole="button"
          >
            <Text style={[styles.cancelText, { color: dark ? accent : "#111827" }]}>Cancel</Text>
          </Pressable>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  field: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 11,
  },
  fieldText: { fontSize: 15 },

  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  sheet: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: "65%",
    paddingTop: 12,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 8,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  optionText: { fontSize: 16 },
  cancelBtn: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 4,
  },
  cancelText: { fontSize: 16, fontWeight: "600" },
});
