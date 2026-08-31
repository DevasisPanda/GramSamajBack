import React from 'react';

export const FloatingWhatsAppBadge: React.FC = () => {
  const whatsappUrl = "https://wa.me/919415014644?text=Hello%20AIRD%20Trust";

  return (
    <a
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-4 right-4 z-[9999] block transition-transform duration-300 hover:scale-105 active:scale-95 drop-shadow-[0_8px_20px_rgba(0,0,0,0.5)] group"
      title="Contact AIRD Trust on WhatsApp - 9415014644"
    >
      <img
        src="/Work1.png"
        alt="Official Partner - Starbiz360"
        className="h-11 sm:h-12 md:h-14 w-auto object-contain drop-shadow-xl"
      />
    </a>
  );
};

export default FloatingWhatsAppBadge;
