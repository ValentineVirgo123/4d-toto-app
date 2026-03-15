import { createContext, useContext, type ReactNode } from 'react';
import { useResultsInteractor } from '../interactors/useResultsInteractor';
import type { FourDResult, TOTOResult } from '../entities/DrawResult';

interface ResultsCtx {
  fourdResults: FourDResult[];
  totoResults:  TOTOResult[];
  loading:      boolean;
  searching:    boolean;
  refreshing:   boolean;
  error:        string | null;
  fetch4D:      (isRefresh?: boolean, days?: number) => Promise<void>;
  fetchTOTO:    (isRefresh?: boolean, days?: number) => Promise<void>;
  searchByDate: (game: '4d' | 'toto', date: string) => Promise<boolean>;
  scrapeLatest: () => Promise<void>;
}

const Ctx = createContext<ResultsCtx | null>(null);

export function ResultsPresenter({ children }: { children: ReactNode }) {
  const ix = useResultsInteractor();

  return (
    <Ctx.Provider value={{
      fourdResults: ix.fourdResults,
      totoResults:  ix.totoResults,
      loading:      ix.loading,
      searching:    ix.searching,
      refreshing:   ix.refreshing,
      error:        ix.error,
      fetch4D:      ix.fetch4D,
      fetchTOTO:    ix.fetchTOTO,
      searchByDate: ix.searchByDate,
      scrapeLatest: ix.scrapeLatest,
    }}>
      {children}
    </Ctx.Provider>
  );
}

export function useResults(): ResultsCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useResults must be used inside <ResultsPresenter>');
  return ctx;
}
