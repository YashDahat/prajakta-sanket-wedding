/* dc-lite: a tiny renderer for the invite's .dc.html template, built on Preact. */
(function () {
  var P = window.preact;
  var h = P.h, Fragment = P.Fragment;
  var HOLE = /\{\{\s*([^}]+?)\s*\}\}/g;
  var WHOLE = /^\{\{\s*([^}]+?)\s*\}\}$/;

  function get(scope, path) {
    path = path.trim();
    if (path === 'true') return true;
    if (path === 'false') return false;
    if (path === 'null') return null;
    if (/^-?\d+(\.\d+)?$/.test(path)) return Number(path);
    var v = scope;
    var parts = path.split('.');
    for (var i = 0; i < parts.length; i++) { if (v == null) return undefined; v = v[parts[i]]; }
    return v;
  }
  function interp(str, scope) {
    return str.replace(HOLE, function (_, p) { var v = get(scope, p); return v == null ? '' : String(v); });
  }
  function attrVal(str, scope) {
    var m = str.match(WHOLE);
    if (m) return get(scope, m[1]);
    return str.indexOf('{{') >= 0 ? interp(str, scope) : str;
  }
  function kids(node, scope) {
    var out = [];
    for (var c = node.firstChild; c; c = c.nextSibling) {
      var r = build(c, scope);
      if (r == null) continue;
      if (Array.isArray(r)) { for (var i = 0; i < r.length; i++) if (r[i] != null) out.push(r[i]); }
      else out.push(r);
    }
    return out;
  }
  function element(node, scope) {
    var tag = node.localName;
    var props = {};
    var attrs = node.attributes;
    for (var i = 0; i < attrs.length; i++) {
      var n = attrs[i].name;
      if (n.indexOf('hint-') === 0 || n === 'data-dcfor') continue;
      var v = attrVal(attrs[i].value, scope);
      if (n.indexOf('on') === 0) {
        if (typeof v !== 'function') continue;
        if (n === 'onchange' && (tag === 'input' || tag === 'textarea')) n = 'oninput';
      }
      props[n] = v;
    }
    return h(tag, props, kids(node, scope));
  }
  function build(node, scope) {
    if (node.nodeType === 3) {
      var t = node.nodeValue;
      if (!t.trim() && t.indexOf('\n') >= 0) return null;
      return t.indexOf('{{') >= 0 ? interp(t, scope) : t;
    }
    if (node.nodeType !== 1) return null;
    var tag = node.localName;
    if (tag === 'helmet') return null;
    if (tag === 'sc-if') return attrVal(node.getAttribute('value') || '', scope) ? kids(node, scope) : null;
    if (tag === 'sc-for' || node.hasAttribute('data-dcfor')) {
      var spec = tag === 'sc-for' ? [node.getAttribute('list'), node.getAttribute('as') || 'item'] : node.getAttribute('data-dcfor').split('|');
      var list = attrVal(spec[0] || '', scope) || [];
      var as = spec[1] || 'item';
      return list.map(function (it, idx) {
        var s = Object.create(scope); s[as] = it; s.$index = idx;
        return tag === 'sc-for' ? kids(node, s) : element(node, s);
      });
    }
    return element(node, scope);
  }

  var root = null;
  window.DCLogic = class extends P.Component {
    render() { return h(Fragment, null, kids(root, this.renderVals() || {})); }
  };
  window.DCLite = {
    mount: function (Comp, tplId, mountId) {
      var src = document.getElementById(tplId).textContent;
      var doc = new DOMParser().parseFromString('<body>' + src + '</body>', 'text/html');
      root = doc.body;
      var helmet = root.querySelector('helmet');
      if (helmet) {
        Array.prototype.slice.call(helmet.children).forEach(function (el) {
          var copy = document.createElement(el.localName);
          for (var i = 0; i < el.attributes.length; i++) copy.setAttribute(el.attributes[i].name, el.attributes[i].value);
          copy.textContent = el.textContent;
          document.head.appendChild(copy);
        });
      }
      P.render(h(Comp, {}), document.getElementById(mountId));
    }
  };
})();
