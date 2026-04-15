export const MOCK_FETCH_INJECTION: string = `(function() {
  var VIDEOS = [
    { id: 1, title: 'Coastal Sunrise', channel: 'Nature Lens', views: 142000, thumbnail: 'https://img.youtube.com/vi/aqz-KE-bpKQ/mqdefault.jpg', duration: '4:32', youtubeId: 'aqz-KE-bpKQ' },
    { id: 2, title: 'Urban Timelapse', channel: 'City Vibes', views: 89500, thumbnail: 'https://img.youtube.com/vi/R6MlUcmOul8/mqdefault.jpg', duration: '2:15', youtubeId: 'R6MlUcmOul8' },
    { id: 3, title: 'Mountain Trek', channel: 'Outdoor Life', views: 231000, thumbnail: 'https://img.youtube.com/vi/eRsGyueVLvQ/mqdefault.jpg', duration: '8:47', youtubeId: 'eRsGyueVLvQ' },
    { id: 4, title: 'Street Food Tour', channel: 'Flavor Hunt', views: 57200, thumbnail: 'https://img.youtube.com/vi/Y-rmzh0PI3c/mqdefault.jpg', duration: '12:03', youtubeId: 'Y-rmzh0PI3c' },
    { id: 5, title: 'Deep Ocean', channel: 'Blue Planet', views: 390000, thumbnail: 'https://img.youtube.com/vi/wX-8liHBnhs/mqdefault.jpg', duration: '6:18', youtubeId: 'wX-8liHBnhs' },
    { id: 6, title: 'Forest Rain', channel: 'Nature Lens', views: 74100, thumbnail: 'https://img.youtube.com/vi/SkVqJ1SGeL0/mqdefault.jpg', duration: '3:55', youtubeId: 'SkVqJ1SGeL0' },
  ];
  var _realFetch = window.fetch;
  window.fetch = function(url) {
    var str = String(url);
    if (str === '/api/videos' || str.indexOf('/api/videos?') === 0) {
      return new Promise(function(resolve) {
        setTimeout(function() {
          resolve({ ok: true, json: function() { return Promise.resolve(VIDEOS); } });
        }, 150);
      });
    }
    if (str.indexOf('/api/videos/') === 0 && str.length > '/api/videos/'.length) {
      var id = Number(str.slice('/api/videos/'.length));
      var video = VIDEOS.find(function(v) { return v.id === id; });
      if (video) {
        return Promise.resolve({ ok: true, json: function() { return Promise.resolve(video); } });
      }
      return Promise.resolve({ ok: false, status: 404, json: function() { return Promise.resolve({ error: 'Not found' }); } });
    }
    return _realFetch ? _realFetch.apply(this, arguments) : Promise.reject(new Error('fetch not available'));
  };
})();`
