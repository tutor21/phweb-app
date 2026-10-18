
'use client';

import {
  Sun,
  Moon,
  Trees,
  Check,
} from 'lucide-react';

import {
  useSocialsTheme,
  type SocialsTheme,
} from '@/app/components/ThemeProvider';

const themes: {
  id: SocialsTheme;
  name: string;
  description: string;
  Icon: typeof Sun;
}[] = [
  {
    id: 'light',
    name: 'Light',
    description: 'Clean and bright',
    Icon: Sun,
  },
  {
    id: 'dark',
    name: 'Dark',
    description: 'Comfortable dark mode',
    Icon: Moon,
  },
  {
    id: 'forest',
    name: 'Black Forest',
    description: 'Deep green and near-black',
    Icon: Trees,
  },
];

export default function ThemeSelector() {
  const { theme, setTheme } = useSocialsTheme();

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">
          Appearance
        </h2>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          Choose how Socials looks on this device.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {themes.map(({ id, name, description, Icon }) => {
          const selected = theme === id;

          return (
            <button
              key={id}
              type="button"
              onClick={() => setTheme(id)}
              aria-pressed={selected}
              className={`rounded-2xl border p-4 text-left transition-colors ${
                selected
                  ? 'border-blue-500 ring-2 ring-blue-500/30'
                  : 'border-neutral-200 dark:border-neutral-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <Icon size={22} />
                {selected && <Check size={18} />}
              </div>

              <div className="mt-3 font-semibold">
                {name}
              </div>

              <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                {description}
              </p>
            </button>
          );
        })}
      </div>
    </section>
  );
}
