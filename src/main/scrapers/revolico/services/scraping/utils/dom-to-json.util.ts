/**
 * Source of the `domToJson` helper executed INSIDE `page.evaluate()`.
 *
 * The full source is exported as a string (rather than as a TS function) so
 * the worker can inject it into the browser context verbatim. The browser
 * version of the DOM API differs subtly from the Node/JSDOM version
 * (`Element.attributes`, `Element.children`, `Node.TEXT_NODE`), and we do NOT
 * want a build-time bundler step to rewrite the source.
 *
 * The walker:
 *   - Skips `script`, `style`, `noscript`, `template` subtrees.
 *   - Collects element attributes into a plain `{name: value}` map.
 *   - Concatenates non-whitespace text nodes into a single `text` field.
 *     The field is omitted entirely when there are no text nodes (saves
 *     bytes for container elements with only children).
 *
 * Output shape:
 *
 * ```ts
 * interface DomNode {
 *   tag: string;
 *   attrs: Record<string, string>;
 *   children: DomNode[];
 *   text?: string;
 * }
 * ```
 */
export const DOM_TO_JSON_SOURCE = `
function domToJson(el) {
  if (!el) return null;
  var tag = el.tagName ? el.tagName.toLowerCase() : '';
  if (tag === 'script' || tag === 'style' || tag === 'noscript' || tag === 'template') return null;
  var attrs = {};
  if (el.attributes) {
    for (var i = 0; i < el.attributes.length; i++) {
      var a = el.attributes[i];
      attrs[a.name] = a.value;
    }
  }
  var children = [];
  if (el.children) {
    for (var j = 0; j < el.children.length; j++) {
      var c = domToJson(el.children[j]);
      if (c !== null) children.push(c);
    }
  }
  var textNodes = [];
  if (el.childNodes) {
    for (var k = 0; k < el.childNodes.length; k++) {
      var n = el.childNodes[k];
      if (n.nodeType === 3 /* TEXT_NODE */) {
        var t = (n.textContent || '').trim();
        if (t.length > 0) textNodes.push(t);
      }
    }
  }
  var node = { tag: tag, attrs: attrs, children: children };
  if (textNodes.length > 0) node.text = textNodes.join(' ');
  return node;
}
return domToJson;
`.trim();
