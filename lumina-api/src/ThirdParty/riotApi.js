const axios = require('axios');
const { addLog } = require('../logger/logger');

const apiKey = process.env.RIOT_API_KEY;

const regionMap = {
  br1: 'americas',
  na1: 'americas',
  euw1: 'europe',
  eun1: 'europe',
  kr: 'asia',
  jp1: 'asia',
  la1: 'americas',
  la2: 'americas',
  oc1: 'americas',
  tr1: 'europe',
  ru: 'europe'
};

// Allow-list de hosts/regiões válidos para os endpoints da Riot Games.
// CORREÇÃO DE SEGURANÇA (SSRF via host injection): as funções abaixo
// interpolavam `region`/`server` diretamente no host da URL
// (`https://${region}.${RIOT_BASE_URL}/...`). Se qualquer valor não
// confiável chegasse a esses parâmetros (ex: vindo de uma futura rota que
// aceite `region` do usuário), um atacante poderia injetar algo como
// `evil.com#` — o caractere `#` encerra a "authority" da URL e tudo depois
// vira fragmento, fazendo o axios.get() enviar a requisição (incluindo a
// api_key da Riot no header/query) para `evil.com` em vez da Riot API.
// validateRegionOrServer() garante que só os valores conhecidos e fixos do
// regionMap (routing regions incluídas) alcançam a interpolação de URL.
const VALID_ROUTING_VALUES = new Set([
    ...Object.keys(regionMap),
    ...Object.values(regionMap),
]);

function assertValidRegionOrServer(value, paramName) {
    if (!VALID_ROUTING_VALUES.has(value)) {
        throw new Error(`Valor de ${paramName} não permitido: ${JSON.stringify(value)}`);
    }
    return value;
}

async function getAccountByRiotId(region, gameName, tagLine, commandOrigin = 'unknown') {
    region = assertValidRegionOrServer(region, 'region');
    const url = `https://${region}.${process.env.RIOT_BASE_URL}/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}?api_key=${apiKey}`;
    try {
        const response = await axios.get(url);
        return response.data;
    } catch (err) {
        if (err.response?.status === 404) return { error: 'Account not found' };
        addLog('RIOT', 'getAccountByRiotId.error', `${commandOrigin} → ${err.message}`);
        return undefined;
    }
}

async function getChampionMastery(server, PUUID, commandOrigin = 'unknown') {
    server = assertValidRegionOrServer(server, 'server');
    const url = `https://${server}.${process.env.RIOT_BASE_URL}/lol/champion-mastery/v4/champion-masteries/by-puuid/${encodeURIComponent(PUUID)}?api_key=${apiKey}`;
    try {
        const response = await axios.get(url);
        return response.data;
    } catch (err) {
        addLog('RIOT', 'getChampionMastery.error', `${commandOrigin} → ${err.message}`);
        return undefined;
    }
}

async function fetchChampionName(key, commandOrigin = 'unknown') {
    const url = `http://ddragon.leagueoflegends.com/cdn/${await getDDragonLatestVersion(commandOrigin)}/data/en_US/champion.json`;
    try {
        const response = await axios.get(url);
        const championData = response.data.data;
        for (const champion in championData) {
            if (championData[champion].key == key) {
                return {
                    id: championData[champion].id,
                    key: championData[champion].key,
                    sprite: championData[champion].image.sprite,
                    fullImage: championData[champion].image.full,
                    title: championData[champion].title,
                    blurb: championData[champion].blurb,
                    tags: championData[champion].tags,
                    name: championData[champion].name,
                };
            }
        }
        return null;
    } catch (err) {
        addLog('RIOT', 'fetchChampionName.error', `${commandOrigin} → ${err.message}`);
        return null;
    }
}

async function getChampionRotation(commandOrigin = 'unknown') {
    const url = `https://euw1.api.riotgames.com/lol/platform/v3/champion-rotations?api_key=${apiKey}`;
    try {
        const response = await axios.get(url);
        return response.data.freeChampionIds;
    } catch (err) {
        addLog('RIOT', 'getChampionRotation.error', `${commandOrigin} → ${err.message}`);
        return undefined;
    }
}

