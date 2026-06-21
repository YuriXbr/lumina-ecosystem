// Example Get Query
// https://api.rule34.xxx/index.php?page=dapi&s=post&q=index&api_key=3fcb4518765f216f429adb11dd6617f56b0dd2ab162cc3e18e40a4a4bfbd56c9226c5778038f6ba3e27d87ddbc58f16b0af5ea4efa3ba734586a46c8bad3437d&user_id=3698208&json=1
// example response:
// [
//     {
//         "preview_url": "https://api-cdn.rule34.xxx/thumbnails/1808/thumbnail_dd5cd24a9b0a0b440210eb961593b6a1.jpg",
//         "sample_url": "https://api-cdn.rule34.xxx/samples/1808/sample_dd5cd24a9b0a0b440210eb961593b6a1.jpg",
//         "file_url": "https://api-cdn.rule34.xxx/images/1808/dd5cd24a9b0a0b440210eb961593b6a1.jpeg",
//         "directory": 1808,
//         "hash": "dd5cd24a9b0a0b440210eb961593b6a1",
//         "width": 3040,
//         "height": 2560,
//         "id": 15390267,
//         "image": "dd5cd24a9b0a0b440210eb961593b6a1.jpeg",
//         "change": 1762424209,
//         "owner": "spasibo15",
//         "parent_id": 0,
//         "rating": "explicit",
//         "sample": true,
//         "sample_height": 716,
//         "sample_width": 850,
//         "score": 1,
//         "tags": "2boys accurate_art_style ai_generated anal anus artist_name ass black_hair black_pubic_hair black_thighhighs blue_eyes blush boy_on_top clitoris double_penetration erection female female_pubic_hair folded group_sex hair_ornament hairclip long_hair lying mai_sakurajima male_pubic_hair mmf_threesome multiple_boys nude on_back patreon_logo patreon_username penis pubic_hair purple_eyes pussy rabbit_hair_ornament sakurajima_mai seishun_buta_yarou_wa_bunny_girl_senpai_no_yume_wo_minai sex simple_background solo_focus spasibo15 spread_legs straight testicles thighhighs threesome uncensored vaginal_penetration veins veiny_penis watermark web_address",
//         "source": "https://www.patreon.com/c/SpasiboAI",
//         "status": "active",
//         "has_notes": false,
//         "comment_count": 0
//     },
//
// Url for API access: https://api.rule34.xxx/index.php?page=dapi&s=post&q=index

// limit How many posts you want to retrieve. There is a hard limit of 1000 posts per request.
// pid The page number.
// tags The tags to search for. Any tag combination that works on the web site will work here. This includes all the meta-tags. See cheatsheet for more information.
// cid Change ID of the post. This is in Unix time so there are likely others with the same value if updated at the same time.
// id The post id.
// json Set to 1 for JSON formatted response.

// Deleted Images
// Url for API access: https://api.rule34.xxx/index.php?page=dapi&s=post&q=index&deleted=show

// last_id A numerical value. Will return everything above this number.

// Comments
// List
// Url for API access: https://api.rule34.xxx/index.php?page=dapi&s=comment&q=index

// post_id The id number of the comment to retrieve.
// Tags
// List
// Url for API access: https://api.rule34.xxx/index.php?page=dapi&s=tag&q=index

// id The tag's id in the database. This is useful to grab a specific tag if you already know this value.
// limit How many tags you want to retrieve. There is a default limit of 100 per request.
// Autocomplete
// List
// Url for API access: https://api.rule34.xxx/autocomplete.php?q=

// q= Enter any letter or incomplete tag. Not an official endpoint, but some people seem to rip the one from the main site. Use this one instead.

const RULE34_API_URL = 'https://api.rule34.xxx/index.php';

const axios = require('axios');

function buildQueryParams(params) {
    return Object.entries(params)
        .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
        .join('&');
}


async function fetchRule34Posts({ apiKey, userId, tags = '', limit = 10, pid = 0}) {
    const url = 'https://api.rule34.xxx/index.php';
    const params = {
        page: 'dapi',
        s: 'post',
        q: 'index',
        api_key: apiKey,
        user_id: userId,
        json: 1,
        limit: (limit > 1000) ? 1000 : limit,
        pid: pid
    };
    if (tags) {
        params.tags = tags;
    }
    const queryString = buildQueryParams(params);
    const response = await axios.get(`${RULE34_API_URL}?${queryString}`);
    
    return response.data;
}

module.exports = {
    fetchRule34Posts
};