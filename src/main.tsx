import { createRoot } from 'react-dom/client';
import App from './app/App';
import '@fontsource-variable/fraunces';
import '@fontsource-variable/inter';
import '@fontsource-variable/jetbrains-mono';
import 'katex/dist/katex.min.css';
import './styles/global.css';
createRoot(document.getElementById('root')!).render(<App />);
