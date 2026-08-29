'use client';

import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  name?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorAt: string;
}

export default class ClubChatBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorAt: '' };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorAt: new Date().toISOString() };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Log to console so we can see it in DevTools even if the boundary
    // fallback renders and hides the error visually.
    console.error(
      `[ClubChat:${this.props.name ?? 'unknown'}] boundary caught`,
      error,
      info.componentStack
    );
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          className="fixed bottom-20 right-5 z-50 flex h-12 w-12 cursor-pointer items-center justify-center rounded-full border border-red-500/60 bg-zinc-900 shadow-[0_0_20px_rgba(239,68,68,0.4)]"
          onClick={() => this.setState({ hasError: false, error: null, errorAt: '' })}
          title={`Lounge error at ${this.state.errorAt} — click to retry`}
        >
          <span className="text-base">🍸</span>
          <span className="absolute -bottom-0.5 -right-0.5 text-[8px] text-red-400">!</span>
        </div>
      );
    }
    return this.props.children;
  }
}
