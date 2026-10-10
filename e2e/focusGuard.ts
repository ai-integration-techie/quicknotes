import type { Locator } from "@playwright/test";

/** focus-outline-guard: options for {@link clippingReasons}. */
export type GuardOptions = {
  /**
   * Check `overflow-x`/`overflow-y` on every ancestor (default `true`).
   *
   * `{ overflow: false }` is the dialog exemption (focus-outline-guard R3):
   * use it only for the confirm-dialog buttons, whose dialog box may scroll
   * (edit-delete-note AC-49). Containment is still checked on the element
   * and every ancestor.
   */
  overflow?: boolean;
};

/**
 * focus-outline-guard R1, R2, R4: every computed style on the element and
 * its ancestors (up to and including `<html>`) that could clip its focus
 * outline, as `<tag>[#id][ (self)] <property>: <value>` strings, self first.
 * An empty list means the outline cannot be clipped by these properties.
 */
export function clippingReasons(
  locator: Locator,
  options: GuardOptions = {},
): Promise<string[]> {
  const checkOverflow = options.overflow !== false;
  return locator.evaluate((target, overflow) => {
    const PAINT_KEYWORDS = ["paint", "strict", "content"];
    const reasons: string[] = [];
    for (let el: Element | null = target; el; el = el.parentElement) {
      const self = el === target;
      const name =
        el.tagName.toLowerCase() +
        (el.id ? `#${el.id}` : "") +
        (self ? " (self)" : "");
      const style = getComputedStyle(el);
      const visibility = style.getPropertyValue("content-visibility");
      if (visibility && visibility !== "visible")
        reasons.push(`${name} content-visibility: ${visibility}`);
      const contain = style.getPropertyValue("contain") || "none";
      if (contain.split(/\s+/).some((t) => PAINT_KEYWORDS.includes(t)))
        reasons.push(`${name} contain: ${contain}`);
      if (overflow && !self) {
        if (style.overflowX !== "visible")
          reasons.push(`${name} overflow-x: ${style.overflowX}`);
        if (style.overflowY !== "visible")
          reasons.push(`${name} overflow-y: ${style.overflowY}`);
      }
    }
    return reasons;
  }, checkOverflow);
}
