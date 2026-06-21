const apiKey = process.env.RIOT_API_KEY;
const axios = require('axios');
const { logApiCall, logApiCallError } = require('../utils/logger/logger.js');
const { error } = require('../utils/colorCodes.js');

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

/**
 * Fetch account information by Riot ID.
 * @param {string} region - The region of the account.
 * @param {string} gameName - The game name of the account.
 * @param {string} tagLine - The tag line of the account.
 * @param {string} [commandOrigin="unknown"] - The origin of the command.
 * @returns {Promise<Object|undefined>} The account information or undefined if an error occurs.
 * @return {string} puuid - The PUUID of the account.
 * @return {string} gameName - The game name of the account.
 * @return {string} tagLine - The tag line of the account.
 */
async function getAccountByRiotId(region, gameName, tagLine, commandOrigin = "unknown") {
    const url = `https://${region}.${process.env.RIOT_BASE_URL}/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}?api_key=${apiKey}`;
    try {
        const response = await axios.get(url);
        logApiCall(commandOrigin, 'getAccountByRiotId', { region, gameName, tagLine }, response.data, response.data);
        return response.data;
    } catch (err) {
        logApiCall(commandOrigin, 'getAccountByRiotId', { region, gameName, tagLine }, err, null);
        logApiCallError(commandOrigin, 'getAccountByRiotId', { region, gameName, tagLine }, err);
        if (err.response && err.response.status === 404) {
            return { error: 'Account not found' };
        }
        return undefined;
    }
}

/**
 * Fetch champion mastery by PUUID.
 * @param {string} server - The server of the account.
 * @param {string} PUUID - The PUUID of the account.
 * @param {string} [commandOrigin="unknown"] - The origin of the command.
 * @returns {Promise<Object|undefined>} The champion mastery information or undefined if an error occurs.
 */
async function getChampionMastery(server, PUUID, commandOrigin = "unknown") {
    const url = `https://${server}.${process.env.RIOT_BASE_URL}/lol/champion-mastery/v4/champion-masteries/by-puuid/${encodeURIComponent(PUUID)}?api_key=${apiKey}`;
    try {
        const response = await axios.get(url);
        logApiCall(commandOrigin, 'getChampionMastery', { server, PUUID }, response.data, response.data);
        return response.data;
    } catch (err) {
        logApiCallError(commandOrigin, 'getChampionMastery', { server, PUUID }, err);
        logApiCall(commandOrigin, 'getChampionMastery', { server, PUUID }, err, null);
        return undefined;
    }
}

/**
 * Fetch champion name by key.
 * @param {string} key - The key of the champion.
 * @param {string} [commandOrigin="unknown"] - The origin of the command.
 * @returns {Promise<Object|null>} The champion information or null if an error occurs.
 */
async function fetchChampionName(key, commandOrigin = "unknown") {
    const url = `http://ddragon.leagueoflegends.com/cdn/${await getDDragonLatestVersion(commandOrigin)}/data/en_US/champion.json`;
    try {
        const response = await axios.get(url);
        const championData = response.data.data;
        let championInfo = null;
        for (const champion in championData) {
            if (championData[champion].key == key) {
                championInfo = {
                    id: championData[champion].id,
                    key: championData[champion].key,
                    sprite: championData[champion].image.sprite,
                    fullImage: championData[champion].image.full,
                    title: championData[champion].title,
                    blurb: championData[champion].blurb,
                    tags: championData[champion].tags,
                    name: championData[champion].name,
                };
                break;
            }
        }
        logApiCall(commandOrigin, 'fetchChampionName', { key }, championInfo, championInfo);
        return championInfo;
    } catch (err) {
        logApiCallError(commandOrigin, 'fetchChampionName', { key }, err);
        logApiCall(commandOrigin, 'fetchChampionName', { key }, err, null);
        return null;
    }
}

/**
 * Fetch the current champion rotation.
 * @param {string} [commandOrigin="unknown"] - The origin of the command.
 * @returns {Promise<Array<number>|undefined>} The list of free champion IDs or undefined if an error occurs.
 */
