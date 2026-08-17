/**
 * Creates a DOM element without page-sized HTML strings.
 * Event listeners use the `on:event` property convention.
 */
export function h(tag, attributes = {}, ...children) {
  const element = document.createElement(tag);

  Object.entries(attributes ?? {}).forEach(([key, value]) => {
    if (value === undefined || value === null || value === false) return;
    if (key === 'class') element.className = value;
    else if (key === 'text') element.textContent = value;
    else if (key === 'html') element.innerHTML = value;
    else if (key === 'dataset') Object.assign(element.dataset, value);
    else if (key === 'style' && typeof value === 'object') {
      Object.entries(value).forEach(([property, propertyValue]) => {
        if (property.startsWith('--')) element.style.setProperty(property, propertyValue);
        else element.style[property] = propertyValue;
      });
    } else if (key.startsWith('on:') && typeof value === 'function') {
      element.addEventListener(key.slice(3), value);
    } else if (key in element && !key.startsWith('aria-')) {
      element[key] = value;
    } else {
      element.setAttribute(key, value === true ? '' : String(value));
    }
  });

  appendChildren(element, children);
  return element;
}

export function appendChildren(parent, children) {
  children.flat(Infinity).forEach((child) => {
    if (child === undefined || child === null || child === false) return;
    parent.append(child instanceof Node ? child : document.createTextNode(String(child)));
  });
  return parent;
}

export function clear(element) {
  element.replaceChildren();
  return element;
}

export function fragment(...children) {
  return appendChildren(document.createDocumentFragment(), children);
}

export function qs(selector, parent = document) {
  return parent.querySelector(selector);
}

export function qsa(selector, parent = document) {
  return [...parent.querySelectorAll(selector)];
}

export function setBusy(element, busy, busyLabel = 'Wird geladen …') {
  if (!element) return;
  if (busy) {
    element.dataset.originalLabel = element.textContent;
    element.textContent = busyLabel;
    element.disabled = true;
    element.setAttribute('aria-busy', 'true');
  } else {
    element.textContent = element.dataset.originalLabel || element.textContent;
    element.disabled = false;
    element.removeAttribute('aria-busy');
  }
}
