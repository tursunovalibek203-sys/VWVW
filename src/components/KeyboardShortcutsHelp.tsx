import { useState, useEffect } from 'react';
import { Keyboard, X } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from './Card';
import Button from './Button';

export default function KeyboardShortcutsHelp() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Show shortcuts with Ctrl+/ or Cmd+/
      if ((e.ctrlKey || e.metaKey) && e.key === '/') {
        e.preventDefault();
        setIsOpen(true);
      }
      // Close with Escape
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isOpen]);

  const shortcuts = [
    { keys: ['Ctrl', 'K'], description: 'Global qidiruv' },
    { keys: ['Alt', 'H'], description: 'Bosh sahifa' },
    { keys: ['Alt', 'S'], description: 'Sotuvlar' },
    { keys: ['Alt', 'P'], description: 'Mahsulotlar' },
    { keys: ['Alt', 'C'], description: 'Mijozlar' },
    { keys: ['Alt', 'M'], description: 'Moliya' },
    { keys: ['Alt', 'R'], description: 'Hisobotlar' },
    { keys: ['Alt', 'O'], description: 'Sozlamalar' },
    { keys: ['Ctrl', '/'], description: 'Yordam (bu oyna)' },
    { keys: ['Esc'], description: 'Yopish' },
  ];

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 left-80 z-40 p-2 bg-muted hover:bg-accent rounded-lg transition-colors shadow-md"
        title="Klaviatura yorliqlari (Ctrl+/)"
      >
        <Keyboard className="w-5 h-5 text-muted-foreground" />
      </button>
    );
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-50"
        onClick={() => setIsOpen(false)}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl animate-slide-in">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Keyboard className="w-5 h-5" />
                <CardTitle>Klaviatura Yorliqlari</CardTitle>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-muted-foreground hover:text-foreground transition-colors"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {shortcuts.map((shortcut, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-muted rounded-lg"
                >
                  <span className="text-sm text-muted-foreground">
                    {shortcut.description}
                  </span>
                  <div className="flex gap-1">
                    {shortcut.keys.map((key, i) => (
                      <kbd
                        key={i}
                        className="px-2 py-1 text-xs font-semibold bg-background border border-border rounded shadow-sm"
                      >
                        {key}
                      </kbd>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <p className="text-sm text-blue-900 dark:text-blue-100">
                <strong>Maslahat:</strong> Klaviatura yorliqlaridan foydalanib tezroq ishlang!
                Global qidiruv uchun <kbd className="px-1 py-0.5 text-xs bg-white dark:bg-gray-800 border rounded">Ctrl+K</kbd> bosing.
              </p>
            </div>

            <div className="mt-4 flex justify-end">
              <Button onClick={() => setIsOpen(false)}>
                Yopish
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
