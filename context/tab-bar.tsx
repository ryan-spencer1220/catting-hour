import React, { createContext, useContext, useState } from "react";

type TabBarVisibility = {
  hidden: boolean;
  setHidden: (hidden: boolean) => void;
};

const TabBarContext = createContext<TabBarVisibility>({
  hidden: false,
  setHidden: () => {},
});

/**
 * Lets a screen (e.g. the map callout) temporarily slide the floating tab bar
 * out of the way so it doesn't obscure or intercept taps on overlaying UI.
 */
export function TabBarVisibilityProvider({ children }: { children: React.ReactNode }) {
  const [hidden, setHidden] = useState(false);
  return (
    <TabBarContext.Provider value={{ hidden, setHidden }}>
      {children}
    </TabBarContext.Provider>
  );
}

export function useTabBarVisibility() {
  return useContext(TabBarContext);
}
