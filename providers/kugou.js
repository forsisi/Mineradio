'use strict';

const crypto = require('crypto');

const KUGOU_MOBILE_HEADERS = {
  Referer: 'http://m.kugou.com/',
  'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148',
};

const KUGOU_PC_HEADERS = {
  Referer: 'https://www.kugou.com/',
  Accept: 'application/json, text/plain, */*',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36',
};

const KUGOU_ANDROID_HEADERS = {
  'User-Agent': 'Android15-1070-11083-46-0-DiscoveryDRADProtocol-wifi',
  'Content-Type': 'application/json',
  'x-router': 'cloudlist.service.kugou.com',
  'kg-rc': '1',
  'kg-thash': '5d816a0',
  'kg-rec': '1',
  'kg-rf': 'B9EDA08A64250DEFFBCADDEE00F8F25F',
};

const KUGOU_SIGN_KEY = 'NVPh5oo715z5DIWAeQlhMDsWXXQV4hwt';
const KUGOU_LITE_SIGN = 'LnT6xpN3khm36zse0QzvmgTZ3waWdRSA';
const KUGOU_LITE_APP_ID = '3116';
const KUGOU_LITE_VER = '11440';

function parseCookieString(cookieText) {
  const out = {};
  String(cookieText || '').split(';').forEach(part => {
    const raw = String(part || '').trim();
    if (!raw) return;
    const idx = raw.indexOf('=');
    if (idx <= 0) return;
    const key = raw.slice(0, idx).trim();
    const value = raw.slice(idx + 1).trim();
    if (key) out[key] = value;
  });
  return out;
}

function decodeUnicodeEscapes(text) {
  return String(text || '').replace(/%u([0-9a-f]{4})/gi, (_m, hex) => {
    return String.fromCharCode(parseInt(hex, 16));
  });
}

function safeDecodeURIComponent(text) {
  const raw = decodeUnicodeEscapes(text);
  try { return decodeURIComponent(raw.replace(/\+/g, '%20')); }
  catch (e) { return raw; }
}

function parseEmbeddedKugouFields(value) {
  const out = {};
  const raw = String(value || '').trim();
  if (!raw) return out;
  [raw, safeDecodeURIComponent(raw)].forEach(text => {
    String(text || '').split(/[&|]/).forEach(part => {
      const idx = part.indexOf('=');
      if (idx <= 0) return;
      const key = part.slice(0, idx).trim();
      const val = part.slice(idx + 1).trim();
      if (key && val && out[key] == null) out[key] = val;
    });
  });
  return out;
}

function expandKugouCookieFields(obj) {
  obj = obj || {};
  Object.keys(obj).forEach(key => {
    const embedded = parseEmbeddedKugouFields(obj[key]);
    Object.keys(embedded).forEach(innerKey => {
      if (obj[innerKey] == null || obj[innerKey] === '') obj[innerKey] = embedded[innerKey];
    });
  });
  return obj;
}

function serializeCookieObject(obj) {
  const priority = [
    'userid', 'token', 'KUGOU_API_MID', 'dfid', 'KugooID', 't', 'KuGoo',
    'NickName', 'UserName', 'username', 'nickname', 'Pic', 'pic',
    'kg_mid', 'mid', 'uuid', 'kg_dfid', 'vip_token', 'viptoken',
  ];
  const seen = new Set();
  const pairs = [];
  function push(key) {
    if (!key || seen.has(key) || obj[key] == null || String(obj[key]) === '') return;
    seen.add(key);
    pairs.push(key + '=' + String(obj[key]));
  }
  priority.forEach(push);
  Object.keys(obj || {}).forEach(push);
  return pairs.join('; ');
}

function decodeCookieValue(value) {
  return safeDecodeURIComponent(value).trim();
}

function normalizeNumericString(value) {
  const digits = String(value || '').replace(/\D/g, '');
  return digits.replace(/^0+/, '') || digits;
}

function firstNonEmpty() {
  for (let i = 0; i < arguments.length; i++) {
    const value = arguments[i];
    if (value == null) continue;
    const text = String(value).trim();
    if (text) return text;
  }
  return '';
}

function cleanKugouToken(value) {
  const text = String(value || '').trim();
  if (!text) return '';
  return text.split(/[&|]/)[0].trim();
}

function cleanDisplayName(value) {
  let text = decodeCookieValue(value);
  const embedded = parseEmbeddedKugouFields(text);
  text = firstNonEmpty(embedded.NickName, embedded.nickname, embedded.UserName, embedded.username, text);
  text = decodeCookieValue(text).trim();
  if (!text || /[=&]/.test(text) || text.length > 42) return '';
  return text;
}

