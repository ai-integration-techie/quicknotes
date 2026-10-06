import { Component, type ErrorInfo, type ReactNode } from "react";
import { ERROR_FALLBACK } from "../copy";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

/**
 * Top-level error boundary (R23). React has no hook equivalent, so this is a
 * class component. Errors are logged to the console only: no reporting
 * service (R32).
 */
export default class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("QuickNotes failed to render", error, info.componentStack);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div
          role="alert"
          className="mx-auto max-w-3xl px-4 pt-16 text-center text-zinc-900"
        >
          {ERROR_FALLBACK}
        </div>
      );
    }
    return this.props.children;
  }
}