async function getChampionRotation(commandOrigin = "unknown") {
    const url = `https://br1.api.riotgames.com/lol/platform/v3/champion-rotations?api_key=${apiKey}`;
    try {
        const response = await axios.get(url);
        logApiCall(commandOrigin, 'getChampionRotation', {}, response.data, response.data.freeChampionIds);
        return response.data.freeChampionIds;
    } catch (err) {
        logApiCallError(commandOrigin, 'getChampionRotation', {}, err);
        logApiCall(commandOrigin, 'getChampionRotation', {}, err, null);
        return undefined;
    }
}

/**
 * Fetch match history by PUUID.
 * @param {string} region - The region of the account.
 * @param {string} PUUID - The PUUID of the account.
 * @param {string} [commandOrigin="unknown"] - The origin of the command.
 * @returns {Promise<Array<Object>|undefined>} The match history or undefined if an error occurs.
 */
async function getMatchHistory(region, PUUID, commandOrigin = "unknown") {
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
        logApiCall(commandOrigin, 'getMatchHistory', { region, PUUID }, matchHistory, matchHistory);
        return matchHistory;
    } catch (err) {
        logApiCallError(commandOrigin, 'getMatchHistory', { region, PUUID }, err);
        logApiCall(commandOrigin, 'getMatchHistory', { region, PUUID }, err, null);
        return undefined;
    }
}

/**
 * Fetch summoner information by PUUID.
 * @param {string} server - The server of the account.
 * @param {string} PUUID - The PUUID of the account.
 * @param {string} [commandOrigin="unknown"] - The origin of the command.
 * @returns {Promise<Object|undefined>} The summoner information or undefined if an error occurs.
 * @return {string} id - The summoner ID of the account.
 * @return {string} accountId - The account ID of the account.
 * @return {string} puuid - The PUUID of the account.
 * @return {integer} profileIconId - The profile icon ID of the account.
 * @return {integer} revisionDate - The revision date of the account.
 * @return {integer} summonerLevel - The summoner level of the account.
 */
async function getSummonerInfo(server, PUUID, commandOrigin = "unknown") {
    const url = `https://${server}.${process.env.RIOT_BASE_URL}/lol/summoner/v4/summoners/by-puuid/${encodeURIComponent(PUUID)}?api_key=${apiKey}`;
    console.log(`Fetching summoner info from URL: ${url}`);
    try {
        const response = await axios.get(url);
        logApiCall(commandOrigin, 'getSummonerInfo', { server, PUUID }, response.data, response.data);
        return response.data;
    } catch (err) {
        logApiCallError(commandOrigin, 'getSummonerInfo', { server, PUUID }, err);
        logApiCall(commandOrigin, 'getSummonerInfo', { server, PUUID }, err, null);
        return undefined;
    }
}

/**
 * Fetch league entries by summoner ID.
 * @param {string} server - The server of the account.
 * @param {string} summonerId - The summoner ID of the account.
 * @param {string} [commandOrigin="unknown"] - The origin of the command.
 * @returns {Promise<Object|undefined>} The league entries or undefined if an error occurs.
 */
async function getLeagueEntries(server, summonerId, commandOrigin = "unknown") {
    const url = `https://${server}.${process.env.RIOT_BASE_URL}/lol/league/v4/entries/by-summoner/${summonerId}?api_key=${apiKey}`;
    try {
        const response = await axios.get(url);
        logApiCall(commandOrigin, 'getLeagueEntries', { server, summonerId }, response.data, response.data);
        return response.data;
    } catch (err) {
        logApiCallError(commandOrigin, 'getLeagueEntries', { server, summonerId }, err);
        logApiCall(commandOrigin, 'getLeagueEntries', { server, summonerId }, err, null);
        return undefined;
    }
}

/**
 * Fetch all DDragon versions.
 * @param {string} [commandOrigin="unknown"] - The origin of the command.
 * @returns {Promise<Array<string>|undefined>} The list of DDragon versions or undefined if an error occurs.
 */
