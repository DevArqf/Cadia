import { useEffect, useLayoutEffect } from "react";

/**
 * useIsomorphicLayoutEffect
 *
 * useLayoutEffect fires synchronously after DOM mutations but BEFORE the
 * browser paints — perfect for scroll resets, measurements, and other
 * effects that must happen before the user sees the rendered frame.
 *
 * BUT: useLayoutEffect logs a warning when used during SSR (it doesn't run
 * on the server, but React still complains). This helper picks the right
 * hook based on environment so we get the layout-timing on the client
 * without the SSR warning.
 *
 * Usage: identical to useEffect / useLayoutEffect.
 */
export const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;
