import React from 'react';

interface ChannelLogoProps {
  logo: string;
  name: string;
  className?: string;
  fallbackSize?: string;
}

export default function ChannelLogo({ 
  logo, 
  name, 
  className = "w-6 h-6 object-contain rounded-sm shrink-0",
  fallbackSize = "text-xl"
}: ChannelLogoProps) {
  const isUrl = logo && (
    logo.startsWith('http://') || 
    logo.startsWith('https://') || 
    logo.startsWith('data:image/') || 
    logo.startsWith('/') ||
    logo.includes('.')
  );

  if (isUrl) {
    return (
      <img
        src={logo}
        alt={name}
        referrerPolicy="no-referrer"
        className={className}
        onError={(e) => {
          // Fallback if the logo URL fails to load
          e.currentTarget.onerror = null; 
          e.currentTarget.style.display = 'none';
          const parent = e.currentTarget.parentElement;
          if (parent) {
            const fallbackSpan = document.createElement('span');
            fallbackSpan.className = fallbackSize;
            fallbackSpan.innerText = '📺';
            parent.appendChild(fallbackSpan);
          }
        }}
      />
    );
  }

  // Fallback to text / emoji representation
  return (
    <span className={`${fallbackSize} font-bold shrink-0`}>
      {logo || '📺'}
    </span>
  );
}