async function getDDragonVersions(commandOrigin = "unknown") {
    const url = 'https://ddragon.leagueoflegends.com/api/versions.json';
    try {
        const response = await axios.get(url);
        logApiCall(commandOrigin, 'getDDragonVersions', {}, response.data, response.data);
        return response.data;
    } catch (err) {
        logApiCallError(commandOrigin, 'getDDragonVersions', {}, err);
        logApiCall(commandOrigin, 'getDDragonVersions', {}, err, null);
        return undefined;
    }
}

/**
 * Fetch the latest DDragon version.
 * @param {string} [commandOrigin="unknown"] - The origin of the command.
 * @returns {Promise<string|undefined>} The latest DDragon version or undefined if an error occurs.
 */
async function getDDragonLatestVersion(commandOrigin = "unknown") {
    try {
    const versions = await getDDragonVersions(commandOrigin);
    return versions[0];
    } catch (err) {
        logApiCallError(commandOrigin, 'getDDragonLatestVersion', {}, err);
        logApiCall(commandOrigin, 'getDDragonLatestVersion', {}, err, null);
        return undefined;
    }
}

/**
 * Fetch ranked queues by elo and division.
 * @param {string} server - The server of the account.
 * @param {string} elo - The elo of the ranked queue.
 * @param {string} division - The division of the ranked queue.
 * @param {string} [commandOrigin="unknown"] - The origin of the command.
 * @returns {Promise<Object|undefined>} The ranked queues or undefined if an error occurs.
 */
async function getRankedQueues(server, elo, division, commandOrigin = "unknown") {
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
        logApiCall(commandOrigin, 'getRankedQueues', { server, elo, division }, response.data, response.data);
        return response.data;
    } catch (err) {
        logApiCallError(commandOrigin, 'getRankedQueues', { server, elo, division }, err);
        logApiCall(commandOrigin, 'getRankedQueues', { server, elo, division }, err, null);
        return undefined;
    }
}

/**
 * Fetch PUUID by summoner ID.
 * @param {string} server - The server of the account.
 * @param {string} summonerId - The summoner ID of the account.
 * @param {string} [commandOrigin="unknown"] - The origin of the command.
 * @returns {Promise<string|undefined>} The PUUID or undefined if an error occurs.
 */
async function getPUUIDBySummonerId(server, summonerId, commandOrigin = "unknown") {
    const url = `https://${server}.${process.env.RIOT_BASE_URL}/lol/summoner/v4/summoners/${encodeURIComponent(summonerId)}?api_key=${apiKey}`;
    console.log(`Fetching PUUID from URL: ${url}`);
    try {
        const response = await axios.get(url);
        logApiCall(commandOrigin, 'getPUUIDBySummonerId', { server, summonerId }, response.data.puuid, response.data.puuid);
        return response.data.puuid;
    } catch (err) {
        logApiCallError(commandOrigin, 'getPUUIDBySummonerId', { server, summonerId }, err);
        logApiCall(commandOrigin, 'getPUUIDBySummonerId', { server, summonerId }, err, null);
        return undefined;
    }
}

/**
 * Fetch account information by PUUID.
 * @param {string} region - The region of the account.
 * @param {string} PUUID - The PUUID of the account.
 * @param {string} [commandOrigin="unknown"] - The origin of the command.
 * @returns {Promise<string|undefined>} The game name or undefined if an error occurs.
 */
async function getAccountByPUUID(region, PUUID, commandOrigin = "unknown") {
    const url = `https://${region}.${process.env.RIOT_BASE_URL}/riot/account/v1/accounts/by-puuid/${encodeURIComponent(PUUID)}?api_key=${apiKey}`;
    console.log(`Fetching account info from URL: ${url}`);
    try {
        const response = await axios.get(url);
        const reducedResponse = response.data.gameName;
        logApiCall(commandOrigin, 'getAccountByPUUID', { region, PUUID }, response.data, reducedResponse);
        return reducedResponse;
    } catch (err) {
        logApiCallError(commandOrigin, 'getAccountByPUUID', { region, PUUID }, err);
        logApiCall(commandOrigin, 'getAccountByPUUID', { region, PUUID }, err, null);
        return undefined;
    }
}

