// React Error Boundary Component
import React from 'react';

export class ErrorBoundary extends React.Component {
    state = { hasError: false };
    static getDerivedStateFromError() { return { hasError: true }; }
    render() { return this.state.hasError ? <h2>Something went wrong.</h2> : this.props.children; }
}
