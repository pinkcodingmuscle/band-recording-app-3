import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, message: error?.message || 'Unexpected application error.' };
  }

  componentDidCatch(error) {
    console.error('UI crashed:', error);
  }

  handleReset = () => {
    this.setState({ hasError: false, message: '' });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#111827',
          color: '#f9fafb',
          padding: '24px'
        }}>
          <div style={{ maxWidth: 560, textAlign: 'center' }}>
            <h2 style={{ marginBottom: 12 }}>Something went wrong</h2>
            <p style={{ opacity: 0.85, marginBottom: 14 }}>
              The app hit an unexpected runtime error. This prevents the blank screen issue and keeps recovery available.
            </p>
            {this.state.message && (
              <p style={{ fontSize: '0.9rem', opacity: 0.75, marginBottom: 18 }}>
                {this.state.message}
              </p>
            )}
            <button
              onClick={this.handleReset}
              style={{
                border: 'none',
                borderRadius: 8,
                padding: '10px 14px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Reload App
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
