/**
 * Standalone Feature Inspector for static HTML pages.
 * Same behavior as the React FeatureInspector but works without React.
 *
 * Activation: add ?inspector to URL (sets localStorage for persistence).
 * Deactivation: add ?inspector=off to URL.
 * Usage: Option/Alt + Hover = highlight + tooltip. Option/Alt + Click = copy tag.
 */
(function () {
  var STORAGE_KEY = 'feature-inspector-enabled';
  var params = new URLSearchParams(window.location.search);

  if (params.has('inspector')) {
    var val = params.get('inspector');
    if (val === 'off' || val === 'false') {
      localStorage.removeItem(STORAGE_KEY);
      return;
    }
    localStorage.setItem(STORAGE_KEY, 'true');
  } else if (localStorage.getItem(STORAGE_KEY) !== 'true') {
    return;
  }

  var active = false;
  var highlightEl = null;
  var tooltip = null;

  function getSession(tag) {
    return tag.indexOf('__') !== -1 ? tag.split('__')[0] : tag;
  }

  function findTaggedParent(el) {
    while (el) {
      if (el.dataset && el.dataset.feature) return el;
      el = el.parentElement;
    }
    return null;
  }

  function clearHighlight() {
    if (highlightEl) {
      highlightEl.style.outline = '';
      highlightEl.style.outlineOffset = '';
      highlightEl = null;
    }
    if (tooltip && tooltip.parentNode) {
      tooltip.parentNode.removeChild(tooltip);
      tooltip = null;
    }
  }

  function showTooltip(tag, x, y) {
    if (!tooltip) {
      tooltip = document.createElement('div');
      tooltip.style.cssText =
        'position:fixed;z-index:99999;pointer-events:none;background:#1A1A1A;color:#FFF;' +
        'padding:4px 10px;border-radius:6px;font-size:12px;font-family:Inter,system-ui,sans-serif;' +
        'font-weight:500;white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,0.25);max-width:400px;overflow:hidden;text-overflow:ellipsis;';
      document.body.appendChild(tooltip);
    }
    var session = getSession(tag);
    tooltip.textContent = session === tag ? tag : session + ' > ' + tag;
    tooltip.style.left = x + 12 + 'px';
    tooltip.style.top = y + 12 + 'px';
  }

  function showToast(tag) {
    var session = getSession(tag);
    var toast = document.createElement('div');
    toast.style.cssText =
      'position:fixed;bottom:24px;right:24px;z-index:99999;background:#1A1A1A;color:#FFF;' +
      'padding:12px 20px;border-radius:10px;font-size:13px;font-family:Inter,system-ui,sans-serif;' +
      'font-weight:500;box-shadow:0 4px 16px rgba(0,0,0,0.2);max-width:400px;' +
      'opacity:0;transform:translateY(8px);transition:opacity 0.2s,transform 0.2s;';
    toast.innerHTML =
      '<div>Copied: ' + tag + '</div>' +
      '<div style="font-size:11px;color:#9CA3AF;margin-top:2px;">Session: ' +
      (session === tag ? session : session + ' > ' + tag) + '</div>';
    document.body.appendChild(toast);
    requestAnimationFrame(function () {
      toast.style.opacity = '1';
      toast.style.transform = 'translateY(0)';
    });
    setTimeout(function () {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(8px)';
      setTimeout(function () { toast.parentNode && toast.parentNode.removeChild(toast); }, 200);
    }, 2000);
  }

  window.addEventListener('keydown', function (e) {
    if (e.key === 'Alt' || e.altKey) active = true;
  });
  window.addEventListener('keyup', function (e) {
    if (e.key === 'Alt') { active = false; clearHighlight(); }
  });
  window.addEventListener('blur', function () { active = false; clearHighlight(); });

  document.addEventListener('mousemove', function (e) {
    if (!active) return;
    var el = findTaggedParent(e.target);
    if (el === highlightEl) {
      if (tooltip) { tooltip.style.left = e.clientX + 12 + 'px'; tooltip.style.top = e.clientY + 12 + 'px'; }
      return;
    }
    clearHighlight();
    if (!el) return;
    el.style.outline = '2px solid #1E9A80';
    el.style.outlineOffset = '-2px';
    highlightEl = el;
    showTooltip(el.dataset.feature, e.clientX, e.clientY);
  }, true);

  document.addEventListener('click', function (e) {
    if (!active) return;
    var el = findTaggedParent(e.target);
    if (!el) return;
    e.preventDefault();
    e.stopPropagation();
    var tag = el.dataset.feature;
    navigator.clipboard.writeText(tag).then(function () { showToast(tag); });
  }, true);
})();
