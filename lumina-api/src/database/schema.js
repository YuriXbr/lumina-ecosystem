let maxDuration = 3 * 30 * 24 * 60 * 60 * 1000; // 1 mês em milissegundos
// 3h em ms
let refreshInterval = 3 * 60 * 60 * 1000; // 3 horas em milissegundos

// Schemas para o banco de dados MongoDB
const bot= {
    clientId: { type: String, required: false, unique: true, default: "" },
    prefix: { type: String, default: 'l!' },
    activityStatus: { type: String, default: 'online' },
    activityType: { type: String, default: 'PLAYING' },
    activityName: { type: String, default: "" },
    activityUrl: { type: String, default: `${process.env.DASHOBAORD_PROTOCOL}://${process.env.DASHBOARD_DOMAIN}` },
    clientSecret: { type: String, required: false, unique: true },
    redirectUri: { type: String, required: false, unique: true },
    owners: { type: Array, default: [] },
    admins: { type: Array, default: [] },
    moderators: { type: Array, default: [] },
    staffPermissions: { type: Object, default: {
        owner: ["*"], 
        admins: ["LUMINA_CHANGECONFIG", "LUMINA_MANAGEUSERS", "LUMINA_MANAGEACCOUNTS", "LUMINA_ADDMODS",], 
        moderators:["LUMINA_VIEWTICKETS", "LUMINA_SPECIALCMDS"]
    }},
    mainGuild: { type: String, required: false, unique: true, default: "" },
    logGuild: { type: String, required: false, unique: true, default: "" },
    logStartChannel: { type: String, default: "" },
    logErrorChannel: { type: String, default: "" },
    logEventsChannel: { type: String, default: "" },
    logDebugChannel: { type: String, default: "" },
    logStaffChannel: { type: String, default: "" },
    logDashboardChannel: { type: String, default: "" },
    logAllChannel: { type: String, default: "" },
    logDataBaseChannel: { type: String, default: "" },
    deployGuilds: { type: Array, default: [] },
    devMode: { type: Boolean, default: false },
    maintenanceMode: { type: Boolean, default: false },
    webhookUrl: { type: String, default: "" },
    githubwebhookUrl: { type: String, default: "" },
}

const inventory= {
    userId: { type: String, required: true, unique: true },
    hextechChests: { type: Number, default: 10 },
    masterWorkChests: { type: Number, default: 1 },
    keys: { type: Number, default: 11 },
    mythicEssece: { type: Number, default: 0 },
    blueEssence: { type: Number, default: 0 },
    orangeEssence: { type: Number, default: 0 },
    championShards: { type: Object, default: {} },
    champions: { type: Object, default: {} },
    skinShards: { type: Object, default: {} },
    dailyRewardClaim: { type: Date, default: null },
    nextDailyReward: { type: Date, default: null },
    dailyRewardStreak: { type: Number, default: 0 },
    skins: { type: Array, default: [] },
}

