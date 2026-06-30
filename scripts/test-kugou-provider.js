const assert = require('assert');
const kugou = require('../providers/kugou');

function testCookieNormalization() {
  const normalized = kugou.normalizeKugouCookieInput('KugooID=00123; t=tok%201; KuGoo=%E9%85%B7%E7%8B%97%E7%94%A8%E6%88%B7; kg_mid=mid-a; kg_dfid=dfid-b');
  const obj = kugou.parseCookieString(normalized);
  assert.strictEqual(obj.userid, '123');
  assert.strictEqual(obj.token, 'tok%201');
  assert.strictEqual(obj.KUGOU_API_MID, 'mid-a');
  assert.strictEqual(obj.dfid, 'dfid-b');

  const info = kugou.kugouLoginInfoFromCookie(normalized);
  assert.strictEqual(info.provider, 'kugou');
  assert.strictEqual(info.loggedIn, true);
  assert.strictEqual(info.userId, '123');
  assert.strictEqual(info.nickname, '酷狗用户');
  assert.strictEqual(info.tokenReady, true);
  assert.strictEqual(info.appCookieReady, true);

  const embedded = kugou.kugouLoginInfoFromCookie('KuGoo=t=abc123&_id=1014&UserName=%u6D4B%u8BD5%u7528%u6237&KugooID=9988; kg_mid=mid-z');
  assert.strictEqual(embedded.userId, '9988');
  assert.strictEqual(embedded.nickname, '测试用户');
  assert.notStrictEqual(embedded.nickname.indexOf('UserName='), 0);

  const profile = kugou.kugouLoginInfoFromCookie('KugooID=42; token=t42; kg_mid=mid42; UserName=kgopen42; NickName=Real%20Nick; Pic=http://imge.kugou.com/avatar.jpg');
  assert.strictEqual(profile.nickname, 'Real Nick');
  assert.strictEqual(profile.avatar, 'https://imge.kugou.com/avatar.jpg');
  assert.strictEqual(profile.profileSource, 'cookie');
}

function testUserPlaylistParsing() {
  const body = JSON.stringify({
    status: 1,
    plist: {
      list: {
        info: [{
          specialid: 456,
          specialname: '我的普通歌单',
          imgurl: 'https://img/{size}/cover.jpg',
          songcount: 12,
          playcount: 34,
          nickname: 'Me',
        }],
      },
    },
    data: {
      info: [{
        listid: '987',
        name: '云盘歌单',
        pic: 'https://cloud/{size}.jpg',
        count: '7',
        list_create_userid: '222',
        list_create_username: 'Friend',
        global_collection_id: 'gcid_abc123',
      }],
    },
  });
  const playlists = kugou.parseKugouUserPlaylists(body, '123');
  assert.strictEqual(playlists.length, 2);
  assert.deepStrictEqual(playlists.map(pl => pl.id), ['456', 'cloudlist:987']);
  assert.strictEqual(playlists[0].provider, 'kugou');
  assert.strictEqual(playlists[0].source, 'kugou');
  assert.strictEqual(playlists[0].cover, 'https://img/240/cover.jpg');
  assert.strictEqual(playlists[1].subscribed, true);
  assert.strictEqual(playlists[1].trackCount, 7);
}

function testPlaylistTrackParsing() {
  const body = JSON.stringify({
    data: {
      info: [{
        hash: 'ABCDEF1234567890ABCDEF1234567890',
        songname: '歌名',
        singername: '歌手',
        album_name: '专辑',
        duration: 210,
        trans_param: { union_cover: 'https://cover/{size}.jpg' },
      }],
    },
  });
  const result = kugou.parseKugouPlaylistTracks(body, '456');
  assert.strictEqual(result.playlist.id, '456');
  assert.strictEqual(result.tracks.length, 1);
  assert.strictEqual(result.tracks[0].provider, 'kugou');
  assert.strictEqual(result.tracks[0].id, 'ABCDEF1234567890ABCDEF1234567890');
  assert.strictEqual(result.tracks[0].duration, 210000);
  assert.strictEqual(result.tracks[0].cover, 'https://cover/240.jpg');
}

function testUrls() {
  assert.strictEqual(
    kugou.buildKugouUserPlaylistsUrl('123', 2, 50),
    'http://m.kugou.com/plist/index/123?json=true&page=2&pagesize=50'
  );
  assert.strictEqual(
    kugou.buildKugouPlaylistTracksUrl('456'),
    'http://mobilecdn.kugou.com/api/v3/special/song?specialid=456&page=1&pagesize=300&version=9108&area_code=1'
  );
  const requests = kugou.buildKugouSongUrlRequests('KugooID=123; t=token-a; kg_mid=mid-a; kg_dfid=dfid-a', 'ABCDEF1234567890ABCDEF1234567890');
  assert.strictEqual(requests.length, 1);
  assert.ok(requests[0].url.indexOf('https://wwwapi.kugou.com/play/songinfo?') === 0);
  assert.ok(requests[0].url.indexOf('hash=abcdef1234567890abcdef1234567890') > 0);
  assert.ok(requests[0].url.indexOf('signature=') > 0);
}

testCookieNormalization();
testUserPlaylistParsing();
testPlaylistTrackParsing();
testUrls();
console.log('kugou provider tests passed');
