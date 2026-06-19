import { Component } from 'react';
import type { ReactNode, ErrorInfo } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  errorMessage: string;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, errorMessage: error.message };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary] Uncaught error:', error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, errorMessage: '' });
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0A0A0B',
          color: '#F5F5F7',
          fontFamily: "'Barlow', sans-serif",
          padding: '24px',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '3rem', marginBottom: '16px' }}>⚠️</div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '12px', color: '#CCFF00' }}>
            Đã xảy ra lỗi không mong muốn
          </h1>
          <p style={{ color: '#8E8E93', fontSize: '0.9rem', maxWidth: '400px', marginBottom: '8px' }}>
            Một component trong ứng dụng đã gặp lỗi. Vui lòng quay về trang chủ để thử lại.
          </p>
          {this.state.errorMessage && (
            <code style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '6px',
              padding: '8px 14px',
              fontSize: '0.75rem',
              color: '#FF453A',
              marginBottom: '24px',
              maxWidth: '600px',
              wordBreak: 'break-word',
            }}>
              {this.state.errorMessage}
            </code>
          )}
          <button
            onClick={this.handleReset}
            style={{
              background: '#CCFF00',
              color: '#0A0A0B',
              border: 'none',
              borderRadius: '8px',
              padding: '10px 24px',
              fontWeight: 700,
              fontSize: '0.9rem',
              cursor: 'pointer',
              fontFamily: "'Barlow', sans-serif",
            }}
          >
            ← Về Trang chủ
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
