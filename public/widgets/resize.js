/* Shared cross-origin embed sizing. Safe to include more than once per page. */
(function () {
  'use strict';
  if (window.__solarCheckResizeInstalled) return;
  window.__solarCheckResizeInstalled = true;
  function frames() { return document.querySelectorAll('iframe[data-solar-check-resize]'); }
  function request(frame) {
    try { frame.contentWindow.postMessage({type:'widget:measure'}, new URL(frame.src, document.baseURI).origin); } catch (_) { /* Detached or invalid frame. */ }
  }
  window.addEventListener('message', function (event) {
    var data=event.data;
    if (!data || data.type!=='widget:height' || !Number.isFinite(data.height) || data.height<=0 || data.height>100000) return;
    frames().forEach(function (frame) {
      if (event.source!==frame.contentWindow) return;
      try { if (event.origin!==new URL(frame.src, document.baseURI).origin) return; } catch (_) { return; }
      var height=Math.ceil(data.height)+'px';
      if(frame.style.height!==height) frame.style.height=height;
    });
  });
  document.addEventListener('load', function (event) {
    if(event.target instanceof HTMLIFrameElement && event.target.hasAttribute('data-solar-check-resize'))request(event.target);
  },true);
  frames().forEach(request);
})();