function coverWithSize(value, size) {
  const text = String(value || '').trim();
  if (!text) return '';
  return text.replace(/\{size\}/g, String(size || 240));
}

function normalizeKugouImageUrl(value, size) {
  let text = coverWithSize(decodeCookieValue(value), size || 240).trim();
  if (!text) return '';
  if (/^\/\//.test(text)) text = 'https:' + text;
  if (/^http:\/\//i.test(text)) text = text.replace(/^http:\/\//i, 'https://');
  return text;
}

function normalizeKugouCookieInput(cookieText) {
  const obj = expandKugouCookieFields(parseCookieString(cookieText));
  if (!obj.userid && obj.KugooID) obj.userid = normalizeNumericString(obj.KugooID);
  if (obj.userid) obj.userid = normalizeNumericString(obj.userid);
  if (!obj.token && obj.t) obj.token = obj.t;
  if (obj.token) obj.token = cleanKugouToken(obj.token);
  if (obj.t) obj.t = cleanKugouToken(obj.t);
  if (!obj.KUGOU_API_MID) obj.KUGOU_API_MID = firstNonEmpty(obj.kg_mid, obj.mid);
  if (!obj.mid && obj.KUGOU_API_MID) obj.mid = obj.KUGOU_API_MID;
  if (!obj.kg_mid && obj.KUGOU_API_MID) obj.kg_mid = obj.KUGOU_API_MID;
  if (!obj.dfid) obj.dfid = firstNonEmpty(obj.kg_dfid, obj.KG_DFID);
  return serializeCookieObject(obj);
}

function kugouCookieUserId(obj) {
  obj = obj || {};
  return normalizeNumericString(firstNonEmpty(obj.userid, obj.KugooID));
}

function kugouCookieToken(obj) {
  obj = obj || {};
  return cleanKugouToken(firstNonEmpty(obj.token, obj.t));
}

function kugouCookieNickname(obj, userId) {
  obj = obj || {};
  return cleanDisplayName(firstNonEmpty(obj.NickName, obj.nickname, obj.UserName, obj.username, obj.KuGoo)) ||
    (userId ? ('酷狗 ' + userId) : '酷狗音乐');
}

function kugouCookieAvatar(obj) {
  obj = obj || {};
  return normalizeKugouImageUrl(firstNonEmpty(obj.Pic, obj.pic, obj.avatar, obj.avatarUrl, obj.user_pic, obj.user_avatar), 240);
}

function kugouLoginInfoFromCookie(cookieText) {
  const normalized = normalizeKugouCookieInput(cookieText);
  const obj = parseCookieString(normalized);
  const userId = kugouCookieUserId(obj);
  const token = kugouCookieToken(obj);
  const mid = firstNonEmpty(obj.KUGOU_API_MID, obj.kg_mid, obj.mid);
  return {
    provider: 'kugou',
    loggedIn: !!userId,
    userId,
    nickname: kugouCookieNickname(obj, userId),
    avatar: kugouCookieAvatar(obj),
    hasCookie: !!String(cookieText || '').trim(),
    tokenReady: !!token,
    appCookieReady: !!(userId && token && mid),
    profileSource: (obj.NickName || obj.UserName || obj.Pic || obj.pic) ? 'cookie' : 'fallback',
  };
}

function buildKugouUserPlaylistsUrl(userId, page, limit) {
  const params = new URLSearchParams();
  params.set('json', 'true');
  params.set('page', String(Math.max(1, Number(page) || 1)));
  params.set('pagesize', String(Math.max(1, Math.min(100, Number(limit) || 30))));
  return 'http://m.kugou.com/plist/index/' + encodeURIComponent(String(userId || '').trim()) + '?' + params.toString();
}

function buildKugouPlaylistTracksUrl(id) {
  return 'http://mobilecdn.kugou.com/api/v3/special/song?specialid=' +
    encodeURIComponent(String(id || '').trim()) +
    '&page=1&pagesize=300&version=9108&area_code=1';
}

function md5(text) {
  return crypto.createHash('md5').update(String(text || '')).digest('hex');
}

function sortedParamText(params) {
  return Object.keys(params || {})
    .sort()
    .map(key => key + '=' + String(params[key]))
    .join('');
}

function buildQuery(params) {
  const query = new URLSearchParams();
  Object.keys(params || {}).forEach(key => query.set(key, String(params[key])));
  return query.toString();
}

function signKugouSonginfoParams(params) {
  return md5(KUGOU_SIGN_KEY + sortedParamText(params) + KUGOU_SIGN_KEY);
}

function signKugouAndroidParams(params, data) {
  return md5(KUGOU_LITE_SIGN + sortedParamText(params) + String(data || '') + KUGOU_LITE_SIGN);
}

function buildKugouSonginfoUrl(params) {
  const next = Object.assign({}, params || {});
  next.signature = signKugouSonginfoParams(params || {});
  return 'https://wwwapi.kugou.com/play/songinfo?' + buildQuery(next);
}

function buildKugouAndroidUrl(baseUrl, params, data) {
  const next = Object.assign({}, params || {});
  next.signature = signKugouAndroidParams(params || {}, data || '');
  return baseUrl + '?' + buildQuery(next);
}

function kugouAppCookieReady(cookieText) {
  const obj = parseCookieString(normalizeKugouCookieInput(cookieText));
  return !!(kugouCookieUserId(obj) && kugouCookieToken(obj) && firstNonEmpty(obj.KUGOU_API_MID, obj.mid, obj.kg_mid));
}

function buildKugouGatewayUserPlaylistsRequest(cookieText, page, limit) {
  const obj = parseCookieString(normalizeKugouCookieInput(cookieText));
  const userId = kugouCookieUserId(obj);
  const token = kugouCookieToken(obj);
  const mid = firstNonEmpty(obj.KUGOU_API_MID, obj.mid, obj.kg_mid, '-');
  const dfid = firstNonEmpty(obj.dfid, obj.kg_dfid, '-');
  const clienttime = String(Math.floor(Date.now() / 1000));
  const body = JSON.stringify({
    userid: userId,
    token,
    total_ver: 979,
    type: 2,
    page: Math.max(1, Number(page) || 1),
    pagesize: Math.max(1, Math.min(100, Number(limit) || 30)),
  });
  const params = {
    dfid,
    mid,
    uuid: '-',
    appid: KUGOU_LITE_APP_ID,
    clientver: KUGOU_LITE_VER,
    clienttime,
    token,
    userid: userId,
    plat: '1',
  };
  return {
    url: buildKugouAndroidUrl('https://gateway.kugou.com/v7/get_all_list', params, body),
    body,
    headers: Object.assign({}, KUGOU_ANDROID_HEADERS, {
      'x-router': 'cloudlist.service.kugou.com',
      dfid,
      clienttime,
      mid,
    }),
  };
}

function parseKugouCloudPlaylistId(id) {
  const match = /^cloudlist:(.+)$/i.exec(String(id || '').trim());
  return match ? match[1].trim() : '';
}

function buildKugouCloudlistTracksRequest(cookieText, id) {
  const listId = parseKugouCloudPlaylistId(id) || String(id || '').trim();
  const obj = parseCookieString(normalizeKugouCookieInput(cookieText));
  const userId = kugouCookieUserId(obj);
  const token = kugouCookieToken(obj);
  const mid = firstNonEmpty(obj.KUGOU_API_MID, obj.mid, obj.kg_mid);
  if (!listId || !userId || !token || !mid) {
    return null;
  }
  const dfid = firstNonEmpty(obj.dfid, obj.kg_dfid, '-');
  const clienttime = String(Math.floor(Date.now() / 1000));
  const body = JSON.stringify({
    listid: listId,
    userid: userId,
    area_code: 1,
    show_relate_goods: 1,
    pagesize: 300,
    allplatform: 1,
    show_cover: 1,
    type: 0,
    token,
    page: 1,
  });
  const params = {
    dfid,
    mid,
    uuid: '-',
    appid: KUGOU_LITE_APP_ID,
    clientver: KUGOU_LITE_VER,
    clienttime,
    token,
    userid: userId,
  };
  return {
    url: buildKugouAndroidUrl('https://gateway.kugou.com/v4/get_list_all_file', params, body),
    body,
    headers: Object.assign({}, KUGOU_ANDROID_HEADERS, {
      'x-router': 'cloudlist.service.kugou.com',
      dfid,
      clienttime,
      mid,
    }),
  };
}

function buildKugouSongUrlRequests(cookieText, hash) {
  const obj = parseCookieString(normalizeKugouCookieInput(cookieText));
  const token = firstNonEmpty(obj.t, obj.token);
  const userId = firstNonEmpty(obj.KugooID, obj.userid);
  if (!token || !userId) return [];
  const baseParams = {
    srcappid: '2919',
    clientver: '20000',
    clienttime: String(Date.now()),
    mid: firstNonEmpty(obj.mid, obj.kg_mid, obj.KUGOU_API_MID),
    uuid: firstNonEmpty(obj.uuid, obj.mid, obj.kg_mid, obj.KUGOU_API_MID),
    dfid: firstNonEmpty(obj.dfid, obj.kg_dfid),
    appid: '1014',
    platid: '4',
    token,
    userid: userId,
  };
  const step1 = Object.assign({}, baseParams, { hash: String(hash || '').trim().toLowerCase() });
  return [{ kind: 'songinfo-step1', url: buildKugouSonginfoUrl(step1), baseParams }];
}

function buildKugouSongUrlStep2(baseParams, encodeAlbumAudioId) {
  const params = Object.assign({}, baseParams || {}, { encode_album_audio_id: encodeAlbumAudioId });
  return buildKugouSonginfoUrl(params);
}

function parseJsonBody(body, errorPrefix) {
  if (body && typeof body === 'object' && !Buffer.isBuffer(body)) return body;
  try { return JSON.parse(Buffer.isBuffer(body) ? body.toString('utf8') : String(body || '{}')); }
  catch (e) { throw new Error((errorPrefix || 'kugou json') + ': ' + e.message); }
}

function kugouIntFromValue(value) {
  const text = normalizeNumericString(value);
  const n = Number(text);
  return Number.isFinite(n) ? n : 0;
}

function mapKugouPlaylistCommon(item, userId, opts) {
  item = item || {};
  opts = opts || {};
  const id = String(opts.id || item.specialid || item.SpecialID || item.global_specialid || '').trim();
  const name = firstNonEmpty(item.specialname, item.name, item.SpecialName);
  if (!id || !name) return null;
  const creatorId = normalizeNumericString(firstNonEmpty(item.list_create_userid, item.ListCreateUserID));
  const creator = firstNonEmpty(item.list_create_username, item.username, item.nickname, item.NickName, userId);
  const trackCount = kugouIntFromValue(firstNonEmpty(item.songcount, item.count, item.SongCount, item.Count));
  return {
    provider: 'kugou',
    source: 'kugou',
    id,
    name,
    cover: coverWithSize(firstNonEmpty(item.imgurl, item.pic, item.ImgURL), 240),
    trackCount,
    playCount: kugouIntFromValue(firstNonEmpty(item.playcount, item.PlayCount)),
    creator,
    subscribed: !!(creatorId && userId && creatorId !== normalizeNumericString(userId)),
    specialType: 0,
    extra: opts.extra || {},
  };
}

function parseKugouUserPlaylists(body, userId) {
  const resp = parseJsonBody(body, 'kugou user playlist json parse error');
  if (resp.status != null && Number(resp.status) !== 0 && Number(resp.status) !== 1) {
    throw new Error('kugou user playlist api error: status=' + resp.status + ' errcode=' + (resp.errcode || 0) + ' error=' + (resp.error || ''));
  }
  const playlists = [];
  const seen = new Set();
  function push(item, opts) {
    const pl = mapKugouPlaylistCommon(item, userId, opts);
    if (!pl || seen.has(pl.id)) return;
    seen.add(pl.id);
    playlists.push(pl);
  }

  const plistInfo = resp.plist && resp.plist.list && Array.isArray(resp.plist.list.info) ? resp.plist.list.info : [];
  plistInfo.forEach(item => {
    push(item, { id: item.specialid, extra: { user_id: String(userId || '') } });
  });

  const dataInfo = resp.data && Array.isArray(resp.data.info) ? resp.data.info : [];
  dataInfo.forEach(item => {
    const listId = normalizeNumericString(item.listid);
    if (listId) {
      push(item, {
        id: 'cloudlist:' + listId,
        extra: {
          user_id: String(userId || ''),
          cloud_listid: listId,
          global_collection_id: String(item.global_collection_id || ''),
        },
      });
      return;
    }
    push(item, { id: item.specialid || item.global_specialid, extra: { user_id: String(userId || '') } });
  });

  const dataList = resp.data && Array.isArray(resp.data.list) ? resp.data.list : [];
  dataList.forEach(item => push(item, { id: item.specialid, extra: { user_id: String(userId || '') } }));
  return playlists;
}

function isValidKugouHash(value) {
  return /^[0-9a-f]{32}$/i.test(String(value || '').trim());
}

function splitKugouFileName(fileName) {
  const text = String(fileName || '').trim();
  const parts = text.split(' - ');
  if (parts.length >= 2) {
    return { artist: parts[0].trim(), name: parts.slice(1).join(' - ').trim() };
  }
  return { artist: '', name: text };
}

function joinKugouSingerInfo(value) {
  if (!Array.isArray(value)) return '';
  return value.map(item => item && item.name ? String(item.name).trim() : '').filter(Boolean).join(' / ');
}

function mapKugouTrack(item) {
  item = item || {};
  const trans = item.trans_param || item.transParam || {};
  const hash = firstNonEmpty(
    item.hash, item.SQFileHash, item.HQFileHash, item.ResFileHash,
    trans.ogg_320_hash, item.FileHash, trans.ogg_128_hash
  );
  if (!isValidKugouHash(hash)) return null;
  const albumInfo = item.albuminfo || item.albumInfo || {};
  const fromName = splitKugouFileName(firstNonEmpty(item.filename, item.FileName, item.name));
  const name = firstNonEmpty(item.songname, item.SongName, item.name, fromName.name);
  const artist = firstNonEmpty(item.singername, item.SingerName, joinKugouSingerInfo(item.singerinfo), fromName.artist);
  const durationRaw = Number(firstNonEmpty(item.timelen, item.timelength, item.duration, item.Duration)) || 0;
  const durationMs = durationRaw > 1000 ? durationRaw : durationRaw * 1000;
  const albumId = firstNonEmpty(item.AlbumID, item.album_id, albumInfo.id);
  const audioId = firstNonEmpty(item.audio_id, item.Audioid, item.audioid);
  const albumAudioId = firstNonEmpty(item.album_audio_id, item.MixSongID, item.ID, audioId);
  return {
    provider: 'kugou',
    source: 'kugou',
    type: 'kugou',
    id: hash,
    kgHash: hash,
    hash,
    name,
    artist,
    artists: artist ? artist.split(/\s*\/\s*|\s*,\s*|、|&/).filter(Boolean).map(name => ({ name })) : [],
    album: firstNonEmpty(item.album_name, item.AlbumName, albumInfo.name, item.remark),
    albumId,
    cover: coverWithSize(firstNonEmpty(item.cover, trans.union_cover, trans.unionCover), 240),
    duration: durationMs,
    fee: Number(item.Privilege || item.privilege || 0) > 0 ? 1 : 0,
    playable: true,
    extra: {
      hash,
      album_audio_id: String(albumAudioId || ''),
      audio_id: String(audioId || ''),
      album_id: String(albumId || ''),
      privilege: String(firstNonEmpty(item.Privilege, item.privilege)),
    },
  };
}

function parseKugouPlaylistTracks(body, id) {
  const resp = parseJsonBody(body, 'kugou playlist detail json error');
  const rawTracks = resp && resp.data && Array.isArray(resp.data.info) ? resp.data.info : [];
  const tracks = rawTracks.map(mapKugouTrack).filter(Boolean);
  const playlist = {
    provider: 'kugou',
    source: 'kugou',
    id: String(id || '').trim(),
    name: '',
    cover: tracks[0] && tracks[0].cover || '',
    trackCount: tracks.length,
  };
  return { playlist, tracks };
}

function parseKugouCloudlistTracks(body, id) {
  const resp = parseJsonBody(body, 'kugou cloudlist detail json error');
  if ((resp.status != null && Number(resp.status) !== 1) || Number(resp.error_code || 0) !== 0 || Number(resp.errcode || 0) !== 0) {
    throw new Error('kugou cloudlist detail api error: status=' + (resp.status || 0) + ' error_code=' + (resp.error_code || 0) + ' errcode=' + (resp.errcode || 0) + ' error=' + (resp.error || ''));
  }
  const rawTracks = resp && resp.data && Array.isArray(resp.data.info) ? resp.data.info : [];
  const tracks = rawTracks.map(mapKugouTrack).filter(Boolean);
  const playlist = {
    provider: 'kugou',
    source: 'kugou',
    id: String(id || '').trim(),
    name: '',
    cover: tracks[0] && tracks[0].cover || '',
    trackCount: tracks.length,
  };
  return { playlist, tracks };
}

function isKugouCloudPlaylistId(id) {
  return /^cloudlist:/i.test(String(id || '').trim());
}

module.exports = {
  KUGOU_MOBILE_HEADERS,
  KUGOU_PC_HEADERS,
  KUGOU_ANDROID_HEADERS,
  parseCookieString,
  serializeCookieObject,
  normalizeKugouCookieInput,
  kugouCookieUserId,
  kugouCookieToken,
  kugouLoginInfoFromCookie,
  buildKugouUserPlaylistsUrl,
  buildKugouPlaylistTracksUrl,
  buildKugouGatewayUserPlaylistsRequest,
  buildKugouCloudlistTracksRequest,
  buildKugouSongUrlRequests,
  buildKugouSongUrlStep2,
  kugouAppCookieReady,
  parseKugouUserPlaylists,
  parseKugouPlaylistTracks,
  parseKugouCloudlistTracks,
  isKugouCloudPlaylistId,
};
