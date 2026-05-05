import { NavigateFunction } from 'react-router-dom';

export function navigateBack(navigate: NavigateFunction, fallbackRoute: string) {
  const idx = window.history.state?.idx;
  if (typeof idx === 'number' && idx > 0) {
    navigate(-1);
    return;
  }

  navigate(fallbackRoute, { replace: true });
}
