// ROUTER layer — thin shell.
// All rendering lives in src/views/home/HomeView.tsx
// All data fetching lives in src/interactors/useTicketInteractor.ts
// Shared state comes from src/presenters/TicketPresenter.tsx (mounted in _layout.tsx)
import { HomeView } from '@/src/views/home/HomeView';
export default HomeView;
