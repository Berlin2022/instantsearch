import type { InitOptions, Widget } from 'instantsearch.js';
import type { IndexWidget } from 'instantsearch.js/es/widgets/index/index';
import { getWidgetAttribute } from 'instantsearch.js/es/lib/utils';
import { createInitOptions } from 'instantsearch.js/test/createWidget';

function getAttribute(widget: Widget | IndexWidget) {
  try {
    // casted to harmonize between src and es types of the same
    return getWidgetAttribute(widget, createInitOptions() as InitOptions);
  } catch {
    return undefined;
  }
}

/**
 * Jest serializer for an InstantSearch widget.
 *
 * It looks like this:
 *
 * Widget($$type)
 * Widget($$type) {
 *  $$widgetType: string
 *  attribute: string
 * }
 */
export const widgetSnapshotSerializer: jest.SnapshotSerializerPlugin = {
  serialize(widget: Widget | IndexWidget, { indent }, indentation) {
    const keys = {
      $$widgetType: widget.$$widgetType,
      attribute: getAttribute(widget),
    };

    const widgetName = `Widget(${widget.$$type || 'unknown'})`;

    const content = Object.entries(keys)
      .filter(([_key, value]) => value)
      .map(([key, value]) => `${indentation}${indent}${key}: ${value}`)
      .join('\n');

    if (content) {
      return `${widgetName} {
${content}
${indentation}}`;
    }

    return widgetName;
  },
  test(value) {
    return Boolean(value?.$$type);
  },
};
