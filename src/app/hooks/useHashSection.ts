import { useEffect, useState } from "react";

import type { AppSection } from "../../types";

const validSections = new Set<AppSection>(["overview", "data", "analyze", "advanced"]);

const readSection = (): AppSection => {
  const hash = window.location.hash.replace(/^#/, "");
  return validSections.has(hash as AppSection) ? (hash as AppSection) : "overview";
};

export const useHashSection = () => {
  const [section, setSectionState] = useState<AppSection>(() =>
    typeof window === "undefined" ? "overview" : readSection(),
  );

  useEffect(() => {
    const handleHashChange = () => {
      setSectionState(readSection());
    };

    handleHashChange();
    window.addEventListener("hashchange", handleHashChange);

    return () => {
      window.removeEventListener("hashchange", handleHashChange);
    };
  }, []);

  const setSection = (nextSection: AppSection) => {
    window.location.hash = nextSection;
    setSectionState(nextSection);
  };

  return { section, setSection };
};
