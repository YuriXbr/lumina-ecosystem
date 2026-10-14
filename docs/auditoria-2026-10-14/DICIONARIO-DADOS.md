# Dicionário de dados reconstruído

Data: 14/10/2026. Fonte: schema.js + metadados MongoDB autorizados. Todos os campos declarados foram incluídos. O arquivo não contém valores de usuários, tokens ou segredos.

Os tipos observados vêm de até 1.000 documentos por coleção; ausência na amostra não prova ausência em toda a coleção. `Object`/`Array` são campos flexíveis, sem contrato interno declarado. `unique` no schema representa um índice pretendido, não um validador; os índices reais estão listados separadamente. `_id` (ObjectId, PK) e `__v` (inteiro de versão) são campos adicionados pelo Mongoose.

## bot → bots

| Campo | Tipo declarado | Obrigatório | Índice declarado | Tipos observados |
|---|---|---|---|---|
| clientId | String | não | UNIQUE | string |
| prefix | String | não | — | string |
| activityStatus | String | não | — | string |
| activityType | String | não | — | string |
| activityName | String | não | — | string |
| activityUrl | String | não | — | string |
| clientSecret | String | não | UNIQUE | não observado |
| redirectUri | String | não | UNIQUE | não observado |
| owners | Array | não | — | array |
| admins | Array | não | — | array |
| moderators | Array | não | — | array |
| staffPermissions | Object | não | — | object |
| mainGuild | String | não | UNIQUE | string |
| logGuild | String | não | UNIQUE | string |
| logStartChannel | String | não | — | string |
| logErrorChannel | String | não | — | string |
| logEventsChannel | String | não | — | string |
| logDebugChannel | String | não | — | string |
| logStaffChannel | String | não | — | string |
| logDashboardChannel | String | não | — | string |
| logAllChannel | String | não | — | string |
| logDataBaseChannel | String | não | — | string |
| deployGuilds | Array | não | — | array |
| devMode | Boolean | não | — | bool |
| maintenanceMode | Boolean | não | — | bool |
| webhookUrl | String | não | — | string |
| githubwebhookUrl | String | não | — | string |

Índices reais de **bots** (1 documentos):

- _id_: {"_id":1}.
- clientSecret_1: {"clientSecret":1}, UNIQUE.
- redirectUri_1: {"redirectUri":1}, UNIQUE.
- mainGuild_1: {"mainGuild":1}, UNIQUE.
- logGuild_1: {"logGuild":1}, UNIQUE.
- token_1: {"token":1}, UNIQUE.
- clientId_1: {"clientId":1}, UNIQUE.

## inventory → inventories

| Campo | Tipo declarado | Obrigatório | Índice declarado | Tipos observados |
|---|---|---|---|---|
| userId | String | sim | UNIQUE | string |
| hextechChests | Number | não | — | int |
| masterWorkChests | Number | não | — | int |
| keys | Number | não | — | int |
| mythicEssece | Number | não | — | int |
| blueEssence | Number | não | — | int |
| orangeEssence | Number | não | — | int |
| championShards | Object | não | — | object |
| champions | Object | não | — | object |
| skinShards | Object | não | — | object |
| dailyRewardClaim | Date | não | — | date, null |
| nextDailyReward | Date | não | — | date, null |
| dailyRewardStreak | Number | não | — | int |
| skins | Array | não | — | array |

Índices reais de **inventories** (9 documentos):

- _id_: {"_id":1}.
- userId_1: {"userId":1}, UNIQUE.

## guilds → guilds

