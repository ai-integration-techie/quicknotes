/**
 * The hash routes (list-notes R20, plan API contract 2). A note route is a
 * hash starting with `#note/`; the rest of the hash is the id. Every other
 * hash is the list view. The URL holds only the id (R25).
 */

/** The note-storage R1 id form: a lowercase UUID v4. */
export const NOTE_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

const NOTE_PREFIX = "#note/";

export type Route =
  | { readonly kind: "list" }
  | { readonly kind: "note"; readonly id: string; readonly valid: boolean };

export const LIST_ROUTE: Route = Object.freeze({ kind: "list" });

/** The route for a `location.hash` value. */
export function parseRoute(hash: string): Route {
  if (!hash.startsWith(NOTE_PREFIX)) return LIST_ROUTE;
  const id = hash.slice(NOTE_PREFIX.length);
  return { kind: "note", id, valid: NOTE_ID_PATTERN.test(id) };
}

/** A note link's `href` (R5). */
export function noteHref(id: string): string {
  return `${NOTE_PREFIX}${id}`;
}

/** The app's own URL without a hash (R24): `/quicknotes/` in production. */
export function appUrl(
  location: Pick<Location, "pathname" | "search">,
): string {
  return location.pathname + location.search;
}