async function getMatchHistory(region, PUUID, commandOrigin = 'unknown') {
    region = assertValidRegionOrServer(region, 'region');
    const url = `https://${region}.${process.env.RIOT_BASE_URL}/lol/match/v5/matches/by-puuid/${PUUID}/ids?start=0&count=10&api_key=${apiKey}`;
    try {
        const response = await axios.get(url);
        const matchIds = response.data;
        const matchHistory = [];
        for (const matchId of matchIds) {
            const matchUrl = `https://${region}.${process.env.RIOT_BASE_URL}/lol/match/v5/matches/${matchId}?api_key=${apiKey}`;
            const matchResponse = await axios.get(matchUrl);
            matchHistory.push(matchResponse.data);
        }
        return matchHistory;
    } catch (err) {
        addLog('RIOT', 'getMatchHistory.error', `${commandOrigin} → ${err.message}`);
        return undefined;
    }
}

async function getSummonerInfo(server, PUUID, commandOrigin = 'unknown') {
    server = assertValidRegionOrServer(server, 'server');
    const url = `https://${server}.${process.env.RIOT_BASE_URL}/lol/summoner/v4/summoners/by-puuid/${encodeURIComponent(PUUID)}?api_key=${apiKey}`;
    try {
        const response = await axios.get(url);
        return response.data;
    } catch (err) {
        addLog('RIOT', 'getSummonerInfo.error', `${commandOrigin} → ${err.message}`);
        return undefined;
    }
}

async function getLeagueEntries(server, summonerId, commandOrigin = 'unknown') {
    server = assertValidRegionOrServer(server, 'server');
    const url = `https://${server}.${process.env.RIOT_BASE_URL}/lol/league/v4/entries/by-summoner/${summonerId}?api_key=${apiKey}`;
    try {
        const response = await axios.get(url);
        return response.data;
    } catch (err) {
        addLog('RIOT', 'getLeagueEntries.error', `${commandOrigin} → ${err.message}`);
        return undefined;
    }
}

async function getDDragonVersions(commandOrigin = 'unknown') {
    const url = 'https://ddragon.leagueoflegends.com/api/versions.json';
    try {
        const response = await axios.get(url);
        return response.data;
    } catch (err) {
        addLog('RIOT', 'getDDragonVersions.error', `${commandOrigin} → ${err.message}`);
        return undefined;
    }
}

async function getLatestCDPatchVersion(commandOrigin = 'unknown') {
    const url = 'https://raw.communitydragon.org/latest/compat-version-metadata.json';
    try {
        const response = await axios.get(url);
        return response.data.version.split('+')[0];
    } catch (err) {
        addLog('RIOT', 'getLatestCDPatchVersion.error', `${commandOrigin} → ${err.message}`);
        return undefined;
    }
}

async function getDDragonLatestVersion(commandOrigin = 'unknown') {
    try {
        const versions = await getDDragonVersions(commandOrigin);
        return versions[0];
    } catch (err) {
        addLog('RIOT', 'getDDragonLatestVersion.error', `${commandOrigin} → ${err.message}`);
        return undefined;
    }
}

async function getRankedQueues(server, elo, division, commandOrigin = 'unknown') {
    server = assertValidRegionOrServer(server, 'server');
    let url;
    if (elo === 'CHALLENGER') {
        url = `https://${server}.${process.env.RIOT_BASE_URL}/lol/league/v4/challengerleagues/by-queue/RANKED_SOLO_5x5?api_key=${apiKey}`;
    } else if (elo === 'GRANDMASTER') {
        url = `https://${server}.${process.env.RIOT_BASE_URL}/lol/league/v4/grandmasterleagues/by-queue/RANKED_SOLO_5x5?api_key=${apiKey}`;
    } else if (elo === 'MASTER') {
        url = `https://${server}.${process.env.RIOT_BASE_URL}/lol/league/v4/masterleagues/by-queue/RANKED_SOLO_5x5?api_key=${apiKey}`;
    } else {
        url = `https://${server}.${process.env.RIOT_BASE_URL}/lol/league/v4/entries/RANKED_SOLO_5x5/${elo}/${division}?api_key=${apiKey}`;
    }
    try {
        const response = await axios.get(url);
        return response.data;
    } catch (err) {
        addLog('RIOT', 'getRankedQueues.error', `${commandOrigin} → ${err.message}`);
        return undefined;
    }
}

