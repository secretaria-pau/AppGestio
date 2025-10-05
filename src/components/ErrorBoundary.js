import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Uncaught error in ErrorBoundary:", error, errorInfo);
    this.setState({ error: error, errorInfo: errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px' }}>
          <h2>Vaja, alguna cosa ha anat malament.</h2>
          <p>S'ha produït un error en aquesta secció de l'aplicació.</p>
          <details style={{ whiteSpace: 'pre-wrap', background: '#f3f3f3', padding: '10px', borderRadius: '5px', marginTop: '15px' }}>
            <summary>Detalls de l'error (fes clic per expandir)</summary>
            {this.state.error && this.state.error.toString()}
            <br />
            {this.state.errorInfo && this.state.errorInfo.componentStack}
          </details>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
