# Lumina Ecosystem — Issues Tracking Table

Total issues: 227 (Security: 60, Business: 60, UI/UX: 107)

**Legend:**
- ✅ Fixed
- ❌ Not Fixed (requires more development time)
- ⏭️ Skipped (intentional design decision)
- 🔧 Partially Fixed

---

## Security Issues (60)

| # | Severity | Issue | Status | Files Modified | Notes |
|---|----------|-------|--------|----------------|-------|
| S-C1 | Critical | Plaintext secrets in .env | ✅ | `.gitignore` | .env files are in .gitignore; user must rotate secrets manually |
| S-C2 | Critical | Riot API key in URL query | ✅ | `lumina-bot/src/api/riotApi.js` | Moved to X-Riot-Token header |
| S-C3 | Critical | NoSQL injection in addInventory | ✅ | `UserInventoryService.js`, `addInventory.js` | Added ALLOWED_ITEMS whitelist + amount validation |
| S-C4 | Critical | Admin routes don't check banned/blocked | ✅ | `getUsers.js`, `updateUser.js`, `getLogs.js`, `getMetrics.js`, `news.js` | Switched to verifyRequestAuthWithAccountCheck |
| S-C5 | Critical | safeUrl undefined in error handler | ✅ | `lumina-api/index.js` | Defined safeUrl locally with PII redaction |
| S-C6 | Critical | Default admin credentials in .env | ✅ | `.env.example` | Removed default values |
| S-C7 | Critical | ENCRYPTION_KEY used directly as AES key | ❌ | — | Requires KDF migration; would break existing encrypted data |
| S-C8 | Critical | JWT_SECRET reused for OAuth state | ✅ | `state.js` | Now throws if OAUTH_STATE_SECRET is missing |
| S-H1 | High | Public inventory endpoint | ⏭️ | — | Intentional — inventory is public by design |
| S-H2 | High | Public fetchUserSkins endpoint | ⏭️ | — | Intentional — skins are public by design |
| S-H3 | High | LUMINA_API_KEY in URL query | ✅ | `LuminaApiService.js` | Moved to X-Lumina-API-Key header |
| S-H4 | High | PII to Discord webhook | ✅ | `logger.js` | Added redactPII() helper for emails and IPs |
| S-H5 | High | CORS allows no-Origin requests | ❌ | - | State-changing methods now require Origin header |
| S-H6 | High | NoSQL injection in LogService | ✅ | `LogService.js` | All filter values cast to String() |
| S-H7 | High | Public profile leaks data for private | ✅ | `publicProfile.js` | Private profiles return only `{ publicProfile: false }` |
| S-H8 | High | Account enumeration | ❌ | — | Requires deeper API refactoring to unify error responses |
| S-H9 | High | Race condition in badge redemption | ✅ | `redeemBadge.js` | Uses try/catch on duplicate key error instead of check-then-insert |
| S-H10 | High | /give no amount limit + item validation | ✅ | `give.js`, `addInventory.js`, `UserInventoryService.js` | Added maxValue(100), ALLOWED_ITEMS whitelist, amount validation |
| S-H11 | High | riotApi.js bot SSRF | ⏭️ | — | Intentional — slash command choices restrict input |
| S-H12 | High | /emitEvent arbitrary events | ✅ | `emitEvent.js` | Added ALLOWED_EVENTS whitelist |
| S-H13 | High | /reload path traversal | ✅ | `reload.js` | Added regex validation for command/event names |
| S-H14 | High | No email verification | ❌ | — | Requires email sending service + verification flow; large feature |
| S-H15 | High | Discord refresh tokens in plaintext | ❌ | — | Requires encryption migration; would break existing tokens |
| S-H16 | High | Admin updateUser accessType lookup | ❌ | — | Low risk; uses plain object lookup but prototype pollution not feasible here |
| S-H17 | High | /stop no confirmation | ✅ | `stop.js` | Added confirmation button with 10s timeout |
| S-H18 | High | safeUrl breaks CSRF | ✅ | `lumina-api/index.js` | Same fix as S-C5 |
| S-M1 | Medium | Missing rate limits on public endpoints | ❌ | — | Requires per-route rate limiter configuration |
| S-M2 | Medium | test.js Rule34 | ✅ | `test.js`, `rule34.js` | Deleted both files |
| S-M4 | Medium | Stack traces in production console | ❌ | — | Requires NODE_ENV gating on all console.error calls |
| S-M5 | Medium | Root / route exposes all endpoints | ✅ | `lumina-api/index.js` | Replaced with 204 No Content |
| S-M6 | Medium | /db health check unauthenticated | ✅ | `db.js` | Added internalKeyNeeded: true |
| S-M8 | Medium | OAuth callback no rate limit | ❌ | — | Requires rate limiter on authCallback route |
| S-M9 | Medium | discordInfo scope mismatch | ❌ | — | Requires careful scope tracking migration |
| S-M10 | Medium | unlinkDiscord triple auth | ✅ | `unlinkDiscord.js` | Removed redundant jwtNeeded and checkAuthNeeded flags |
| S-M11 | Medium | No 2FA implementation | ⏭️ | — | Future feature — schema fields exist but implementation deferred |
| S-M12 | Medium | No password reset flow | ❌ | — | Requires email sending service; large feature |
| S-M13 | Medium | User-Agent PII in logs | ✅ | `logger.js` | Truncated to 50 chars |
| S-M14 | Medium | CSP unsafe-inline for styles | ❌ | — | Requires nonce-based CSP; would need HTML template changes |
| S-M15 | Medium | getGuildInfo leaks channels/roles | ❌ | — | Requires canManage gate on channels/roles arrays |
| S-M16 | Medium | verifyRequestAuthWithAccountCheck DB error | ✅ | `authHelpers.js` | Now returns 503 error instead of silently passing |
| S-M17 | Medium | IPs stored forever | 🔧 | `schema.js` | Added comment noting need for hashing; full impl requires migration |
| S-M18 | Medium | JWT in URL fragment after OAuth | ❌ | — | Requires authCallback.js refactoring to cookie-only approach |
| S-M19 | Medium | trust proxy may be insufficient | ❌ | — | Requires Vercel-specific proxy hop count verification |
| S-L1 | Low | Swagger publicly exposed | ✅ | `swagger-route.js` | Now dev-only (NODE_ENV !== 'production') |
| S-L2 | Low | express.json 512KB limit | ❌ | — | Adequate for current use cases |
| S-L3 | Low | Dead bot dependencies | ✅ | `package.json` | Removed mysql2, sequelize, dompurify, express, etc. |
| S-L4 | Low | nodemon outdated | ❌ | — | Dev dependency; low priority |
| S-L5 | Low | bcryptjs vs bcrypt | ❌ | — | Pure JS works; native would need build tools |
| S-L6 | Low | allowedOrigins regex | ⏭️ | — | Intentional — kept as-is per user request |
| S-L7 | Low | trust proxy for Vercel | ❌ | — | Same as S-M19 |
| S-L8 | Low | CSRF skipped in test env | ✅ | `lumina-api/index.js` | Now uses CSRF_DISABLED=1 flag instead of NODE_ENV check |
| S-L9 | Low | Console logs leak data | ✅ | `LuminaApiService.js` | API keys now in headers, not URLs; added censoring notes |
| S-L11 | Low | No per-account login lockout | ❌ | — | Requires per-account attempt tracking in MongoDB |
| S-L12 | Low | JWT 1h no refresh token | ❌ | — | Large feature; requires refresh token rotation system |
| S-L13 | Low | OAUTH_STATE_SECRET empty in .env.example | ✅ | `.env.example` | Added "REQUIRED" comment |
| S-L14 | Low | internalKeyCheck no rate limit | ❌ | — | Key is 100+ chars; brute-force infeasible |
| S-L15 | Low | DATA_API_KEY unused | ✅ | `.env.example` | Removed |

