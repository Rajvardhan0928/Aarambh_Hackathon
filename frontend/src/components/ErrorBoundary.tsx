import React, { Component, ErrorInfo, ReactNode } from 'react';
import { ShieldAlert, RotateCcw, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Aarambh Application Error Boundary caught an exception:", error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleResetState = () => {
    localStorage.clear();
    window.location.href = window.location.origin;
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-space-900 text-gray-100 flex flex-col items-center justify-center p-6 space-y-4 font-sans text-center">
          <div className="p-4 bg-red-500/20 border border-red-500/40 rounded-full text-red-400">
            <ShieldAlert className="w-12 h-12" />
          </div>
          <div className="space-y-1">
            <h1 className="text-xl font-bold tracking-tight text-white">
              Aarambh Demo Encountered a Visualization Error
            </h1>
            <p className="text-xs text-gray-400 max-w-md">
              An unhandled UI rendering error occurred. The application shell protected the layout. Click below to reload the deterministic demo state.
            </p>
          </div>

          {this.state.error && (
            <div className="bg-space-800 border border-gray-800 rounded-lg p-3 max-w-lg w-full text-left font-mono text-[11px] text-red-300 overflow-x-auto">
              {this.state.error.toString()}
            </div>
          )}

          <div className="flex items-center space-x-3 pt-2">
            <button
              onClick={this.handleReload}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-lg shadow-lg transition"
            >
              <RefreshCw className="w-4 h-4" />
              <span>RELOAD DEMO</span>
            </button>
            <button
              onClick={this.handleResetState}
              className="flex items-center space-x-2 px-4 py-2 bg-space-700 hover:bg-space-600 text-gray-200 font-semibold text-xs rounded-lg border border-gray-700 transition"
            >
              <RotateCcw className="w-4 h-4 text-amber-400" />
              <span>RESET DEMO STATE</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