async function getMasteriesBySummonerId(region, summonerId, commandOrigin = "unknown") {
    const url = `https://${region}.${process.env.RIOT_BASE_URL}/lol/champion-mastery/v4/champion-masteries/by-summoner/${encodeURIComponent(summonerId)}?api_key=${apiKey}`;
    try {
        const response = await axios.get(url);
        logApiCall(commandOrigin, 'getMasteriesBySummonerId', { region, summonerId }, response.data, response.data);
        return response.data;
    } catch (err) {
        logApiCallError(commandOrigin, 'getMasteriesBySummonerId', { region, summonerId }, err);
        logApiCall(commandOrigin, 'getMasteriesBySummonerId', { region, summonerId }, err, null);
        return undefined;
    }
}

// get all champions id, name, and key
async function getChampions(commandOrigin = "unknown") {
    const url = `http://ddragon.leagueoflegends.com/cdn/${await getDDragonLatestVersion(commandOrigin)}/data/en_US/champion.json`;
    try {
        const response = await axios.get(url);
        const championsData = response.data.data;
        const simplifiedChampions = Object.values(championsData).map(champion => ({
            id: champion.id,
            name: champion.name,
            key: champion.key
        }));

        logApiCall(commandOrigin, 'getChampions', {}, simplifiedChampions, simplifiedChampions);
        return simplifiedChampions;
    } catch (err) {
        logApiCallError(commandOrigin, 'getChampions', {}, err);
        logApiCall(commandOrigin, 'getChampions', {}, err, null);
        return undefined;
    }
}

async function getAllChampionsSkins(commandOrigin = "unknown") {
    const champions = await getChampions(commandOrigin);
    if (!champions) return undefined;

    const allSkins = {};
    for (const champion of champions) {
        const skins = await getChampionSkins(champion.id, commandOrigin);
        if (skins) {
            allSkins[champion.name] = skins;
        }
    }
    return allSkins;
}


// get all skins from a champion
async function getChampionSkins(championId, commandOrigin = "unknown") {
    const url = `http://ddragon.leagueoflegends.com/cdn/${await getDDragonLatestVersion(commandOrigin)}/data/en_US/champion/${championId}.json`;
    try {
        const response = await axios.get(url);
        logApiCall(commandOrigin, 'getChampionSkins', { championId }, response.data.data[championId].skins, response.data.data[championId].skins);
        return response.data.data[championId].skins;
    } catch (err) {
        logApiCallError(commandOrigin, 'getChampionSkins', { championId }, err);
        logApiCall(commandOrigin, 'getChampionSkins', { championId }, err, null);
        return undefined;
    }
}


async function getSkinArt(championId, skinNum, commandOrigin = "unknown") {
    const url = `https://ddragon.leagueoflegends.com/cdn/img/champion/centered/${championId}_${skinNum}.jpg`;
    try {
        const response = await axios.get(url);
        return response.data;
    } catch (err) {
        logApiCallError(commandOrigin, 'getSkinArt', { championId, skinNum }, err);
        logApiCall(commandOrigin, 'getSkinArt', { championId, skinNum }, err, null);
        return undefined;
    }
}

async function getSkinRarity(skinId, commandOrigin = "unknown") {
    const url = `https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/skins.json`;
    try {
        const response = await axios.get(url);
        const skinData = response.data[skinId];
        const rarity = skinData ? skinData.rarity : undefined;

        
        logApiCall(commandOrigin, 'getSkinRarity', { skinId }, skinData, rarity);
        return rarity;
    } catch (err) {
        logApiCallError(commandOrigin, 'getSkinRarity', { skinId }, err);
        logApiCall(commandOrigin, 'getSkinRarity', { skinId }, err, null);
        return undefined;
    }
}

