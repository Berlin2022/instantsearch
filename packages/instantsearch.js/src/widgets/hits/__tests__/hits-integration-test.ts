/**
 * @jest-environment jsdom
 */

import { getByText, fireEvent } from '@testing-library/dom';

import instantsearch from '../../../index.es';
import { hits, configure } from '../..';
import { createInsightsMiddleware } from '../../../middlewares';
import { createSingleSearchResponse } from '@instantsearch/mocks';
import { wait } from '@instantsearch/testutils/wait';

const createSearchClient = ({
  hitsPerPage,
  includeQueryID,
}: {
  hitsPerPage: number;
  includeQueryID?: boolean;
}) => {
  const page = 0;

  return {
    search: jest.fn((requests) =>
      Promise.resolve({
        results: requests.map(() =>
          createSingleSearchResponse({
            hits: Array(hitsPerPage)
              .fill(undefined)
              .map((_, index) => ({
                title: `title ${page * hitsPerPage + index + 1}`,
                objectID: `object-id${index}`,
                ...(includeQueryID && { __queryID: 'test-query-id' }),
              })),
          })
        ),
      })
    ),
    applicationID: 'latency',
    apiKey: '123',
  };
};

const createInstantSearch = ({
  hitsPerPage = 2,
}: {
  hitsPerPage?: number;
} = {}) => {
  const search = instantsearch({
    indexName: 'instant_search',
    searchClient: createSearchClient({ hitsPerPage }),
  });

  search.addWidgets([
    configure({
      hitsPerPage,
    }),
  ]);

  return {
    search,
  };
};

