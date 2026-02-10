import React, { useMemo, useState } from 'react';

interface BrandLogoProps {
  className?: string;
  rounded?: boolean;
}

const logoCandidates = [
  '/logo-user.png',
  '/logo-user.jpg',
  '/logo-user.jpeg',
  '/logo-user.webp',
  '/logo-user.avif',
  '/logo-milena.svg',
  '/favicon.svg'
];

export const BrandLogo: React.FC<BrandLogoProps> = ({ className = 'h-10 w-10', rounded = false }) => {
  const [logoIndex, setLogoIndex] = useState(0);

  const currentLogo = useMemo(
    () => logoCandidates[Math.min(logoIndex, logoCandidates.length - 1)],
    [logoIndex]
  );

  return (
    <img
      src={currentLogo}
      alt="Logo Les douceurs de Miléna"
      className={`${className} ${rounded ? 'rounded-xl' : ''} object-contain`}
      onError={() => setLogoIndex(prev => Math.min(prev + 1, logoCandidates.length - 1))}
    />
  );
};