async function getSkinDetails(skinId, commandOrigin = "unknown") {
    const url = `https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/skins.json`;
    try {
        const response = await axios.get(url);
        const skinData = response.data[skinId];
        if (!skinData) {
            return undefined;
        }
        const skinDetails = {
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
            uncenteredSplashPath: skinData.uncenteredSplashPath
        };
        logApiCall(commandOrigin, 'getSkinDetails', { skinId }, skinDetails);
        return skinDetails;
    } catch (err) {
        logApiCallError(commandOrigin, 'getSkinDetails', { skinId }, err);
        logApiCall(commandOrigin, 'getSkinDetails', { skinId }, err, null);
        return undefined;
    }
}

async function getChampionsId(commandOrigin = "unknown") {
    const url = 'https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/championperkstylemap.json'
    try {
        const response = await axios.get(url);
        const champions = Object.values(response.data).map(champion => ({
            name: champion.championName,
            id: champion.championId,
        }));
        logApiCall(commandOrigin, 'getChampionsId', {}, champions, champions);
        return champions;
    } catch (err) {
        console.log(error('Error fetching champions ID: ' + err));
        logApiCallError(commandOrigin, 'getChampionsId', {}, err);
        return undefined;
    }
}


/**
 * Fetch champions data from the API.
 * @param {string} [commandOrigin="unknown"] - The origin of the command.
 * @returns {Promise<Array<Object>|undefined>} The champions data or undefined if an error occurs.
 */
async function fetchChampionsData(commandOrigin = "unknown") {
    const version = await getDDragonLatestVersion(commandOrigin);
    const patch = version.slice(0, version.lastIndexOf('.'));

    const url = `https://raw.communitydragon.org/${patch}/plugins/rcp-be-lol-game-data/global/default/v1/champion-summary.json`;
    try {
        const response = await axios.get(url);
        const championsData = Object.values(response.data).map(champion => ({
            championId: champion.alias,
            championName: champion.name,
            updatePatch: patch,
        }));

        logApiCall(commandOrigin, 'fetchChampionsData', {}, championsData, championsData);
        return championsData;
    } catch (err) {
        logApiCallError(commandOrigin, 'fetchChampionsData', {}, err);
        return undefined;
    }
}

/**
 * Fetch skinlines data from the API.
 * @param {string} [commandOrigin="unknown"] - The origin of the command.
 * @returns {Promise<Array<Object>|undefined>} The skinlines data or undefined if an error occurs.
 */
async function fetchSkinlinesData(commandOrigin = "unknown") {
    const version = await getDDragonLatestVersion(commandOrigin);
    const patch = version.slice(0, version.lastIndexOf('.'));

    const url = `https://raw.communitydragon.org/${patch}/plugins/rcp-be-lol-game-data/global/default/v1/skinlines.json`;
    try {
        const response = await axios.get(url);
        const skinlinesData = response.data.map(skinline => ({
            id: skinline.id,
            name: skinline.name,
            description: skinline.description,
            updatePatch: patch,
        }));
        logApiCall(commandOrigin, 'fetchSkinlinesData', {}, skinlinesData, skinlinesData);
        return skinlinesData;
    } catch (err) {
        logApiCallError(commandOrigin, 'fetchSkinlinesData', {}, err);
        return undefined;
    }
}

/**
 * Fetch universes data from the API.
 * @param {string} [commandOrigin="unknown"] - The origin of the command.
 * @returns {Promise<Array<Object>|undefined>} The universes data or undefined if an error occurs.
 */
async function fetchUniversesData(commandOrigin = "unknown") {
    const version = await getDDragonLatestVersion(commandOrigin);
    const patch = version.slice(0, version.lastIndexOf('.'));

    const url = `https://raw.communitydragon.org/${patch}/plugins/rcp-be-lol-game-data/global/default/v1/universes.json`;
    try {
        const response = await axios.get(url);
        const universesData = response.data.map(universe => ({
            id: universe.id,
            name: universe.name,
            description: universe.description,
            skinsSets: universe.skinSets,
            updatePatch: patch,
        }));
        logApiCall(commandOrigin, 'fetchUniversesData', {}, universesData, universesData);
        return universesData;
    } catch (err) {
        logApiCallError(commandOrigin, 'fetchUniversesData', {}, err);
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
    fetchUniversesData
};