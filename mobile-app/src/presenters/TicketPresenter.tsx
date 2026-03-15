import { createContext, useContext, useEffect, type ReactNode } from 'react';
import { useTicketInteractor } from '../interactors/useTicketInteractor';
import type { Ticket, OcrResult } from '../entities/Ticket';

interface TicketCtx {
  tickets:      Ticket[];
  loading:      boolean;
  refreshing:   boolean;
  error:        string | null;
  refresh:      () => void;
  fetchTickets: (limit?: number) => Promise<void>;
  uploadTicket: (uri: string) => Promise<OcrResult>;
  takePhoto:    () => Promise<string | null>;
  pickImage:    () => Promise<string | null>;
  checkResult:  (id: string) => Promise<unknown>;
  markRead:     (id: string) => Promise<unknown>;
  deleteTicket: (id: string) => Promise<void>;
}

const Ctx = createContext<TicketCtx | null>(null);

export function TicketPresenter({ children }: { children: ReactNode }) {
  const ix = useTicketInteractor();

  // Pre-load tickets when the presenter mounts (app start)
  useEffect(() => { ix.fetchTickets(); }, []);

  return (
    <Ctx.Provider value={{
      tickets:      ix.tickets,
      loading:      ix.loading,
      refreshing:   ix.refreshing,
      error:        ix.error,
      refresh:      ix.refresh,
      fetchTickets: ix.fetchTickets,
      uploadTicket: ix.uploadTicket,
      takePhoto:    ix.takePhoto,
      pickImage:    ix.pickImage,
      checkResult:  ix.checkResult,
      markRead:     ix.markNotificationRead,
      deleteTicket: ix.deleteTicket,
    }}>
      {children}
    </Ctx.Provider>
  );
}

export function useTickets(): TicketCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useTickets must be used inside <TicketPresenter>');
  return ctx;
}
