/*
 * ScreenFlow player service worker.
 *
 * Only registered by player pages of screens with offline mode on. The page
 * itself decides what gets saved (its own HTML and its media, see the player
 * route); this worker just serves those copies when the network is gone.
 *
 * Written without async/await so older Android WebViews can run it.
 */
var PAGES = "sf-pages-v1";
var MEDIA = "sf-media-v1";
var LAST_PAGE = "/player/__last";
var NAV_TIMEOUT_MS = 8000;

self.addEventListener("install", function () {
  self.skipWaiting();
});

self.addEventListener("activate", function (event) {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", function (event) {
  var req = event.request;
  if (req.method !== "GET") return;

  if (req.mode === "navigate") {
    event.respondWith(handleNavigation(req));
    return;
  }

  // Media lives on the storage domain (or under /uploads on old installs).
  // API calls and everything else go straight to the network.
  var url = new URL(req.url);
  if (url.origin !== self.location.origin || url.pathname.indexOf("/uploads/") === 0) {
    event.respondWith(handleMedia(req));
  }
});

function withTimeout(promise, ms) {
  return new Promise(function (resolve, reject) {
    var timer = setTimeout(function () {
      reject(new Error("timeout"));
    }, ms);
    promise.then(
      function (value) {
        clearTimeout(timer);
        resolve(value);
      },
      function (err) {
        clearTimeout(timer);
        reject(err);
      }
    );
  });
}

// Network first: a reachable server always wins, so the TV never shows an
// old page while online. The saved copy is for when the request fails, hangs
// or the server itself is down.
function handleNavigation(req) {
  return withTimeout(fetch(req), NAV_TIMEOUT_MS)
    .then(function (res) {
      if (res.status >= 500) {
        return savedPage(req).then(function (saved) {
          return saved || res;
        });
      }
      return res;
    })
    .catch(function () {
      return savedPage(req).then(function (saved) {
        return saved || Response.error();
      });
    });
}

function savedPage(req) {
  // caches.match with a cache name never creates the cache, unlike
  // caches.open: a page that switched offline mode off stays clean.
  return caches
    .match(req.url, { cacheName: PAGES, ignoreVary: true })
    .then(function (hit) {
      // A paired TV box opens /player and is redirected to its screen;
      // offline there is no redirect, so fall back to the last page shown.
      return (
        hit ||
        caches.match(new URL(LAST_PAGE, self.location.origin).href, { cacheName: PAGES, ignoreVary: true })
      );
    })
    .then(function (hit) {
      if (!hit) return null;
      return hit.text().then(function (html) {
        // Tells the page it is a saved copy, so it reloads once the server answers again.
        var marked = html.replace("<body>", "<body><script>window.__sfFromCache=true</script>");
        return new Response(marked, {
          status: 200,
          headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
        });
      });
    })
    .catch(function () {
      return null;
    });
}

function handleMedia(req) {
  return caches
    .match(req.url, { cacheName: MEDIA, ignoreVary: true })
    .then(function (hit) {
      if (!hit) return fetch(req);
      var range = req.headers.get("range");
      if (!range) return hit;
      // <video> asks for byte ranges; cut them out of the saved file.
      return hit.blob().then(function (blob) {
        return rangeResponse(blob, range, hit.headers.get("Content-Type"));
      });
    })
    .catch(function () {
      return fetch(req);
    });
}

function rangeResponse(blob, range, type) {
  var size = blob.size;
  var contentType = type || "application/octet-stream";
  var m = /^bytes=(\d*)-(\d*)$/.exec(String(range).trim());
  if (!m || (m[1] === "" && m[2] === "")) {
    return new Response(blob, { status: 200, headers: { "Content-Type": contentType, "Accept-Ranges": "bytes" } });
  }

  var start;
  var end;
  if (m[1] === "") {
    // "bytes=-500": the last 500 bytes
    start = Math.max(0, size - Number(m[2]));
    end = size - 1;
  } else {
    start = Number(m[1]);
    end = m[2] === "" ? size - 1 : Math.min(Number(m[2]), size - 1);
  }

  if (start >= size || start > end) {
    return new Response(null, { status: 416, headers: { "Content-Range": "bytes */" + size } });
  }

  return new Response(blob.slice(start, end + 1, contentType), {
    status: 206,
    statusText: "Partial Content",
    headers: {
      "Content-Type": contentType,
      "Content-Range": "bytes " + start + "-" + end + "/" + size,
      "Content-Length": String(end - start + 1),
      "Accept-Ranges": "bytes",
    },
  });
}