const guilds= {
    guildId: { type: String, required: true, unique: true },
    guildReferenceName: { type: String, required: true },
    muteRoleId: { type: String, required: false },
    banRoleId: { type: String, required: false },
    moderationChannelId: { type: String, required: false },
    usersInventory: { type: Object, default: {} },
    gachaRollsLastRefresh: { type: Date, default: Date.now },
    gachaRollsRefreshInterval: { type: Number, default: refreshInterval },
    gachaRolls: { type: Object, default: {} },
    gachaMaxRolls: { type: Number, default: 8 },
    gachaGameMode: { type: String, default: 'personal' },
    guildOwnerId: { type: String, required: true },
    prefix: { type: String, default: 'l!' },
    blockedChannels: { type: Object, default: [] },
    djEnabled: { type: Boolean, default: false },
    djRoleId: { type: String, default: '' },
    persistentMute: { type: Boolean, default: true },
    persistentWarns: { type: Boolean, default: true },
    warnsToMute: { type: Number, default: 3 },
    warnsToTimeOut: { type: Number, default: 5 },
    warnsToKick: { type: Number, default: 6 },
    warnsToBan: { type: Number, default: 7 },
    autoWarnPunishment: { type: Boolean, default: false },
    botInfoChannelId: { type: String, default: '' },
    eventLogChannelId: { type: String, default: '' },
    guildLocale: { type: String, default: 'en-US' },
    canPunishStaff: { type: Boolean, default: true },
    memberDmToggle: { type: Boolean, default: false },
    memberWelcomeToggle: { type: Boolean, default: false },
    memberJoinChannelId: { type: String, default: '' },
    memberJoinMessage: { type: String, default: '' },
    memberLeaveChannelId: { type: String, default: '' },
    memberLeaveMessage: { type: String, default: '' },
    memberJoinDmMessage: { type: String, default: '' },
    warnDuration: { type: Number, default: maxDuration }
}
const punishList= {
    guildId: { type: String, required: true },
    targetId: { type: String, required: true },
    staffId: { type: String, required: true },
    reason: { type: String, default: '' },
    startTime: { type: Date, default: Date.now },
    endTime: { type: Date, default: null }
}
const userHistory= {
    userId: { type: String, required: true },
    warns: { type: Object, default: 0 },
    lastWarn: { type: Object, default: {} },
    lastMute: { type: Object, default: {} },
    lastKick: { type: Object, default: {} },
    lastBan: { type: Object, default: {} },
    lastUnmute: { type: Object, default: {} },
    lastUnban: { type: Object, default: {} },
    lastPunishment: { type: Object, default: {} },
    punishmentCount: { type: Object, default: {} },
    punishmentDuration: { type: Object, default: {} },
    botBanned: { type: Boolean, default: false },
    botBanReason: { type: String, default: '' },
    botBanDate: { type: Date, default: null },
    botBanEndDate: { type: Date, default: null },
    botBanStaff: { type: String, default: '' },
    isBot: { type: Boolean, default: false },
    role: { type: String, default: "user" },
    experience: { type: Number, default: 0 },
    level: { type: Number, default: 0 },

}

const skins= {
    championId: { type: String, required: true, unique: true },
    quantity: { type: Number, required: true },
    legacy: { type: Object, default: {} },
    epic: { type: Object, default: {} },
    legendary: { type: Object, default: {} },
    ultimate: { type: Object, default: {} },
    transcendent: { type: Object, default: {} },
    mythic: { type: Object, default: {} },
    legacyQuantity: { type: Number, required: true },
    epicQuantity: { type: Number, required: true },
    legendaryQuantity: { type: Number, required: true },
    ultimateQuantity: { type: Number, required: true },
    transcendentQuantity: { type: Number, required: true },
    mythicQuantity: { type: Number, required: true },
    updatePatch: { type: String, required: true },
    updateDate: { type: Date, default: Date.now }
}
const skinsIdList= {
    id: { type: Number, required: true, unique: true },
    name: { type: String, required: true },
    description: { type: String, required: false },
    championId: { type: String, required: true },
    championName: { type: String, required: true },
    isBase: { type: Boolean, required: false },
    rarity: { type: String, required: false },
    isLegacy: { type: Boolean, required: false },
    skinLines: { type: Array, default: [] },
    splashPath: { type: String, required: false },
    loadScreenPath: { type: String, required: false },
    tilePath: { type: String, required: false },
    uncenteredSplashPath: { type: String, required: false },
    updatePatch: { type: String, required: true },
    updateDate: { type: Date, default: Date.now },
    championdata: { type: Object, default: {} }
}
const champions= {
    championId: { type: String, required: true, unique: true },
    championName: { type: String, required: true },
    updatePatch: { type: String, required: true },
    updateDate: { type: Date, default: Date.now }
}
const skinlines= {
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    description: { type: String, required: true },
    updatePatch: { type: String, required: true },
    updateDate: { type: Date, default: Date.now }
}
const universes= {
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    description: { type: String, required: true },
    skinsSets: { type: Array, default: [] },
    updatePatch: { type: String, required: true },
    updateDate: { type: Date, default: Date.now }
}


