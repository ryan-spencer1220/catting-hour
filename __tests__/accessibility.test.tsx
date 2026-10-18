import { EmptyState } from "@/components/empty-state";
import { SelectField } from "@/components/select-field";
import { fireEvent, render, screen } from "@testing-library/react-native";
import React from "react";
import { Text } from "react-native";

jest.mock("@/context/theme", () => ({ useAccent: () => "#1B5091" }));
jest.mock("@/hooks/use-color-scheme", () => ({ useColorScheme: () => "light" }));
jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

describe("SelectField accessibility", () => {
  it("announces the field name and the current value", async () => {
    await render(
      <SelectField label="Type" value="Tabby" options={["Tabby", "Calico"]} onChange={jest.fn()} dark={false} />,
    );
    expect(screen.getByRole("button", { name: "Type, Tabby" })).toBeTruthy();
  });

  it("says when nothing is selected yet", async () => {
    await render(<SelectField label="Type" value="" options={["Tabby"]} onChange={jest.fn()} dark={false} />);
    expect(screen.getByRole("button", { name: "Type, Not selected" })).toBeTruthy();
  });

  it("marks the chosen option as selected", async () => {
    await render(
      <SelectField label="Type" value="Calico" options={["Tabby", "Calico"]} onChange={jest.fn()} dark={false} />,
    );
    await fireEvent.press(screen.getByRole("button", { name: "Type, Calico" }));
    expect(screen.getByRole("button", { name: "Calico", selected: true })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Tabby", selected: false })).toBeTruthy();
  });
});

describe("EmptyState accessibility", () => {
  it("exposes the title as a header and the call to action as a button", async () => {
    await render(
      <EmptyState
        icon={<Text>icon</Text>}
        title="No cats spotted nearby"
        cta={{ label: "Open Settings", onPress: jest.fn() }}
      />,
    );
    expect(screen.getByRole("header", { name: "No cats spotted nearby" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Open Settings" })).toBeTruthy();
  });
});
