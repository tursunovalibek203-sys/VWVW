import { useScript } from '../contexts/ScriptContext';

interface LanguageSwitcherProps {
  iconOnly?: boolean;
}

const OPTIONS: { code: 'latin' | 'cyrillic'; label: string; name: string }[] = [
  { code: 'latin', label: 'UZB', name: "O'zbekcha (lotin)" },
  { code: 'cyrillic', label: 'KRIL', name: 'Ўзбекча (Крилча)' },
];

export default function LanguageSwitcher({ iconOnly = false }: LanguageSwitcherProps) {
  const { script, setScript } = useScript();

  if (iconOnly) {
    const current = OPTIONS.find((o) => o.code === script) || OPTIONS[1];
    return (
      <button
        onClick={() => setScript(script === 'latin' ? 'cyrillic' : 'latin')}
        title={current.name}
        className="w-9 h-9 flex items-center justify-center rounded-xl text-[10px] font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition-colors"
      >
        {current.code === 'latin' ? 'UZB' : 'KR'}
      </button>
    );
  }

  return (
    <div className="flex w-full p-0.5 rounded-lg bg-slate-100 border border-slate-200">
      {OPTIONS.map((opt) => (
        <button
          key={opt.code}
          onClick={() => setScript(opt.code)}
          title={opt.name}
          className={`flex-1 px-2 py-1.5 rounded-md text-xs font-bold tracking-wide transition-all ${
            script === opt.code
              ? 'bg-white text-indigo-600 shadow-sm'
              : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
