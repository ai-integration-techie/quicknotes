import AppHeader from "./components/AppHeader";
import EmptyState from "./components/EmptyState";

export default function App() {
  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="mx-auto w-full max-w-3xl px-4 sm:px-6">
        <EmptyState />
      </main>
    </div>
  );
}
