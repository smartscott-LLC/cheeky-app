'use client';

import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Lightweight error boundary for the Cheeky Lounge.
 *
 * Without this, any uncaught exception inside ClubChat (RLS denial, missing
 * table, race condition on presence tracking) swallows the entire component
 * — button vanishes, panel never appears. With it we get a visible error
 * state and a retry button so members aren't locked out forever.
 */
export default class ClubChatBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ClubChat boundary]', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="fixed bottom-20 right-5 z-50 flex h-12 w-12 items-center justify-center rounded-full border border-club/50 bg-zinc-900 shadow-[0_0_20px_rgba(246,5,186,0.3)]">
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            title="Lounge error — click to retry"
            className="flex h-full w-full flex-col items-center justify-center gap-0.5"
          >
            <span className="text-lg">🍸</span>
            <span className="text-[8px] text-club">err</span>
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