async function getPUUIDBySummonerId(server, summonerId, commandOrigin = 'unknown') {
    server = assertValidRegionOrServer(server, 'server');
    const url = `https://${server}.${process.env.RIOT_BASE_URL}/lol/summoner/v4/summoners/${encodeURIComponent(summonerId)}?api_key=${apiKey}`;
    try {
        const response = await axios.get(url);
        return response.data.puuid;
    } catch (err) {
        addLog('RIOT', 'getPUUIDBySummonerId.error', `${commandOrigin} → ${err.message}`);
        return undefined;
    }
}

async function getAccountByPUUID(region, PUUID, commandOrigin = 'unknown') {
    region = assertValidRegionOrServer(region, 'region');
    const url = `https://${region}.api.riotgames.com/riot/account/v1/accounts/by-puuid/${encodeURIComponent(PUUID)}?api_key=${apiKey}`;
    try {
        const response = await axios.get(url);
        return response.data.gameName;
    } catch (err) {
        addLog('RIOT', 'getAccountByPUUID.error', `${commandOrigin} → ${err.message}`);
        return undefined;
    }
}

async function getMasteriesBySummonerId(region, summonerId, commandOrigin = 'unknown') {
    region = assertValidRegionOrServer(region, 'region');
    const url = `https://${region}.${process.env.RIOT_BASE_URL}/lol/champion-mastery/v4/champion-masteries/by-summoner/${encodeURIComponent(summonerId)}?api_key=${apiKey}`;
    try {
        const response = await axios.get(url);
        return response.data;
    } catch (err) {
        addLog('RIOT', 'getMasteriesBySummonerId.error', `${commandOrigin} → ${err.message}`);
        return undefined;
    }
}

async function getChampions(commandOrigin = 'unknown') {
    const url = `http://ddragon.leagueoflegends.com/cdn/${await getDDragonLatestVersion(commandOrigin)}/data/en_US/champion.json`;
    try {
        const response = await axios.get(url);
        return Object.values(response.data.data).map(c => ({ id: c.id, name: c.name, key: c.key }));
    } catch (err) {
        addLog('RIOT', 'getChampions.error', `${commandOrigin} → ${err.message}`);
        return undefined;
    }
}

async function getAllChampionsSkins(commandOrigin = 'unknown') {
    const champions = await getChampions(commandOrigin);
    if (!champions) return undefined;

    const allSkins = {};
    for (const champion of champions) {
        const skins = await getChampionSkins(champion.id, commandOrigin);
        if (skins) allSkins[champion.name] = skins;
    }
    return allSkins;
}

async function getChampionSkins(championId, commandOrigin = 'unknown') {
    const url = `http://ddragon.leagueoflegends.com/cdn/${await getDDragonLatestVersion(commandOrigin)}/data/en_US/champion/${championId}.json`;
    try {
        const response = await axios.get(url);
        return response.data.data[championId].skins;
    } catch (err) {
        addLog('RIOT', 'getChampionSkins.error', `${commandOrigin} → ${err.message}`);
        return undefined;
    }
}

async function getSkinArt(championId, skinNum, commandOrigin = 'unknown') {
    const url = `https://ddragon.leagueoflegends.com/cdn/img/champion/centered/${championId}_${skinNum}.jpg`;
    try {
        const response = await axios.get(url);
        return response.data;
    } catch (err) {
        addLog('RIOT', 'getSkinArt.error', `${commandOrigin} → ${err.message}`);
        return undefined;
    }
}

