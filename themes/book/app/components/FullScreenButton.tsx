import React, { useCallback, useEffect, useState } from 'react';

import { ArrowsPointingOutIcon } from '@heroicons/react/24/solid';
import { ArrowsPointingInIcon } from '@heroicons/react/24/solid';
export function FullScreenButton() {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const toggle = useCallback(() => {
    setIsFullscreen((prev) => !prev);
  }, []);

  useEffect(() => {
    if (isFullscreen) {
      document.body.classList.add('fullscreen');
    } else {
      document.body.classList.remove('fullscreen');
    }

    // Cleanup function to remove the class when component unmounts
    return () => {
      document.body.classList.remove('fullscreen');
    };
  }, [isFullscreen]);

  const ToggledIcon = isFullscreen ? ArrowsPointingInIcon : ArrowsPointingOutIcon;

  return (
    <button
      onClick={toggle}
      className="h-8 w-8 ml-3 rounded-full aspect-square border border-stone-700 dark:border-white hover:bg-neutral-100 border-solid overflow-hidden text-stone-700 dark:text-white hover:text-stone-500 dark:hover:text-neutral-800"
      title="Toggle fullscreen"
      aria-label="Toggle fullscreen"
      aria-pressed={isFullscreen}
    >
      <ToggledIcon className="h-full w-full p-0.5 text-text-slate-700 dark:text-slate-10" />
    </button>
  );
}
