'use client';

import React, { createContext, useContext, useState } from 'react';

interface NavContextType {
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
  toggleMobile: () => void;
  closeMobile: () => void;
}

const NavContext = createContext<NavContextType>({
  mobileOpen: false,
  setMobileOpen: () => {},
  toggleMobile: () => {},
  closeMobile: () => {},
});

export const NavProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mobileOpen, setMobileOpen] = useState(false);

  const toggleMobile = () => setMobileOpen((prev) => !prev);
  const closeMobile = () => setMobileOpen(false);

  return (
    <NavContext.Provider value={{ mobileOpen, setMobileOpen, toggleMobile, closeMobile }}>
      {children}
    </NavContext.Provider>
  );
};

export const useNav = () => useContext(NavContext);
