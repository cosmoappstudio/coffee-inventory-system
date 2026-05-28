import React from 'react';
import { AlertCircle } from 'lucide-react';

type Props = { children: React.ReactNode };
type State = { error: Error | null };

export default class ErrorBoundary extends React.Component<Props, State> {
  declare readonly props: Props;
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen bg-brand-cream flex items-center justify-center p-6 font-sans">
          <div className="max-w-md w-full bg-white border border-brand-terracotta/30 rounded-xl p-6 shadow-sm">
            <div className="flex items-start gap-3 text-brand-terracotta">
              <AlertCircle className="w-6 h-6 shrink-0" />
              <div>
                <h1 className="font-bold text-espresso-950 text-lg">
                  Uygulama hatası
                </h1>
                <p className="text-sm text-espresso-600 mt-2">
                  {this.state.error.message}
                </p>
                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  className="mt-4 px-4 py-2 bg-brand-amber text-espresso-950 text-sm font-bold rounded-lg cursor-pointer"
                >
                  Sayfayı yenile
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
