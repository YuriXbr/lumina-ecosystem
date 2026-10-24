import {it,expect} from 'vitest';
import {screen} from '@testing-library/react';
import NotFoundPage from './NotFoundPage';
import {renderWithProviders} from '../../test/testUtils';
it('identifies the missing page and offers a semantic return link',()=>{
 renderWithProviders(<NotFoundPage/>);expect(screen.getByRole('heading',{name:/404/})).toBeInTheDocument();
 const back=screen.getByRole('link');expect(back).toHaveAttribute('href','/');expect(back.querySelector('button')).toBeNull();
});
