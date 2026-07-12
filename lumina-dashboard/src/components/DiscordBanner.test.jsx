/**
 * src/components/DiscordBanner.test.jsx
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import DiscordBanner from './DiscordBanner';
import { renderWithI18n, makeUser, makeUserWithDiscord } from '../test/testUtils';

describe('DiscordBanner', () => {
  it('retorna null quando user é null', () => {
    const { container } = renderWithI18n(<DiscordBanner user={null} />);
    expect(container.firstChild).toBeNull();
  });

  it('renderiza displayName do user', () => {
    renderWithI18n(<DiscordBanner user={makeUser({ displayName: 'Test User' })} />);
    expect(screen.getByText('Test User')).toBeInTheDocument();
  });

  it('usa firstName + lastName quando displayName não existe', () => {
    renderWithI18n(<DiscordBanner user={makeUser({ displayName: '', firstName: 'João', lastName: 'Silva' })} />);
    expect(screen.getByText('João Silva')).toBeInTheDocument();
  });

  it('usa username quando nem displayName nem firstName existem', () => {
    renderWithI18n(<DiscordBanner user={makeUser({ displayName: '', firstName: '', lastName: '', username: 'testuser' })} />);
    expect(screen.getByText('testuser')).toBeInTheDocument();
  });

  it('mostra @username quando user tem username', () => {
    renderWithI18n(<DiscordBanner user={makeUser({ username: 'testuser' })} />);
    expect(screen.getByText('@testuser')).toBeInTheDocument();
  });

  it('mostra badge "Verificado" quando emailVerified=true', () => {
    renderWithI18n(<DiscordBanner user={makeUser({ emailVerified: true })} />);
    expect(document.querySelector('.bg-green-100')).toBeInTheDocument();
  });

  it('mostra badge "Não verificado" quando emailVerified=false', () => {
    renderWithI18n(<DiscordBanner user={makeUser({ emailVerified: false })} />);
    expect(document.querySelector('.bg-red-100')).toBeInTheDocument();
  });

  it('mostra badge Discord conectado quando tem discordOauth2Id', () => {
    renderWithI18n(<DiscordBanner user={makeUserWithDiscord()} />);
    expect(document.querySelector('.bg-purple-100')).toBeInTheDocument();
  });

  it('renderiza avatar do Discord quando tem discordId e avatar', () => {
    const user = makeUserWithDiscord({ avatar: 'avhash', id: '123456789' });
    const { container } = renderWithI18n(<DiscordBanner user={user} />);
    const avatarImg = container.querySelector('img[src*="cdn.discordapp.com/avatars"]');
    expect(avatarImg).toBeInTheDocument();
  });

  it('renderiza fallback de avatar (inicial) quando não tem avatar', () => {
    const { container } = renderWithI18n(<DiscordBanner user={makeUser({ displayName: 'Test' })} />);
    // Fallback tem classe bg-purple-100
    expect(container.querySelector('.bg-purple-100.flex.items-center.justify-center')).toBeInTheDocument();
  });

  it('renderiza banner do Discord quando tem discordBanner', () => {
    const user = makeUserWithDiscord({ discordBanner: 'bannerhash', id: '123456789' });
    const { container } = renderWithI18n(<DiscordBanner user={user} />);
    // Banner tem background-image
    const banner = container.querySelector('[style*="background-image"]');
    expect(banner).toBeInTheDocument();
  });

  it('renderiza gradiente quando não tem banner', () => {
    const { container } = renderWithI18n(<DiscordBanner user={makeUser()} />);
    const banner = container.querySelector('[style*="linear-gradient"]');
    expect(banner).toBeInTheDocument();
  });
});
