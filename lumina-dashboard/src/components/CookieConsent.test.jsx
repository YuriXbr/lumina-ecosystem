import {it,expect} from 'vitest';
import {screen} from '@testing-library/react';
import CookieConsent from './CookieConsent';
import {renderWithProviders} from '../test/testUtils';
it('o componente legado usa o mesmo aviso e as mesmas políticas',()=>{localStorage.clear();renderWithProviders(<CookieConsent/>);expect(screen.getByRole('link',{name:'Política de Privacidade'})).toHaveAttribute('href','/privacy');});