| Campo | Tipo declarado | Obrigatório | Índice declarado | Tipos observados |
|---|---|---|---|---|
| guildId | String | sim | UNIQUE | string |
| guildReferenceName | String | sim | — | string |
| muteRoleId | String | não | — | não observado |
| banRoleId | String | não | — | não observado |
| moderationChannelId | String | não | — | não observado |
| usersInventory | Object | não | — | não observado |
| gachaRollsLastRefresh | Date | não | — | date |
| gachaRollsRefreshInterval | Number | não | — | int |
| gachaRolls | Object | não | — | não observado |
| gachaMaxRolls | Number | não | — | int |
| gachaGameMode | String | não | — | string |
| guildOwnerId | String | sim | — | string |
| prefix | String | não | — | string |
| blockedChannels | Object | não | — | array |
| djEnabled | Boolean | não | — | bool |
| djRoleId | String | não | — | string |
| persistentMute | Boolean | não | — | bool |
| persistentWarns | Boolean | não | — | bool |
| warnsToMute | Number | não | — | int |
| warnsToTimeOut | Number | não | — | int |
| warnsToKick | Number | não | — | int |
| warnsToBan | Number | não | — | int |
| autoWarnPunishment | Boolean | não | — | bool |
| botInfoChannelId | String | não | — | string |
| eventLogChannelId | String | não | — | string |
| guildLocale | String | não | — | string |
| canPunishStaff | Boolean | não | — | bool |
| memberDmToggle | Boolean | não | — | bool |
| memberWelcomeToggle | Boolean | não | — | bool |
| memberJoinChannelId | String | não | — | string |
| memberJoinMessage | String | não | — | string |
| memberLeaveChannelId | String | não | — | string |
| memberLeaveMessage | String | não | — | string |
| memberJoinDmMessage | String | não | — | string |
| warnDuration | Number | não | — | double |

Índices reais de **guilds** (7 documentos):

- _id_: {"_id":1}.
- guildId_1: {"guildId":1}, UNIQUE.

## punishList → banlists, mutelists, warnlists

| Campo | Tipo declarado | Obrigatório | Índice declarado | Tipos observados |
|---|---|---|---|---|
| guildId | String | sim | — | string |
| targetId | String | sim | — | string |
| staffId | String | sim | — | string |
| reason | String | não | — | string |
| startTime | Date | não | — | date |
| endTime | Date | não | — | null |

Índices reais de **banlists** (17 documentos):

- _id_: {"_id":1}.

Índices reais de **mutelists** (0 documentos):

- _id_: {"_id":1}.

Índices reais de **warnlists** (0 documentos):

- _id_: {"_id":1}.

## userHistory → userhistories

| Campo | Tipo declarado | Obrigatório | Índice declarado | Tipos observados |
|---|---|---|---|---|
| userId | String | sim | — | não observado |
| warns | Object | não | — | não observado |
| lastWarn | Object | não | — | não observado |
| lastMute | Object | não | — | não observado |
| lastKick | Object | não | — | não observado |
| lastBan | Object | não | — | não observado |
| lastUnmute | Object | não | — | não observado |
| lastUnban | Object | não | — | não observado |
| lastPunishment | Object | não | — | não observado |
| punishmentCount | Object | não | — | não observado |
| punishmentDuration | Object | não | — | não observado |
| botBanned | Boolean | não | — | não observado |
| botBanReason | String | não | — | não observado |
| botBanDate | Date | não | — | não observado |
| botBanEndDate | Date | não | — | não observado |
| botBanStaff | String | não | — | não observado |
| isBot | Boolean | não | — | não observado |
| role | String | não | — | não observado |
| experience | Number | não | — | não observado |
| level | Number | não | — | não observado |

Índices reais de **userhistories** (0 documentos):

- _id_: {"_id":1}.

## skins → skins

| Campo | Tipo declarado | Obrigatório | Índice declarado | Tipos observados |
|---|---|---|---|---|
| championId | String | sim | UNIQUE | string |
| quantity | Number | sim | — | int |
| legacy | Object | não | — | array |
| epic | Object | não | — | array |
| legendary | Object | não | — | array |
| ultimate | Object | não | — | array |
| transcendent | Object | não | — | array |
| mythic | Object | não | — | array |
| legacyQuantity | Number | sim | — | int |
| epicQuantity | Number | sim | — | int |
| legendaryQuantity | Number | sim | — | int |
| ultimateQuantity | Number | sim | — | int |
| transcendentQuantity | Number | sim | — | int |
| mythicQuantity | Number | sim | — | int |
| updatePatch | String | sim | — | string |
| updateDate | Date | não | — | date |

