import { useEffect, useState } from 'react';

/** `devicePixelRatio`, kept current as the window moves between screens or scales. */
export function useScreenDensity(): number {
  const [ratio, setRatio] = useState(() => window.devicePixelRatio || 1);

  useEffect(() => {
    // A resolution query only fires on leaving this value, so it's renewed each time.
    const query = window.matchMedia(`(resolution: ${ratio}dppx)`);
    const update = () => setRatio(window.devicePixelRatio || 1);
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, [ratio]);

  return ratio;
}
