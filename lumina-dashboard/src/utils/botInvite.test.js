import {it,expect} from 'vitest';
import {botInviteUrl} from './botInvite';
it('installs the bot with explicit scopes, no login callback, and no administrator permission',()=>{
 const url=new URL(botInviteUrl('771421826974089236','771421826974089237'));
 expect(url.origin).toBe('https://discord.com');
 expect(url.searchParams.get('scope')).toBe('bot applications.commands');
 expect(url.searchParams.get('guild_id')).toBe('771421826974089236');
 expect(url.searchParams.has('redirect_uri')).toBe(false);expect(url.searchParams.has('response_type')).toBe(false);
 expect(BigInt(url.searchParams.get('permissions'))&8n).toBe(0n);
});
it('rejects missing or injected client IDs instead of linking to a broken OAuth route',()=>{
 expect(botInviteUrl(null,'')).toBeNull();expect(botInviteUrl(null,'123&redirect_uri=evil')).toBeNull();
 expect(new URL(botInviteUrl(null,'771421826974089237')).searchParams.has('guild_id')).toBe(false);
});
