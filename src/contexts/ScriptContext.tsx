import { createContext, useContext, useState, ReactNode, Fragment } from 'react';
import { getScript, setScript as persistScript, UiScript } from '../lib/transliterator';

interface ScriptContextType {
  script: UiScript;
  setScript: (script: UiScript) => void;
}

const ScriptContext = createContext<ScriptContextType | undefined>(undefined);

export function ScriptProvider({ children }: { children: ReactNode }) {
  const [script, setScriptState] = useState<UiScript>(() => getScript());

  const setScript = (next: UiScript) => {
    persistScript(next);
    setScriptState(next);
  };

  return (
    <ScriptContext.Provider value={{ script, setScript }}>
      {/* key=script: tilni almashtirganda butun daraxt qayta render bo'ladi,
          shunda kod ichida qattiq yozilgan (latinToCyrillic) va bazadan kelgan
          (trData) matnlar barchasi yangi yozuvda ko'rsatiladi */}
      <Fragment key={script}>{children}</Fragment>
    </ScriptContext.Provider>
  );
}

export function useScript() {
  const context = useContext(ScriptContext);
  if (!context) {
    throw new Error('useScript must be used within ScriptProvider');
  }
  return context;
}