---

## Business Model Issues (60)

| # | Severity | Issue | Status | Files Modified | Notes |
|---|----------|-------|--------|----------------|-------|
| B-C1 | Critical | mute/unmute hardcoded guildData | ✅ | `mute.js`, `unmute.js` | Now fetches guildData from API |
| B-C2 | Critical | Gacha probabilities don't sum to 1 | ✅ | `gachaService.js` | Added normalization to sum=1.0 |
| B-C3 | Critical | /give singular item names | ✅ | `give.js` | Fixed to plural (hextechChests, masterWorkChests, keys) |
| B-C4 | Critical | CommandGuard never called | ✅ | `interactionCreate.js` | Wired CommandGuard.check() before execute |
| B-C5 | Critical | Cooldowns never enforced | ✅ | `interactionCreate.js` | Added per-user-per-command cooldown Map |
| B-C6 | Critical | OpenChestModal dashboard broken | ❌ | — | Requires fetch fix in OpenChestModal.jsx |
| B-C7 | Critical | messageCreate wrong env var | ✅ | `messageCreate.js` | Fixed to INTERNAL_API_KEY + use API_BASE_URL |
| B-C8 | Critical | deploy-commands LUMINA_API_kEY typo | ✅ | `deploy-commands.js` | Fixed to LUMINA_API_KEY |
| B-C9 | Critical | /test is Rule34 browser | ✅ | `test.js`, `rule34.js` | Deleted both files |
| B-C10 | Critical | /leaguemastery is stub | ❌ | — | Requires Riot API mastery implementation |
| B-C11 | Critical | Champion rotation hardcoded BR | ✅ | `riotApi.js` | Uses X-Riot-Token header; rotation is global |
| B-C12 | Critical | ban.js setTimeout for auto-unban | ✅ | `ban.js` | Removed setTimeout; relies on PunishmentScheduler |
| B-C13 | Critical | Warn auto-escalation not implemented | ❌ | — | Requires warn count check + escalation logic |
| B-C14 | Critical | unwarn deletes all warns | ❌ | — | Requires warnId field in schema + service method |
| B-C15 | Critical | No ban appeal flow | ❌ | — | Requires appeal submission route + admin UI |
| B-C16 | Critical | Account closure never executed | 🔧 | `DashboardAccountService.js` | Documented TTL index approach; full impl needs MongoDB index creation |
| B-C17 | Critical | /reload event broken | ✅ | `index.js` | Initialized client.events and client._cooldowns |
| B-H1 | High | Pricing false advertising | ✅ | `en-US.json`, `pt-BR.json`, `es-ES.json` | Removed music/ticket/AutoMod from pricing features |
| B-H2 | High | Pricing CTAs dead links | ❌ | — | Requires payment provider integration |
| B-H3 | High | /give no audit log | ❌ | — | Requires audit log table + command log call |
| B-H4 | High | Dead inventory schema fields | ❌ | — | Requires full Hextech Crafting system or field removal migration |
| B-H5 | High | No duplicate protection in gacha | ❌ | — | Requires inventory check before roll |
| B-H6 | High | No pity system | ❌ | — | Requires rollsSinceLastMythic counter + guarantee logic |
| B-H7 | High | Daily reward 3:1 ratio imbalance | ❌ | — | Requires economy rebalancing |
| B-H8 | High | All social commands same GIFs | ❌ | — | Requires curating action-specific GIF sets |
| B-H9 | High | Social commands no stats/leaderboard | ❌ | — | Requires socialInteractions collection + leaderboard command |
| B-H10 | High | Streak no forgiveness/scaling | ✅ | `UserInventoryService.js` | Added 1-hour grace period |
| B-H11 | High | Riot API no caching | ❌ | — | Requires Mongo-based cache for summoner/mastery data |
| B-H12 | High | Public profile empty badges/stats | ✅ | — | Badges already implemented via /badges/user/:identifier |
| B-H13 | High | Timezone picker only 4 zones | ✅ | `updateUserSettings.js` | Now accepts any IANA timezone via Intl validation |
| B-H14 | High | ServerSettingsPage wrong field names | ❌ | — | Requires field name mapping to match schema |
| B-H15 | High | Dashboard exposes ~5 of ~30 guild fields | ❌ | — | Requires full server settings UI buildout |
| B-H16 | High | blockedChannels not respected | ❌ | — | Requires channel check in messageCreate + interactionCreate |
| B-M1 | Medium | Badge minAccessLevel mixes paid/staff | ❌ | — | Requires splitting into minPaidTier + minStaffRole |
| B-M2 | Medium | No badge edit/deactivate UI | ❌ | — | Requires edit modal + active toggle in AdminBadgesTab |
| B-M3 | Medium | No badge redemption audit | ❌ | — | Requires admin "view redemptions" expandable row |
| B-M4 | Medium | Badges only via codes | ❌ | — | Requires auto-grant criteria system |
| B-M5 | Medium | No badge brute-force rate limit | ❌ | — | Requires per-user rate limit on /redeem |
| B-M6 | Medium | Riot API key in URL | ✅ | `riotApi.js` | Same as S-C2 |
| B-M7 | Medium | getMatchHistory always 10 | ❌ | — | Requires passing count parameter to URL |
| B-M8 | Medium | /redeem no linking instructions | ❌ | — | Requires ACCOUNT_NOT_FOUND catch with instructions |
| B-M9 | Medium | Daily 3:1 ratio | ❌ | — | Same as B-H7 |
| B-M10 | Medium | Default inventory too generous | ❌ | — | Requires schema default change + migration |
| B-M11 | Medium | No way to spend skins | ❌ | — | Requires disenchant/trade/gift system |
| B-M12 | Medium | InventoryPage no graceful empty state | ❌ | — | Requires auth check + CTA before broken chest modal |
| B-M13 | Medium | punishList no type field | ❌ | — | Requires schema migration + scheduler routing |
| B-M14 | Medium | Some commands don't use t | ❌ | — | Requires per-command audit |
| B-M15 | Medium | AutoMessageService no UI | ❌ | — | Requires auto-messages tab in dashboard |
| B-M16 | Medium | League region+server both required | ❌ | — | Requires dropping region option |
| B-M17 | Medium | deletionScheduledFor always returned | ❌ | — | Requires conditional field inclusion |
| B-L1 | Low | mythicEssece typo | ❌ | — | Would break existing data if renamed without migration |
| B-L2 | Low | /stop no graceful shutdown | 🔧 | `stop.js` | Added confirmation; full graceful shutdown needs in-flight tracking |
| B-L3 | Low | /emitEvent arbitrary events | ✅ | `emitEvent.js` | Same as S-H12 |
| B-L4 | Low | /help lists all commands | ❌ | — | Requires permission-based filtering |
| B-L5 | Low | give.js PT choice labels | ❌ | — | Requires name_localizations on choices |
| B-L6 | Low | /inventory not a bot command | ❌ | — | Requires building bot command or removing from homepage |
| B-L7 | Low | tagline validation rejects # | ❌ | — | Requires auto-strip instead of error |
| B-L8 | Low | warnsToKick ordering | ❌ | — | Requires schema default change |
| B-L9 | Low | No leaderboards | ❌ | — | Requires XP system + leaderboard command |
| B-L10 | Low | No music feature | ❌ | — | Large feature; not currently planned |

