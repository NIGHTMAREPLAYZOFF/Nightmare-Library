
/**
 * Safe DOM Construction Helpers
 * Prevents XSS by using createElement + textContent instead of innerHTML
 */

/**
 * Escape HTML entities to prevent XSS
 * Used only for attribute values where createElement isn't suitable
 */
export function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/**
 * Create element with attributes and children safely
 * @param {string} tag - HTML tag name
 * @param {Object} attrs - Attributes object
 * @param {Array|Node|string} children - Child nodes or text
 * @returns {HTMLElement}
 */
export function createElement(tag, attrs = {}, children = []) {
  const element = document.createElement(tag);
  
  // Set attributes safely
  Object.entries(attrs).forEach(([key, value]) => {
    if (key === 'className') {
      element.className = value;
    } else if (key === 'dataset') {
      Object.entries(value).forEach(([dataKey, dataValue]) => {
        element.dataset[dataKey] = dataValue;
      });
    } else if (key.startsWith('on') && typeof value === 'function') {
      element.addEventListener(key.slice(2).toLowerCase(), value);
    } else if (key === 'style' && typeof value === 'object') {
      Object.assign(element.style, value);
    } else {
      element.setAttribute(key, value);
    }
  });
  
  // Add children safely
  const childArray = Array.isArray(children) ? children : [children];
  childArray.forEach(child => {
    if (typeof child === 'string') {
      element.appendChild(document.createTextNode(child));
    } else if (child instanceof Node) {
      element.appendChild(child);
    }
  });
  
  return element;
}

/**
 * Create element with text content (most common safe pattern)
 * @param {string} tag - HTML tag name
 * @param {string} text - Text content
 * @param {Object} attrs - Attributes object
 * @returns {HTMLElement}
 */
export function createElementWithText(tag, text, attrs = {}) {
  const element = document.createElement(tag);
  element.textContent = text || '';
  
  Object.entries(attrs).forEach(([key, value]) => {
    if (key === 'className') {
      element.className = value;
    } else if (key === 'dataset') {
      Object.entries(value).forEach(([dataKey, dataValue]) => {
        element.dataset[dataKey] = dataValue;
      });
    } else {
      element.setAttribute(key, value);
    }
  });
  
  return element;
}

/**
 * Batch DOM append using DocumentFragment
 * Reduces reflows to single operation
 * @param {HTMLElement} container - Parent element
 * @param {Array<Node>} nodes - Nodes to append
 */
export function batchAppend(container, nodes) {
  const fragment = document.createDocumentFragment();
  nodes.forEach(node => fragment.appendChild(node));
  container.appendChild(fragment);
}

/**
 * Clear container efficiently
 * @param {HTMLElement} container - Element to clear
 */
export function clearElement(container) {
  while (container.firstChild) {
    container.removeChild(container.firstChild);
  }
}

/**
 * Replace element's children efficiently
 * @param {HTMLElement} container - Parent element
 * @param {Array<Node>} newChildren - New child nodes
 */
export function replaceChildren(container, newChildren) {
  clearElement(container);
  batchAppend(container, newChildren);
}

/**
 * Create a cached template cloner
 * For repeated UI elements, clone instead of rebuild
 * @param {Function} factory - Function that creates the template
 * @returns {Function} Cloner function
 */
export function createTemplateCloner(factory) {
  let template = null;
  
  return function() {
    if (!template) {
      template = factory();
    }
    return template.cloneNode(true);
  };
}