Índices reais de **skins** (173 documentos):

- _id_: {"_id":1}.
- championId_1: {"championId":1}, UNIQUE.

## skinsIdList → skinsidlists

| Campo | Tipo declarado | Obrigatório | Índice declarado | Tipos observados |
|---|---|---|---|---|
| id | Number | sim | UNIQUE | int |
| name | String | sim | — | string |
| description | String | não | — | string |
| championId | String | sim | — | string |
| championName | String | sim | — | string |
| isBase | Boolean | não | — | bool |
| rarity | String | não | — | string |
| isLegacy | Boolean | não | — | bool |
| skinLines | Array | não | — | array |
| splashPath | String | não | — | string |
| loadScreenPath | String | não | — | string |
| tilePath | String | não | — | string |
| uncenteredSplashPath | String | não | — | string |
| updatePatch | String | sim | — | string |
| updateDate | Date | não | — | date |
| championdata | Object | não | — | object |

Índices reais de **skinsidlists** (1920 documentos):

- _id_: {"_id":1}.
- id_1: {"id":1}, UNIQUE.

## champions → champions

| Campo | Tipo declarado | Obrigatório | Índice declarado | Tipos observados |
|---|---|---|---|---|
| championId | String | sim | UNIQUE | string |
| championName | String | sim | — | string |
| updatePatch | String | sim | — | string |
| updateDate | Date | não | — | date |

Índices reais de **champions** (174 documentos):

- _id_: {"_id":1}.
- championId_1: {"championId":1}, UNIQUE.

## skinlines → skinslines

| Campo | Tipo declarado | Obrigatório | Índice declarado | Tipos observados |
|---|---|---|---|---|
| id | String | sim | UNIQUE | string |
| name | String | sim | — | string |
| description | String | sim | — | string |
| updatePatch | String | sim | — | string |
| updateDate | Date | não | — | date |

Índices reais de **skinslines** (218 documentos):

- _id_: {"_id":1}.
- id_1: {"id":1}, UNIQUE.

## universes → universes

| Campo | Tipo declarado | Obrigatório | Índice declarado | Tipos observados |
|---|---|---|---|---|
| id | String | sim | UNIQUE | string |
| name | String | sim | — | string |
| description | String | sim | — | string |
| skinsSets | Array | não | — | array |
| updatePatch | String | sim | — | string |
| updateDate | Date | não | — | date |

Índices reais de **universes** (121 documentos):

- _id_: {"_id":1}.
- id_1: {"id":1}, UNIQUE.

## dashboardAccounts → dashboardaccounts

