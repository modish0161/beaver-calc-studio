import { Component, ErrorInfo, ReactNode } from 'react';
import { FiAlertTriangle, FiRefreshCw } from 'react-icons/fi';

interface Props {
  name: string;
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class CalculatorErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`[${this.props.name}] Calculator error:`, error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[400px] flex items-center justify-center p-8">
          <div className="max-w-md w-full text-center space-y-4">
            <div className="w-14 h-14 mx-auto rounded-full bg-orange-500/20 border border-orange-500/40 flex items-center justify-center">
              <FiAlertTriangle className="w-7 h-7 text-orange-400" />
            </div>
            <h2 className="text-lg font-bold text-white">Calculator Error</h2>
            <p className="text-gray-400 text-sm">
              An error occurred in the <span className="text-white font-medium">{this.props.name}</span> calculator.
              Other calculators are unaffected.
            </p>
            {this.state.error && (
              <p className="text-xs font-mono text-red-400 bg-gray-900/80 p-3 rounded-lg border border-gray-700 break-all">
                {this.state.error.message}
              </p>
            )}
            <button
              onClick={this.handleReset}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-colors"
            >
              <FiRefreshCw className="w-4 h-4" />
              Retry
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
