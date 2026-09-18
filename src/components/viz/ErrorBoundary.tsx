import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

type Props = { fallback: ReactNode; children: ReactNode; resetKey: string };
type State = { failed: boolean; key: string };

/** Contains a failing chart so the rest of the page (and the catalog) keeps working. */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { failed: false, key: this.props.resetKey };

  static getDerivedStateFromError(): Partial<State> {
    return { failed: true };
  }

  static getDerivedStateFromProps(props: Props, state: State): Partial<State> | null {
    // A new visualization id resets the boundary.
    return props.resetKey !== state.key ? { failed: false, key: props.resetKey } : null;
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Visualization crashed:', error, info.componentStack);
  }

  render(): ReactNode {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
