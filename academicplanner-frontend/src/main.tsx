import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/dm-sans/latin-400.css';
import '@fontsource/dm-sans/latin-500.css';
import '@fontsource/dm-sans/latin-600.css';
import '@fontsource/dm-sans/latin-700.css';
import '@fontsource/lora/latin-400.css';
import '@fontsource/lora/latin-400-italic.css';
import { App } from './app/App';
import { appConfig } from './app/appConfig';
import './theme/tokens.css';
import './theme/global.css';

document.title = appConfig.name;
createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>);
