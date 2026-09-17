// Sets the browser tab title to "{title} · StashHub", or "StashHub" when no
// title is passed.

import { useEffect } from "react";

export function useDocumentTitle(title?: string) {
  useEffect(() => {
    document.title = title ? `${title} · StashHub` : "StashHub";
  }, [title]);
}
