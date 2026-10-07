import { INFO_PRIMARY, INFO_SECONDARY } from "../copy";

/** Static info text below the form (create-note R33). It never reads storage. */
export default function InfoText() {
  return (
    <div className="mt-12 text-center break-words">
      <p className="text-lg font-medium text-zinc-900">{INFO_PRIMARY}</p>
      <p className="text-base text-zinc-600">{INFO_SECONDARY}</p>
    </div>
  );
}