async function getSkinRarity(skinId, commandOrigin = 'unknown') {
    const url = 'https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/skins.json';
    try {
        const response = await axios.get(url);
        return response.data[skinId]?.rarity;
    } catch (err) {
        addLog('RIOT', 'getSkinRarity.error', `${commandOrigin} → ${err.message}`);
        return undefined;
    }
}

async function getSkinDetails(skinId, commandOrigin = 'unknown') {
    const url = 'https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/skins.json';
    const updatePatch = await getLatestCDPatchVersion(commandOrigin);
    try {
        const response = await axios.get(url);
        const skinData = response.data[skinId];
        if (!skinData) return undefined;
        return {
            id: skinData.id,
            name: skinData.name,
            description: skinData.description,
            isBase: skinData.isBase,
            rarity: skinData.rarity,
            isLegacy: skinData.isLegacy,
            skinLines: skinData.skinLines,
            splashPath: skinData.splashPath,
            loadScreenPath: skinData.loadScreenPath,
            tilePath: skinData.tilePath,
            uncenteredSplashPath: skinData.uncenteredSplashPath,
            updatePatch,
        };
    } catch (err) {
        addLog('RIOT', 'getSkinDetails.error', `${commandOrigin} → ${err.message}`);
        return undefined;
    }
}

async function getChampionsId(commandOrigin = 'unknown') {
    const url = 'https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/championperkstylemap.json';
    try {
        const response = await axios.get(url);
        return Object.values(response.data).map(c => ({ name: c.championName, id: c.championId }));
    } catch (err) {
        addLog('RIOT', 'getChampionsId.error', `${commandOrigin} → ${err.message}`);
        return undefined;
    }
}

async function fetchChampionsData(commandOrigin = 'unknown') {
    const patch = await getLatestCDPatchVersion(commandOrigin);
    if (!patch) return undefined;

    const url = 'https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/champion-summary.json';
    try {
        const response = await axios.get(url);
        return Object.values(response.data).map(c => ({
            championId: c.alias,
            championName: c.name,
            updatePatch: patch,
        }));
    } catch (err) {
        addLog('RIOT', 'fetchChampionsData.error', `${commandOrigin} → ${err.message}`);
        return undefined;
    }
}

async function fetchSkinlinesData(commandOrigin = 'unknown') {
    const patch = await getLatestCDPatchVersion(commandOrigin);
    if (!patch) return undefined;

    const url = 'https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/skinlines.json';
    try {
        const response = await axios.get(url);
        return response.data
            .filter(sl => sl.name && sl.description)
            .map(sl => ({ id: sl.id, name: sl.name, description: sl.description, updatePatch: patch }));
    } catch (err) {
        addLog('RIOT', 'fetchSkinlinesData.error', `${commandOrigin} → ${err.message}`);
        return undefined;
    }
}

async function fetchUniversesData(commandOrigin = 'unknown') {
    const patch = await getLatestCDPatchVersion(commandOrigin);
    if (!patch) return undefined;

    const url = 'https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/universes.json';
    try {
        const response = await axios.get(url);
        return response.data.map(u => ({
            id: u.id,
            name: u.name,
            description: u.description,
            skinsSets: u.skinSets,
            updatePatch: patch,
        }));
    } catch (err) {
        addLog('RIOT', 'fetchUniversesData.error', `${commandOrigin} → ${err.message}`);
        return undefined;
    }
}

module.exports = {
    getAccountByRiotId,
    getChampionMastery,
    getSummonerInfo,
    getLeagueEntries,
    getDDragonVersions,
    getDDragonLatestVersion,
    fetchChampionName,
    getChampionRotation,
    getMatchHistory,
    getRankedQueues,
    getPUUIDBySummonerId,
    getAccountByPUUID,
    regionMap,
    getMasteriesBySummonerId,
    getChampions,
    getAllChampionsSkins,
    getChampionSkins,
    getSkinArt,
    getSkinRarity,
    getSkinDetails,
    getChampionsId,
    fetchChampionsData,
    fetchSkinlinesData,
    fetchUniversesData,
    getLatestCDPatchVersion,
};
