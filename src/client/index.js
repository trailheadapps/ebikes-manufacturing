import '@lwc/synthetic-shadow';
import { buildCustomElementConstructor, register } from 'lwc';
import { registerWireService } from '@lwc/wire-service';
import App from 'ui/app';

registerWireService(register);

customElements.define('ui-app', buildCustomElementConstructor(App));
