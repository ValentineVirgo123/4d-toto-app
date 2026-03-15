import { createContext, useContext, useEffect } from 'react';
import { useTicketInteractor } from '../interactors/useTicketInteractor';

const Ctx = createContext(null);

export function TicketPresenter({ children }) {
  const ix = useTicketInteractor();

  useEffect(() => { ix.fetchTickets(); }, []);

  return (
    <Ctx.Provider value={{
      tickets:      ix.tickets,
      loading:      ix.loading,
      error:        ix.error,
      refresh:      ix.fetchTickets,
      checkResult:  ix.checkResult,
      markRead:     ix.markNotificationRead,
    }}>
      {children}
    </Ctx.Provider>
  );
}

export function useTickets() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useTickets must be used inside <TicketPresenter>');
  return ctx;
}
