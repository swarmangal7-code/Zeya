import { Component, type ReactNode } from "react";

interface Props {
  fallback?: ReactNode;
  children: ReactNode;
}

interface State {
  failed: boolean;
}

/**
 * Catches failures in the 3D world (or any subtree) so a rendering error
 * can never blank the whole experience. Falls back to the 2D door by
 * default, or any fallback you pass.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  render() {
    if (this.state.failed) return this.props.fallback ?? null;
    return this.props.children;
  }
}