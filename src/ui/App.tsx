import { useEffect, useState } from 'react';
import { Console } from './console/Console';
import { Display } from './display/Display';

const isDisplay = () => window.location.hash.startsWith('#/display');

export function App() {
  const [display, setDisplay] = useState(isDisplay());
  useEffect(() => {
    const onHash = () => setDisplay(isDisplay());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);
  return display ? <Display /> : <Console />;
}