| Campo | Tipo declarado | Obrigatório | Índice declarado | Tipos observados |
|---|---|---|---|---|
| accountId | String | sim | UNIQUE | string |
| firstName | String | sim | — | string |
| lastName | String | sim | — | string |
| email | String | sim | UNIQUE | string |
| password | String | não | — | string |
| accessType | String | não | — | string |
| authProviders | Object | não | — | object |
| emailVerified | Boolean | não | — | bool |
| emailVerificationToken | String | não | — | string |
| emailVerificationTokenExpires | Date | não | — | date |
| emailVerificationTokenUsed | Boolean | não | — | bool |
| emailVerificationTokenUsedDate | Date | não | — | date |
| twoFactorAuth | Boolean | não | — | bool |
| twoFactorAuthToken | String | não | — | string |
| twoFactorAuthSecret | String | não | — | string |
| twoFactorAuthBackupCodes | Array | não | — | array |
| twoFactorAuthBackupCodesUsed | Array | não | — | array |
| twoFactorAuthBackupCodesGenerated | Date | não | — | date |
| twoFactorAuthBackupCodesExpires | Date | não | — | date |
| twoFactorAuthBackupCodesUsedDate | Date | não | — | date |
| discordOauth2Id | String | não | — | string |
| discordOauth2Token | String | não | — | string |
| discordOauth2RefreshToken | String | não | — | string |
| discordOauth2TokenExpiresAt | Date | não | — | date, null |
| discordOauth2TokenScope | String | não | — | string |
| discordOauth2TokenType | String | não | — | string |
| discordOauth2TokenRequestDate | Date | não | — | date, null |
| discordOauth2TokenRequestIp | String | não | — | string |
| governamentId | String | não | — | string |
| phoneNumber | String | não | — | string |
| birthDate | Date | não | — | null |
| country | String | não | — | string |
| state | String | não | — | string |
| city | String | não | — | string |
| street | String | não | — | string |
| number | String | não | — | string |
| complement | String | não | — | string |
| zipCode | String | não | — | string |
| lastLogin | Date | não | — | date |
| lastLoginIp | String | não | — | string |
| lastLoginUserAgent | String | não | — | string |
| lastLoginLocation | String | não | — | string |
| lastLoginCountry | String | não | — | string |
| lastLoginCity | String | não | — | string |
| registrationIp | String | não | — | string |
| registrationDate | Date | não | — | date |
| registrationUserAgent | String | não | — | string |
| registrationLocation | String | não | — | string |
| registrationCountry | String | não | — | string |
| registrationCity | String | não | — | string |
| passwordResetToken | String | não | — | string |
| passwordResetTokenExpires | Date | não | — | date |
| passwordResetTokenUsed | Boolean | não | — | bool |
| passwordResetTokenUsedDate | Date | não | — | date |
| passwordResetTokenUsedIp | String | não | — | string |
| passwordResetTokenUsedUserAgent | String | não | — | string |
| passwordResetTokenUsedLocation | String | não | — | string |
| passwordResetTokenUsedCountry | String | não | — | string |
| passwordResetTokenUsedCity | String | não | — | string |
| browserFingerprint | Object | não | — | string |
| browserFingerprintDate | Date | não | — | date |
| browserAgent | String | não | — | string |
| blocked | Boolean | não | — | bool |
| blockAuthor | String | não | — | string |
| blockDate | Date | não | — | date |
| blockReason | String | não | — | string |
| blockExpiration | Date | não | — | não observado |
| blockCounter | Number | não | — | int |
| banned | Boolean | não | — | bool |
| banAuthor | String | não | — | string |
| banDate | Date | não | — | date |
| banReason | String | não | — | string |
| banExpiration | Date | não | — | não observado |
| banAppeal | String | não | — | string |
| banAppealDate | Date | não | — | não observado |
| banAppealResponse | String | não | — | string |
| banAppealResponseDate | Date | não | — | não observado |
| banAppealResponseBy | String | não | — | string |
| banAppealResponseIp | String | não | — | string |
| banCounter | Number | não | — | int |
| emailNotifications | Boolean | não | — | bool |
| discordNotifications | Boolean | não | — | bool |
| botActivityAlerts | Boolean | não | — | bool |
| publicProfile | Boolean | não | — | bool |
| showOnlineStatus | Boolean | não | — | bool |
| language | String | não | — | string |
| timezone | String | não | — | string |
| lastPasswordChange | Date | não | — | date |
| passwordAttempts | Number | não | — | int |
| passwordLockedUntil | Date | não | — | null |
| username | String | não | UNIQUE sparse | string |
| usernameLower | String | não | não único | string |
| usernameChangedAt | Date | não | — | date |
| displayName | String | não | — | string |
| displayNameChangedAt | Date | não | — | date |
| deletionRequestedAt | Date | não | — | null |
| deletionScheduledFor | Date | não | — | null |

Índices reais de **dashboardaccounts** (5 documentos):

- _id_: {"_id":1}.
- email_1: {"email":1}, UNIQUE.
- accountId_1: {"accountId":1}, UNIQUE.
- username_1: {"username":1}, UNIQUE, sparse.
- usernameLower_1: {"usernameLower":1}.
- deletionScheduledFor_1: {"deletionScheduledFor":1}, TTL 0 segundos, filtro parcial {"deletionScheduledFor":{"$type":"date"}}.

## newsPosts → newsposts