const dashboardAccounts= {
    // User account identification and authentication
    accountId: { type: String, required: true, unique: true },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    // ALTERADO: senha agora é opcional — contas criadas via OAuth2 (Discord, etc.)
    // nascem sem senha até o usuário definir uma (ver rota /expapi/v1/user/set-password).
    password: { type: String, required: false, default: '' },
    accessType: { type: String, required: false, default: 'user' },

    // NOVO: registro genérico de provedores OAuth2 vinculados a esta conta.
    // Formato: { discord: { providerId, linkedAt }, google: { providerId, linkedAt }, ... }
    // Pensado para ser modular: plugar um novo provedor não exige migração de schema.
    authProviders: { type: Object, default: {} },

    // User email verification status
    emailVerified: { type: Boolean, default: false },
    emailVerificationToken: { type: String, default: '' },
    emailVerificationTokenExpires: { type: Date, default: Date.now },
    emailVerificationTokenUsed: { type: Boolean, default: false },
    emailVerificationTokenUsedDate: { type: Date, default: Date.now },

    // User Two-Factor Authentication status
    twoFactorAuth: { type: Boolean, default: false },
    twoFactorAuthToken: { type: String, default: '' },
    twoFactorAuthSecret: { type: String, default: '' },
    twoFactorAuthBackupCodes: { type: Array, default: [] },
    twoFactorAuthBackupCodesUsed: { type: Array, default: [] },
    twoFactorAuthBackupCodesGenerated: { type: Date, default: Date.now },
    twoFactorAuthBackupCodesExpires: { type: Date, default: Date.now },
    twoFactorAuthBackupCodesUsedDate: { type: Date, default: Date.now },
    

    // User discord oauth2 authentication
    discordOauth2Id: { type: String, required: false, default: '' },
    discordOauth2Token: { type: String, required: false, default: '' },
    discordOauth2RefreshToken: { type: String, required: false, default: '' },
    discordOauth2TokenExpiresAt: { type: Date, required: false, default: '' },
    discordOauth2TokenScope: { type: String, required: false, default: '' },
    discordOauth2TokenType: { type: String, required: false, default: '' },
    discordOauth2TokenRequestDate: { type: Date, required: false, default: '' },
    discordOauth2TokenRequestIp: { type: String, required: false, default: '' },

    // User GEO data and government ID
    governamentId: { type: String, required: false, default: '' },
    phoneNumber: { type: String, required: false, default: '' },
    birthDate: { type: Date, required: false, default: '' },
    country: { type: String, required: false, default: '' },
    state: { type: String, required: false, default: '' },
    city: { type: String, required: false, default: '' },
    street: { type: String, required: false, default: '' },
    number: { type: String, required: false, default: '' },
    complement: { type: String, required: false, default: '' },
    zipCode: { type: String, required: false, default: '' },

    // User login security statistics
    lastLogin: { type: Date, default: Date.now },
    lastLoginIp: { type: String, default: '' },
    lastLoginUserAgent: { type: String, default: '' },
    lastLoginLocation: { type: String, default: '' },
    lastLoginCountry: { type: String, default: '' },
    lastLoginCity: { type: String, default: '' },
    
    // User registration security statistics
    registrationIp: { type: String, default: '' },
    registrationDate: { type: Date, default: Date.now },
    registrationUserAgent: { type: String, default: '' },
    registrationLocation: { type: String, default: '' },
    registrationCountry: { type: String, default: '' },
    registrationCity: { type: String, default: '' },
    
    // User password reset security statistics
    passwordResetToken: { type: String, default: '' },
    passwordResetTokenExpires: { type: Date, default: Date.now },
    passwordResetTokenUsed: { type: Boolean, default: false },
    passwordResetTokenUsedDate: { type: Date, default: Date.now },
    passwordResetTokenUsedIp: { type: String, default: '' },
    passwordResetTokenUsedUserAgent: { type: String, default: '' },
    passwordResetTokenUsedLocation: { type: String, default: '' },
    passwordResetTokenUsedCountry: { type: String, default: '' },
    passwordResetTokenUsedCity: { type: String, default: '' },
    
    // User account security statistics
    browserFingerprint: { type: Object, default: '' },
    browserFingerprintDate: { type: Date, default: Date.now },
    browserAgent: { type: String, default: '' },
    
    // User account status
    blocked: { type: Boolean, default: false },
    blockAuthor: { type: String, default: '' },
    blockDate: { type: Date, default: Date.now },
    blockReason: { type: String, default: '' },
    blockExpiration: { type: Date },
    blockCounter: { type: Number, default: 0 },

    banned: { type: Boolean, default: false },
    banAuthor: { type: String, default: '' },
    banDate: { type: Date, default: Date.now },
    banReason: { type: String, default: '' },
    banExpiration: { type: Date },
    banAppeal: { type: String, default: '' },
    banAppealDate: { type: Date },
    banAppealResponse: { type: String, default: '' },
    banAppealResponseDate: { type: Date },
    banAppealResponseBy: { type: String, default: '' },
    banAppealResponseIp: { type: String, default: '' },
    banCounter: { type: Number, default: 0 },

    // User preferences and settings
    emailNotifications: { type: Boolean, default: true },
    discordNotifications: { type: Boolean, default: true },
    botActivityAlerts: { type: Boolean, default: false },
    publicProfile: { type: Boolean, default: false },
    showOnlineStatus: { type: Boolean, default: true },
    language: { type: String, default: 'pt-BR' },
    timezone: { type: String, default: 'America/Sao_Paulo' },
    lastPasswordChange: { type: Date, default: Date.now },
}

