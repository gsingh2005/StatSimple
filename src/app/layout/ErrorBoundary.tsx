import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
    };
  }

  public static getDerivedStateFromError(): State {
    return {
      hasError: true,
    };
  }

  public componentDidCatch() {
    // Keep the UI recoverable without surfacing raw stack traces.
  }

  public render() {
    if (this.state.hasError) {
      return (
        <main className="page-shell">
          <section className="empty-state">
            <div className="empty-state__eyebrow">Recovery</div>
            <h1>Something went wrong while rendering this view.</h1>
            <p>Try returning to Overview or refreshing the page. Your data stays in this browser.</p>
            <a className="button button--primary" href="#overview">
              Return to Overview
            </a>
          </section>
        </main>
      );
    }

    return this.props.children;
  }
}
