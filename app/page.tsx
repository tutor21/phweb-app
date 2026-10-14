import AppShell from './components/AppShell';

export default function Home() {
  return (
    <AppShell>
      <div className="p-4 space-y-4">
        <div className="border border-neutral-200 dark:border-neutral-800 rounded-xl p-6 text-center">
          <h1 className="text-xl font-semibold mb-2">Welcome to phweb.app</h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Phase 2 complete: Responsive layout, mobile bottom bar, desktop sidebar, PWA manifest, and dark mode are active.
          </p>
        </div>
      </div>
    </AppShell>
  );
}