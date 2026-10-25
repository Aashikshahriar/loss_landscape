import { Component, type ReactNode } from 'react';
import { Box } from 'lucide-react';
export class GraphicsBoundary extends Component<
  { children: ReactNode; onFallback: () => void },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <div className="graphics-fallback">
        <Box size={30} />
        <p>3D rendering is unavailable on this device.</p>
        <button className="button" onClick={this.props.onFallback}>
          Open the 2D contour view
        </button>
      </div>
    ) : (
      this.props.children
    );
  }
}
