import '@lwc/synthetic-shadow';
import { buildCustomElementConstructor } from 'lwc';
import App from 'ui/app';

customElements.define('ui-app', buildCustomElementConstructor(App));
