import { HINT_APPLE, HINT_OTHER } from "../copy";

const APPLE_PLATFORM = /^(?:Mac|iPhone|iPad|iPod)/;

/**
 * R35, D6: the shortcut hint for the reported platform. iPadOS reports
 * "MacIntel"; an empty or unknown platform gets the Ctrl hint.
 */
export function shortcutHint(platform: string): string {
  return APPLE_PLATFORM.test(platform) ? HINT_APPLE : HINT_OTHER;
}