| Campo | Tipo declarado | Obrigatório | Índice declarado | Tipos observados |
|---|---|---|---|---|
| title | String | sim | — | string |
| body | String | sim | — | string |
| excerpt | String | não | — | string |
| imageUrl | String | não | — | string |
| tag | String | não | — | string |
| pinned | Boolean | não | — | bool |
| publishedAt | Date | não | — | date |
| updatedAt | Date | não | — | date |
| authorEmail | String | não | — | string |
| authorName | String | não | — | string |

Índices reais de **newsposts** (1 documentos):

- _id_: {"_id":1}.

## badges → badges

| Campo | Tipo declarado | Obrigatório | Índice declarado | Tipos observados |
|---|---|---|---|---|
| code | String | sim | UNIQUE | string |
| name | String | sim | — | string |
| description | String | não | — | string |
| imageUrl | String | não | — | string |
| rarity | String | não | — | string |
| highlightColor | String | não | — | string |
| availableFrom | Date | não | — | date |
| expiresAt | Date | não | — | null |
| maxRedemptions | Number | não | — | int |
| minAccessLevel | String | não | — | string |
| createdBy | String | não | — | string |
| createdAt | Date | não | — | date |
| updatedAt | Date | não | — | date |
| active | Boolean | não | — | bool |

Índices reais de **badges** (1 documentos):

- _id_: {"_id":1}.
- code_1: {"code":1}, UNIQUE.

## userBadges → userbadges

| Campo | Tipo declarado | Obrigatório | Índice declarado | Tipos observados |
|---|---|---|---|---|
| userEmail | String | sim | — | string |
| badgeCode | String | sim | — | string |
| redeemedAt | Date | não | — | date |
| redeemedVia | String | não | — | string |

Índices reais de **userbadges** (1 documentos):

- _id_: {"_id":1}.

## apiLogs → apilogs

| Campo | Tipo declarado | Obrigatório | Índice declarado | Tipos observados |
|---|---|---|---|---|
| requestId | String | não | — | string |
| level | String | não | — | string |
| type | String | não | — | string |
| action | String | não | — | string |
| message | String | não | — | string |
| route | String | não | — | string |
| method | String | não | — | string |
| statusCode | Number | não | — | int |
| durationMs | Number | não | — | double, int |
| ip | String | não | — | string |
| userEmail | String | não | — | string |
| userId | String | não | — | string |
| userAgent | String | não | — | string |
| extra | Object | não | — | não observado |
| environment | String | não | — | string |
| createdAt | Date | não | — | date |
| expiresAt | Date | não | — | date |

Índices reais de **apilogs** (15103 documentos):

- _id_: {"_id":1}.
- expiresAt_1: {"expiresAt":1}, TTL 0 segundos.
- requestId_1: {"requestId":1}.
- level_1_createdAt_-1: {"level":1,"createdAt":-1}.
- route_1_createdAt_-1: {"route":1,"createdAt":-1}.

## apiCache → apicaches

| Campo | Tipo declarado | Obrigatório | Índice declarado | Tipos observados |
|---|---|---|---|---|
| key | String | sim | UNIQUE | não observado |
| value | Object | não | — | não observado |
| expiresAt | Date | sim | — | não observado |
| createdAt | Date | não | — | não observado |

Índices reais de **apicaches** (0 documentos):

- _id_: {"_id":1}.
- expiresAt_1: {"expiresAt":1}, TTL 0 segundos.
- key_1: {"key":1}, UNIQUE.

## ipRateLimits → ipratelimits

| Campo | Tipo declarado | Obrigatório | Índice declarado | Tipos observados |
|---|---|---|---|---|
| ip | String | sim | — | não observado |
| route | String | sim | — | não observado |
| windowStart | Date | não | — | não observado |
| requestCount | Number | não | — | não observado |
| blockCount | Number | não | — | não observado |
| blockedUntil | Date | não | — | não observado |
| updatedAt | Date | não | — | não observado |

Índices reais de **ipratelimits** (0 documentos):

- _id_: {"_id":1}.
- ip_1_route_1: {"ip":1,"route":1}, UNIQUE.
- updatedAt_1: {"updatedAt":1}, TTL 604800 segundos.
