import { Component } from 'react';
import PageState from './PageState';
export default class RouteBoundary extends Component {
  state = { failed:false };
  static getDerivedStateFromError() { return { failed:true }; }
  render() {
    if (this.state.failed) return <PageState title="Não foi possível abrir esta página" message="Recarregue para tentar novamente." onRetry={() => window.location.reload()} />;
    return this.props.children;
  }
}
