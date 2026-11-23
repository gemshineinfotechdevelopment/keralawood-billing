import React from 'react'

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary caught error]:', error, errorInfo)
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null })
    window.location.reload()
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            padding: '36px 24px',
            textAlign: 'center',
            backgroundColor: '#FFFBF7',
            border: '1px solid #EADBCC',
            borderRadius: '12px',
            margin: '30px auto',
            maxWidth: '560px',
            fontFamily: 'Inter, system-ui, sans-serif',
            boxShadow: '0 4px 16px rgba(49, 25, 11, 0.08)',
          }}
        >
          <div style={{ fontSize: '32px', marginBottom: '10px' }}>⚠️</div>
          <h2
            style={{
              fontSize: '18px',
              fontWeight: 800,
              color: '#31190B',
              margin: '0 0 8px 0',
            }}
          >
            Something went wrong while rendering this section
          </h2>
          <p
            style={{
              fontSize: '13px',
              color: '#7D6C63',
              margin: '0 0 20px 0',
              lineHeight: 1.5,
            }}
          >
            {this.state.error?.message ||
              'A temporary rendering error occurred. Please refresh the page to continue.'}
          </p>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
            <button
              type="button"
              onClick={this.handleReload}
              style={{
                padding: '9px 18px',
                backgroundColor: '#31190B',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '6px',
                fontWeight: 700,
                fontSize: '13px',
                cursor: 'pointer',
              }}
            >
              ↻ Refresh Page
            </button>
            <button
              type="button"
              onClick={this.handleReset}
              style={{
                padding: '9px 18px',
                backgroundColor: '#F3E8DE',
                color: '#31190B',
                border: '1px solid #D8C3B3',
                borderRadius: '6px',
                fontWeight: 700,
                fontSize: '13px',
                cursor: 'pointer',
              }}
            >
              Try Again
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
