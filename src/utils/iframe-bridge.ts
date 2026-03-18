// IIFE injected into each srcdoc to capture console output and network calls via postMessage.
// Must run AFTER mock-api so it wraps the mocked fetch, not native fetch.
export const IFRAME_BRIDGE_INJECTION: string = `(function() {
  try {
    function _send(payload) {
      try {
        window.parent.postMessage(
          Object.assign({ source: '__iframe_bridge__', timestamp: Date.now() }, payload),
          '*'
        );
      } catch(e) {}
    }

    function _serialize(args) {
      return Array.prototype.slice.call(args).map(function(a) {
        if (a === null) return 'null';
        if (a === undefined) return 'undefined';
        if (typeof a !== 'object' && typeof a !== 'function') return String(a);
        try { return JSON.stringify(a, null, 2); } catch(e) { return String(a); }
      });
    }

    // Patch console methods
    ['log', 'warn', 'error', 'info'].forEach(function(method) {
      var orig = console[method].bind(console);
      console[method] = function() {
        orig.apply(console, arguments);
        _send({ type: 'console', level: method, args: _serialize(arguments) });
      };
    });

    // Patch window.onerror
    var _origOnerror = window.onerror;
    window.onerror = function(msg, _src, line) {
      _send({ type: 'console', level: 'error', args: [String(msg) + (line ? ' (line ' + line + ')' : '')] });
      if (_origOnerror) return _origOnerror.apply(this, arguments);
      return false;
    };

    // Patch fetch (runs after mock-api, so wraps the mock)
    var _realFetch = window.fetch;
    window.fetch = function(input, init) {
      var url = typeof input === 'string' ? input : (input && input.url ? input.url : String(input));
      var method = (init && init.method) || 'GET';
      var requestId = Math.random().toString(36).slice(2);
      var t0 = Date.now();
      _send({ type: 'network', phase: 'start', requestId: requestId, method: method, url: url, status: null, duration: null });
      return _realFetch.call(this, input, init).then(function(response) {
        _send({ type: 'network', phase: 'complete', requestId: requestId, method: method, url: url, status: response.status, duration: Date.now() - t0 });
        return response;
      }, function(err) {
        _send({ type: 'network', phase: 'error', requestId: requestId, method: method, url: url, status: null, duration: Date.now() - t0 });
        throw err;
      });
    };
  } catch(e) {
    // Bridge setup failed silently — app still works
  }
})();`
