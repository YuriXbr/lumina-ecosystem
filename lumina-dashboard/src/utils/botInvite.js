// Installing a bot does not exchange a user login code or use a login callback.
export function botInviteUrl(guildId, clientId=import.meta.env.VITE_DISCORD_CLIENT_ID) {
  if (!/^\d{16,20}$/.test(clientId || '')) return null;
  const permissions = [1n<<1n,1n<<2n,1n<<10n,1n<<11n,1n<<13n,1n<<14n,1n<<15n,1n<<16n,1n<<28n,1n<<40n].reduce((a,b)=>a|b,0n);
  const params=new URLSearchParams({client_id:clientId,scope:'bot applications.commands',permissions:String(permissions),integration_type:'0'});
  if (guildId && /^\d{16,20}$/.test(guildId)) params.set('guild_id',guildId);
  return `https://discord.com/oauth2/authorize?${params}`;
}