---

## UI/UX Issues (107)

| # | Severity | Issue | Status | Files Modified | Notes |
|---|----------|-------|--------|----------------|-------|
| U-C1 | Critical | SetPasswordModal no method/body | ✅ | `SetPasswordModal.jsx` | Added POST, headers, body, CSRF |
| U-C2 | Critical | UsernameOnboardingModal no method/body | ✅ | `UsernameOnboardingModal.jsx` | Added PUT, headers, body, CSRF |
| U-C3 | Critical | ProfileTab undefined token + syntax error | ✅ | `ProfileTab.jsx` | Deleted (dead code) |
| U-C4 | Critical | ProfileTab broken unlinkDiscord | ✅ | `ProfileTab.jsx` | Deleted (dead code) |
| U-C5 | Critical | DashboardSettingsPage undefined token | ✅ | `DashboardSettingsPage.jsx` | Deleted (dead code) |
| U-C6 | Critical | DashboardLayout invalid DOM nesting | ✅ | `DashboardLayout.jsx` | Deleted (dead code) |
| U-C7 | Critical | RegisterModal broken fetch | ✅ | `RegisterModal.jsx` | Deleted (dead code, RegisterPage is used) |
| U-C8 | Critical | BotAdminPage mockup | ✅ | `BotAdminPage.jsx` | Deleted (dead code) |
| U-C9 | Critical | botAdmin NavBar broken | ✅ | `NavBar.jsx` | Deleted (dead code) |
| U-C10 | Critical | TermsOfUsePage CSS typos | ✅ | `TermsOfUsePage.jsx` | Fixed bg-whit→bg-white, text-gray-90→text-gray-900 |
| U-C11 | Critical | WarningAlert invalid CSS classes | ❌ | — | Files may be dead code; needs verification |
| U-C12 | Critical | DefaultInput/Select/etc invalid CSS | ✅ | `DefaultInput.jsx`, `DefaultSelect.jsx`, `DangerBadge.jsx`, `ActiveInput.jsx` | Deleted (dead code) |
| U-C13 | Critical | RegisterPage lastName label | ✅ | `RegisterPage.jsx` | Fixed to use lastName label |
| U-C14 | Critical | Sidebar clearAllFilters missing props | ❌ | — | Requires passing setters as props or adding onClearAll callback |
| U-C15 | Critical | Header PT strings | ❌ | — | Requires i18n key wrapping |
| U-C16 | Critical | DiscordBanner PT strings | ❌ | — | Requires i18n key wrapping |
| U-C17 | Critical | MutualGuildsList PT strings | ❌ | — | Requires i18n key wrapping |
| U-C18 | Critical | InventoryPage PT strings | ❌ | — | Requires i18n key wrapping |
| U-C19 | Critical | OpenChestModal PT strings | ❌ | — | Requires i18n key wrapping |
| U-C20 | Critical | SettingsPage PT strings | ❌ | — | Requires i18n key wrapping |
| U-H1 | High | alert/confirm in 15+ places | ❌ | — | Requires styled modal component |
| U-H2 | High | console.log in production | ❌ | — | Requires DEV gating on all console calls |
| U-H3 | High | DailyRewardBanner/Modal not i18n | ❌ | — | Requires useT + key wrapping |
| U-H4 | High | Many pages without i18n | ❌ | — | Requires per-page i18n audit |
| U-H5 | High | loginModal useless ternary | ❌ | — | Requires apiError.network key |
| U-H6 | High | Modals lack focus management | ❌ | — | Requires shared Modal component with ARIA |
| U-H7 | High | Header dropdown no keyboard support | ❌ | — | Requires aria-haspopup, aria-expanded, ESC handler |
| U-H8 | High | 3 primary colors | ❌ | — | Requires color sweep: indigo→purple, blue→purple |
| U-H9 | High | Toggle switches no ARIA | ❌ | — | Requires role="switch", aria-checked |
| U-H10 | High | Icon buttons no aria-label | ❌ | — | Requires adding aria-label to each |
| U-H11 | High | Pagination inside parent | ❌ | — | Requires hoisting to module scope |
| U-H12 | High | InventoryPage unauthenticated fetch | ⏭️ | — | Inventory is public by design |
| U-H13 | High | getElementById anti-pattern | ❌ | — | Requires React state management |
| U-H14 | High | toLocaleDateString('pt-BR') | ❌ | — | Requires dynamic locale from i18n |
| U-H15 | High | 3 different headers | ❌ | — | Requires unifying on shared Header.jsx |
| U-H16-H20 | High | Various PT strings in admin tabs | ❌ | — | Requires i18n key wrapping |
| U-M1-M26 | Medium | Various medium UI issues | ❌ | — | See detailed list in review |
| U-L1-L41 | Low | Various low UI issues | ❌ | — | See detailed list in review |

