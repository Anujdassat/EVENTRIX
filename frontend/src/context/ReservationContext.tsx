import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReservationDTO } from '../types';
import { reservationsApi } from '../api/reservations.api';

interface ReservationContextType {
  activeReservation: ReservationDTO | null;
  remainingSeconds: number;
  formattedTime: string;
  isExpired: boolean;
  startReservation: (reservation: ReservationDTO) => void;
  cancelCurrentReservation: () => Promise<void>;
  clearReservation: () => void;
}

const ReservationContext = createContext<ReservationContextType | undefined>(undefined);

const STORAGE_KEY = 'bytevox_active_reservation';

export const ReservationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeReservation, setActiveReservation] = useState<ReservationDTO | null>(() => {
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed: ReservationDTO = JSON.parse(stored);
        const expiresAt = new Date(parsed.expiresAt).getTime();
        if (expiresAt > Date.now()) {
          return parsed;
        }
      }
    } catch {
      // ignore parse errors
    }
    return null;
  });

  const [remainingSeconds, setRemainingSeconds] = useState<number>(() => {
    if (!activeReservation) return 0;
    const diff = Math.floor((new Date(activeReservation.expiresAt).getTime() - Date.now()) / 1000);
    return Math.max(0, diff);
  });

  const clearReservation = useCallback(() => {
    setActiveReservation(null);
    setRemainingSeconds(0);
    sessionStorage.removeItem(STORAGE_KEY);
  }, []);

  const startReservation = useCallback((reservation: ReservationDTO) => {
    setActiveReservation(reservation);
    const diff = Math.floor((new Date(reservation.expiresAt).getTime() - Date.now()) / 1000);
    setRemainingSeconds(Math.max(0, diff));
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(reservation));
  }, []);

  const cancelCurrentReservation = useCallback(async () => {
    if (!activeReservation) return;
    try {
      await reservationsApi.cancel(activeReservation.id);
    } catch (err) {
      console.warn('Failed to cleanly cancel reservation on backend:', err);
    } finally {
      clearReservation();
    }
  }, [activeReservation, clearReservation]);

  // Synchronized countdown ticker
  useEffect(() => {
    if (!activeReservation) return;

    const interval = setInterval(() => {
      const diff = Math.floor((new Date(activeReservation.expiresAt).getTime() - Date.now()) / 1000);
      if (diff <= 0) {
        setRemainingSeconds(0);
        clearReservation();
      } else {
        setRemainingSeconds(diff);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [activeReservation, clearReservation]);

  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  const isExpired = !!activeReservation && remainingSeconds <= 0;

  return (
    <ReservationContext.Provider
      value={{
        activeReservation,
        remainingSeconds,
        formattedTime,
        isExpired,
        startReservation,
        cancelCurrentReservation,
        clearReservation,
      }}
    >
      {children}
    </ReservationContext.Provider>
  );
};

export function useReservation(): ReservationContextType {
  const context = useContext(ReservationContext);
  if (!context) {
    throw new Error('useReservation must be used within a ReservationProvider');
  }
  return context;
}
