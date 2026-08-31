import { Component, type ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  children: ReactNode;
  /** Changing this value resets the boundary (e.g. pass the current route path). */
  resetKey?: string;
}

interface State {
  hasError: boolean;
}

/**
 * Catches render-time errors in the routed content so a single failing page
 * shows a friendly, recoverable message instead of a blank white screen.
 * Resets automatically when `resetKey` changes (i.e. on navigation).
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    // The error itself is deliberately not kept: nothing renders it, and state
    // that exists only to be accidentally displayed later is a hazard.
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Development only. In a production build this would print the component
    // stack — and, for an error raised from a failed request, the Axios error
    // object, whose `config.headers` carries the caller's bearer token — into
    // a console that any bystander or screen-share can read.
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.error('ErrorBoundary caught:', error, info.componentStack);
    }
  }

  componentDidUpdate(prevProps: Props) {
    // Auto-recover when navigating to a different route.
    if (this.state.hasError && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ hasError: false });
    }
  }

  private handleRetry = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-[50vh] items-center justify-center px-4">
          <div className="max-w-md rounded-lg border border-border bg-card p-8 text-center shadow-xs">
            <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-destructive/10 text-destructive">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <h2 className="text-base font-semibold text-foreground">Something went wrong</h2>
            <p className="mt-1.5 text-sm text-muted-foreground">
              This page hit an unexpected error. You can try again — your session is still active.
            </p>
            <div className="mt-5 flex justify-center gap-2">
              <Button variant="outline" onClick={() => window.location.reload()}>
                Reload page
              </Button>
              <Button onClick={this.handleRetry}>
                <RotateCcw className="h-4 w-4" />
                Try again
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