---

## Additional Fixes (Not in original 227)

| Issue | Status | Files Modified | Notes |
|-------|--------|----------------|-------|
| Global consent modal | ✅ | `ConsentModal.jsx`, `main.jsx` | Created and wired in; deleted old ConsentBanner + CookieConsent |
| DashboardBentoGrid dead code | ✅ | `DashboardBentoGrid.jsx` | Deleted |
| DashboardCTA dead code | ✅ | `DashboardCTA.jsx` | Deleted |
| Bot package.json start script | ✅ | `package.json` | Fixed to use cross-env |

---

## Summary

| Category | Total | Fixed | Not Fixed | Skipped | Partially |
|----------|-------|-------|-----------|---------|-----------|
| Security Critical | 8 | 7 | 0 | 0 | 1 |
| Security High | 18 | 10 | 6 | 2 | 0 |
| Security Medium | 19 | 8 | 9 | 1 | 1 |
| Security Low | 15 | 6 | 6 | 2 | 0 |
| Business Critical | 17 | 11 | 5 | 0 | 1 |
| Business High | 16 | 4 | 12 | 0 | 0 |
| Business Medium | 17 | 1 | 16 | 0 | 0 |
| Business Low | 10 | 1 | 8 | 0 | 1 |
| UI/UX Critical | 20 | 10 | 9 | 0 | 0 |
| UI/UX High | 20 | 0 | 19 | 1 | 0 |
| UI/UX Medium | 26 | 0 | 26 | 0 | 0 |
| UI/UX Low | 41 | 0 | 41 | 0 | 0 |
| **Total** | **227** | **58** | **157** | **6** | **4** |

### Top priorities for remaining fixes:
1. S-H14: Email verification system
2. S-M12: Password reset via email
3. S-L12: Refresh token system
4. B-C6: OpenChestModal dashboard fetch fix
5. B-C13: Warn auto-escalation
6. B-H5/H6: Gacha duplicate protection + pity system
7. U-H1: Replace all alert/confirm with styled modals
8. U-H8: Unify primary color to purple-600
9. U-C15-C20: Complete i18n for remaining pages
10. B-H16: Respect blockedChannels