const mongoSchema = {
    bot,
    inventory,
    guilds,
    punishList,
    userHistory,
    skins,
    skinsIdList,
    champions,
    skinlines,
    universes,
    dashboardAccounts,

    // Logs de todas as requisições/eventos da API (rastreabilidade total)
    // TTL gerenciado via índice { expiresAt: 1 } no MongoDB (30 dias)
    apiLogs: {
        requestId:  { type: String, default: '' },
        level:      { type: String, default: 'info' }, // debug|info|warn|error|critical
        type:       { type: String, default: 'API' },  // API|DB|AUTH|OAUTH|GACHA|RATE_LIMIT
        action:     { type: String, default: '' },
        message:    { type: String, default: '' },
        route:      { type: String, default: '' },
        method:     { type: String, default: '' },
        statusCode: { type: Number, default: 0 },
        durationMs: { type: Number, default: 0 },
        ip:         { type: String, default: '' },
        userEmail:  { type: String, default: '' },
        userId:     { type: String, default: '' },
        userAgent:  { type: String, default: '' },
        extra:      { type: Object, default: {} },
        environment:{ type: String, default: process.env.NODE_ENV || 'development' },
        createdAt:  { type: Date, default: Date.now },
        expiresAt:  { type: Date, default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
    },

    // Cache persistente em MongoDB (serverless-safe: sem memória de processo)
    // TTL gerenciado via índice { expiresAt: 1 } no MongoDB
    apiCache: {
        key:       { type: String, required: true, unique: true },
        value:     { type: Object, default: {} },
        expiresAt: { type: Date, required: true },
        createdAt: { type: Date, default: Date.now },
    },

    // Rate limit por IP por rota, com backoff exponencial entre bloqueios
    // Chave composta: { ip, route } — índice único no MongoDB
    ipRateLimits: {
        ip:           { type: String, required: true },
        route:        { type: String, required: true },
        windowStart:  { type: Date, default: Date.now },
        requestCount: { type: Number, default: 0 },
        blockCount:   { type: Number, default: 0 },   // total de bloqueios sofridos
        blockedUntil: { type: Date, default: null },   // null = não bloqueado no momento
        updatedAt:    { type: Date, default: Date.now },
    },
};

module.exports = {
    mongoSchema,
};
