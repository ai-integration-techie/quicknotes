import { APP_NAME } from "../copy";

export default function AppHeader() {
  return (
    <header className="border-b border-zinc-200 bg-white px-4 py-4 sm:px-6">
      <h1 className="text-xl font-semibold text-zinc-900">{APP_NAME}</h1>
    </header>
  );
}