describe('hits', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
  });

  describe('insights', () => {
    const createInsightsMiddlewareWithOnEvent = () => {
      const onEvent = jest.fn();
      const insights = createInsightsMiddleware({
        insightsClient: null,
        onEvent,
      });
      return {
        onEvent,
        insights,
      };
    };

    it('sends view event when hits are rendered', async () => {
      const { search } = createInstantSearch();
      const { insights, onEvent } = createInsightsMiddlewareWithOnEvent();
      search.use(insights);

      search.addWidgets([
        hits({
          container,
        }),
      ]);
      search.start();
      await wait(0);

      expect(onEvent).toHaveBeenCalledTimes(1);
      expect(onEvent).toHaveBeenCalledWith(
        {
          eventType: 'view',
          hits: [
            {
              __position: 1,
              objectID: 'object-id0',
              title: 'title 1',
            },
            {
              __position: 2,
              objectID: 'object-id1',
              title: 'title 2',
            },
          ],
          insightsMethod: 'viewedObjectIDs',
          payload: {
            eventName: 'Hits Viewed',
            index: 'instant_search',
            objectIDs: ['object-id0', 'object-id1'],
          },
          widgetType: 'ais.hits',
        },
        null
      );
    });

    it('sends `click` event with `sendEvent`', async () => {
      const { search } = createInstantSearch();
      const { insights, onEvent } = createInsightsMiddlewareWithOnEvent();
      search.use(insights);

      search.addWidgets([
        hits({
          container,
          templates: {
            item: (item, { html, sendEvent }) => html`
              <button
                type="button"
                onClick=${() => sendEvent('click', item, 'Item Clicked')}
              >
                ${item.title}
              </button>
            `,
          },
        }),
      ]);
      search.start();
      await wait(0);

      // view event by render
      expect(onEvent).toHaveBeenCalledTimes(1);
      onEvent.mockClear();

      fireEvent.click(getByText(container, 'title 1'));
      expect(onEvent).toHaveBeenCalledTimes(1);
      expect(onEvent).toHaveBeenLastCalledWith(
        {
          eventType: 'click',
          hits: [
            {
              __hitIndex: 0,
              __position: 1,
              objectID: 'object-id0',
              title: 'title 1',
            },
          ],
          insightsMethod: 'clickedObjectIDsAfterSearch',
          payload: {
            eventName: 'Item Clicked',
            index: 'instant_search',
            objectIDs: ['object-id0'],
            positions: [1],
          },
          widgetType: 'ais.hits',
        },
        null
      );
    });

    it('sends `conversion` event with `sendEvent`', async () => {
      const { search } = createInstantSearch();
      const { insights, onEvent } = createInsightsMiddlewareWithOnEvent();
      search.use(insights);

      search.addWidgets([
        hits({
          container,
          templates: {
            item: (item, { html, sendEvent }) => html`
              <button
                type="button"
                onClick=${() =>
                  sendEvent('conversion', item, 'Product Ordered')}
              >
                ${item.title}
              </button>
            `,
          },
        }),
      ]);
      search.start();
      await wait(0);

      // view event by render
      expect(onEvent).toHaveBeenCalledTimes(1);
      onEvent.mockClear();

      fireEvent.click(getByText(container, 'title 2'));
      expect(onEvent).toHaveBeenCalledTimes(1);
      expect(onEvent).toHaveBeenCalledWith(
        {
          eventType: 'conversion',
          hits: [
            {
              __hitIndex: 1,
              __position: 2,
              objectID: 'object-id1',
              title: 'title 2',
            },
          ],
          insightsMethod: 'convertedObjectIDsAfterSearch',
          payload: {
            eventName: 'Product Ordered',
            index: 'instant_search',
            objectIDs: ['object-id1'],
          },
          widgetType: 'ais.hits',
        },
        null
      );
    });

    it('sends `click` event with `bindEvent`', async () => {
      const { search } = createInstantSearch();
      const { insights, onEvent } = createInsightsMiddlewareWithOnEvent();
      search.use(insights);

      search.addWidgets([
        hits({
          container,
          templates: {
            item: (item, bindEvent) => `
              <button type='button' ${bindEvent('click', item, 'Item Clicked')}>
                ${item.title}
              </button>
            `,
          },
        }),
      ]);
      search.start();
      await wait(0);

      // view event by render
      expect(onEvent).toHaveBeenCalledTimes(1);
      onEvent.mockClear();

      fireEvent.click(getByText(container, 'title 1'));
      expect(onEvent).toHaveBeenCalledTimes(1);
      expect(onEvent).toHaveBeenLastCalledWith(
        {
          eventType: 'click',
          hits: [
            {
              __hitIndex: 0,
              __position: 1,
              objectID: 'object-id0',
              title: 'title 1',
            },
          ],
          insightsMethod: 'clickedObjectIDsAfterSearch',
          payload: {
            eventName: 'Item Clicked',
            index: 'instant_search',
            objectIDs: ['object-id0'],
            positions: [1],
          },
          widgetType: 'ais.hits',
        },
        null
      );
    });

    it('sends `conversion` event with `bindEvent`', async () => {
      const { search } = createInstantSearch();
      const { insights, onEvent } = createInsightsMiddlewareWithOnEvent();
      search.use(insights);

      search.addWidgets([
        hits({
          container,
          templates: {
            item: (item, bindEvent) => `
              <button type='button' ${bindEvent(
                'conversion',
                item,
                'Product Ordered'
              )}>
                ${item.title}
              </button>
            `,
          },
        }),
      ]);
      search.start();
      await wait(0);

      // view event by render
      expect(onEvent).toHaveBeenCalledTimes(1);
      onEvent.mockClear();

      fireEvent.click(getByText(container, 'title 2'));
      expect(onEvent).toHaveBeenCalledTimes(1);
      expect(onEvent).toHaveBeenLastCalledWith(
        {
          eventType: 'conversion',
          hits: [
            {
              __hitIndex: 1,
              __position: 2,
              objectID: 'object-id1',
              title: 'title 2',
            },
          ],
          insightsMethod: 'convertedObjectIDsAfterSearch',
          payload: {
            eventName: 'Product Ordered',
            index: 'instant_search',
            objectIDs: ['object-id1'],
          },
          widgetType: 'ais.hits',
        },
        null
      );
    });
  });

  describe('old insights methods', () => {
    it('sends event', async () => {
      const aa = jest.fn();
      const hitsPerPage = 2;
      const search = instantsearch({
        indexName: 'instant_search',
        searchClient: createSearchClient({
          hitsPerPage,
          includeQueryID: true,
        }),
        insightsClient: aa,
      });

      search.addWidgets([
        configure({
          hitsPerPage,
        }),
      ]);

      search.addWidgets([
        hits({
          container,
          templates: {
            item: (item) => `
              <button type='button' ${instantsearch.insights(
                'clickedObjectIDsAfterSearch',
                {
                  objectIDs: [item.objectID],
                  eventName: 'Add to cart',
                }
              )}>
                ${item.title}
              </button>
            `,
          },
        }),
      ]);
      search.start();
      await wait(0);

      fireEvent.click(getByText(container, 'title 1'));
      expect(aa).toHaveBeenCalledTimes(1);
      expect(aa).toHaveBeenCalledWith('clickedObjectIDsAfterSearch', {
        eventName: 'Add to cart',
        index: undefined,
        objectIDs: ['object-id0'],
        positions: [1],
        queryID: 'test-query-id',
      });
    });
  });
});
