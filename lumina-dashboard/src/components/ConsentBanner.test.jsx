import {it,expect} from 'vitest';
import {screen} from '@testing-library/react';
import ConsentBanner from './ConsentBanner';
import {renderWithProviders} from '../test/testUtils';
it('o aviso legado aponta para a política comum',()=>{localStorage.clear();renderWithProviders(<ConsentBanner/>);expect(screen.getByRole('link',{name:'Política de Cookies'})).toHaveAttribute('href','/cookies');});
