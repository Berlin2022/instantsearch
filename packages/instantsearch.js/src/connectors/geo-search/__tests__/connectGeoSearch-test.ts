import algoliasearchHelper, {
  SearchParameters,
  SearchResults,
} from 'algoliasearch-helper';
import connectGeoSearch from '../connectGeoSearch';
import { createInstantSearch } from '../../../../test/createInstantSearch';
import {
  createSearchClient,
  createMultiSearchResponse,
  createSingleSearchResponse,
} from '@instantsearch/mocks';
import {
  createDisposeOptions,
  createInitOptions,
  createRenderOptions,
} from '../../../../test/createWidget';
import instantsearch from '../../../index.es';
import { wait } from '@instantsearch/testutils/wait';
import type { SearchResponse } from '../../../types';

describe('connectGeoSearch', () => {
  const createFakeHelper = () => {
    const helper = algoliasearchHelper(createSearchClient(), '');

    helper.search = jest.fn();

    return helper;
  };

  const getInitializedWidget = () => {
    const render = jest.fn();
    const makeWidget = connectGeoSearch(render);

    const widget = makeWidget({});

    const helper = createFakeHelper();

    widget.init!(createInitOptions({ helper }));

    const { refine } = widget.getWidgetRenderState(
      createInitOptions({ helper })
    );

    return [widget, helper, refine] as const;
  };

  const getRenderedWidget = () => {
    const hits = [
      {
        objectID: '123',
        _geoloc: { lat: 10, lng: 12 },
        __position: 0,
        __queryID: 'test-query-id',
      },
      {
        objectID: '456',
        _geoloc: { lat: 12, lng: 14 },
        __position: 1,
        __queryID: 'test-query-id',
      },
      {
        objectID: '789',
        _geoloc: { lat: 14, lng: 16 },
        __position: 2,
        __queryID: 'test-query-id',
      },
    ];
    const render = jest.fn();
    const unmount = jest.fn();

    const customGeoSearch = connectGeoSearch(render, unmount);
    const widget = customGeoSearch({});

    const instantSearchInstance = createInstantSearch();
    const helper = instantSearchInstance.mainHelper!;

    widget.init!(
      createInitOptions({
        instantSearchInstance,
      })
    );

    const results = new SearchResults(helper.state, [
      createSingleSearchResponse({
        hits,
      }),
    ]);

    widget.render!(
      createRenderOptions({
        instantSearchInstance,
        results,
      })
    );

    return {
      widget,
      helper,
      results,
      hits,
      render,
      instantSearchInstance,
    };
  };

  const firstRenderArgs = (fn: jest.Mock) => fn.mock.calls[0][0];
  const lastRenderArgs = (fn: jest.Mock) =>
    fn.mock.calls[fn.mock.calls.length - 1][0];

  describe('Usage', () => {
    it('throws without render function', () => {
      expect(() => {
        // @ts-expect-error
        connectGeoSearch()({});
      }).toThrowErrorMatchingInlineSnapshot(`
"The render function is not valid (received type Undefined).

See documentation: https://www.algolia.com/doc/api-reference/widgets/geo-search/js/#connector"
`);
    });
  });

  it('expect to be a widget', () => {
    const render = jest.fn();
    const unmount = jest.fn();

    const customGeoSearch = connectGeoSearch(render, unmount);
    const widget = customGeoSearch({});

    expect(widget).toEqual({
      $$type: 'ais.geoSearch',
      init: expect.any(Function),
      render: expect.any(Function),
      dispose: expect.any(Function),
      getWidgetUiState: expect.any(Function),
      getWidgetSearchParameters: expect.any(Function),
      getWidgetRenderState: expect.any(Function),
      getRenderState: expect.any(Function),
    });
  });

  it('expect to render twice during init and render', () => {
    const render = jest.fn();
    const unmount = jest.fn();

    const customGeoSearch = connectGeoSearch(render, unmount);
    const widget = customGeoSearch({});

    const instantSearchInstance = createInstantSearch();
    const { mainHelper: helper } = instantSearchInstance;

    widget.init!(createInitOptions({ instantSearchInstance }));

    expect(render).toHaveBeenCalledTimes(1);
    expect(render).toHaveBeenLastCalledWith(
      {
        items: [],
        position: undefined,
        refine: expect.any(Function),
        sendEvent: expect.any(Function),
        clearMapRefinement: expect.any(Function),
        isRefinedWithMap: expect.any(Function),
        toggleRefineOnMapMove: expect.any(Function),
        isRefineOnMapMove: expect.any(Function),
        setMapMoveSinceLastRefine: expect.any(Function),
        hasMapMoveSinceLastRefine: expect.any(Function),
        widgetParams: {},
        instantSearchInstance,
      },
      true
    );

    expect(lastRenderArgs(render).isRefineOnMapMove()).toBe(true);
    expect(lastRenderArgs(render).hasMapMoveSinceLastRefine()).toBe(false);
    expect(lastRenderArgs(render).isRefinedWithMap()).toBe(false);

    widget.render!(
      createRenderOptions({
        results: new SearchResults(helper!.state, [
          createSingleSearchResponse({
            hits: [
              { objectID: '123', _geoloc: { lat: 10, lng: 12 } },
              { objectID: '456', _geoloc: { lat: 12, lng: 14 } },
              { objectID: '789', _geoloc: { lat: 14, lng: 16 } },
            ],
          }),
        ]),
        instantSearchInstance,
      })
    );

    expect(render).toHaveBeenCalledTimes(2);
    expect(render).toHaveBeenLastCalledWith(
      expect.objectContaining({
        items: [
          { objectID: '123', _geoloc: { lat: 10, lng: 12 } },
          { objectID: '456', _geoloc: { lat: 12, lng: 14 } },
          { objectID: '789', _geoloc: { lat: 14, lng: 16 } },
        ],
        position: undefined,
        refine: expect.any(Function),
        clearMapRefinement: expect.any(Function),
        toggleRefineOnMapMove: expect.any(Function),
        setMapMoveSinceLastRefine: expect.any(Function),
        widgetParams: {},
        instantSearchInstance,
      }),
      false
    );

    expect(lastRenderArgs(render).isRefineOnMapMove()).toBe(true);
    expect(lastRenderArgs(render).hasMapMoveSinceLastRefine()).toBe(false);
    expect(lastRenderArgs(render).isRefinedWithMap()).toBe(false);
  });

  it('expect to render with enableRefineOnMapMove disabled', () => {
    const render = jest.fn();
    const unmount = jest.fn();

    const customGeoSearch = connectGeoSearch(render, unmount);
    const widget = customGeoSearch({
      enableRefineOnMapMove: false,
    });

    const helper = createFakeHelper();

    widget.init!(createInitOptions());

    expect(render).toHaveBeenCalledTimes(1);
    expect(lastRenderArgs(render).isRefineOnMapMove()).toBe(false);

    widget.render!(
      createRenderOptions({
        results: new SearchResults(helper.state, [
          createSingleSearchResponse({
            hits: [{ objectID: '123', _geoloc: { lat: 10, lng: 12 } }],
          }),
        ]),
        helper,
      })
    );

    expect(render).toHaveBeenCalledTimes(2);
    expect(lastRenderArgs(render).isRefineOnMapMove()).toBe(false);
  });

  it('expect to render with only geoloc hits', () => {
    const render = jest.fn();
    const unmount = jest.fn();

    const customGeoSearch = connectGeoSearch(render, unmount);
    const widget = customGeoSearch({});

    const helper = createFakeHelper();
    widget.init!(createInitOptions());

    widget.render!(
      createRenderOptions({
        results: new SearchResults(helper.state, [
          createSingleSearchResponse({
            hits: [
              { objectID: '123', _geoloc: { lat: 10, lng: 12 } },
              { objectID: '456' },
              { objectID: '789', _geoloc: { lat: 10, lng: 12 } },
            ],
          }),
        ]),
        helper,
      })
    );

    expect(render).toHaveBeenLastCalledWith(
      expect.objectContaining({
        items: [
          { objectID: '123', _geoloc: { lat: 10, lng: 12 } },
          { objectID: '789', _geoloc: { lat: 10, lng: 12 } },
        ],
      }),
      false
    );
  });

  it('expect to render with transformed hits', () => {
    const render = jest.fn();
    const unmount = jest.fn();

    const customGeoSearch = connectGeoSearch(render, unmount);
    const widget = customGeoSearch({
      transformItems: (items) =>
        items.map((item) => ({
          ...item,
          _geoloc: {
            lat: 20,
            lng: 20,
          },
        })),
    });

    const helper = createFakeHelper();
    widget.init!(createInitOptions());

    widget.render!(
      createRenderOptions({
        results: new SearchResults(helper.state, [
          createSingleSearchResponse({
            hits: [
              { objectID: '123', _geoloc: { lat: 10, lng: 12 } },
              { objectID: '456' },
              { objectID: '789', _geoloc: { lat: 10, lng: 12 } },
            ],
          }),
        ]),
        helper,
      })
    );

    expect(render).toHaveBeenLastCalledWith(
      expect.objectContaining({
        items: [
          { objectID: '123', _geoloc: { lat: 20, lng: 20 } },
          { objectID: '789', _geoloc: { lat: 20, lng: 20 } },
        ],
      }),
      false
    );
  });

  it('expect to render with position', () => {
    const render = jest.fn();
    const unmount = jest.fn();

    const customGeoSearch = connectGeoSearch(render, unmount);
    const widget = customGeoSearch({});
    const helper = createFakeHelper();

    // Simulate the configuration or external setter
    helper.setQueryParameter('aroundLatLng', '10, 12');

    widget.init!(
      createInitOptions({
        helper,
        state: helper.state,
      })
    );

    expect(render).toHaveBeenCalledTimes(1);
    expect(render).toHaveBeenCalledWith(
      expect.objectContaining({
        position: {
          lat: 10,
          lng: 12,
        },
      }),
      true
    );

    widget.render!(
      createRenderOptions({
        results: new SearchResults(helper.state, [
          createSingleSearchResponse({
            hits: [],
          }),
        ]),
        helper,
      })
    );

    expect(render).toHaveBeenCalledTimes(2);
    expect(render).toHaveBeenCalledWith(
      expect.objectContaining({
        position: {
          lat: 10,
          lng: 12,
        },
      }),
      false
    );

    // Simulate the configuration or external setter
    helper.setQueryParameter('aroundLatLng', '12, 14');

    widget.render!(
      createRenderOptions({
        results: new SearchResults(helper.state, [
          createSingleSearchResponse({
            hits: [],
          }),
        ]),
        helper,
      })
    );

    expect(render).toHaveBeenCalledTimes(3);
    expect(render).toHaveBeenCalledWith(
      expect.objectContaining({
        position: {
          lat: 12,
          lng: 14,
        },
      }),
      false
    );
  });

  it('expect to provide search results within transformItems', () => {
    const transformItems = jest.fn((items) => items);
    const customGeoSearch = connectGeoSearch(() => {});
    const widget = customGeoSearch({
      transformItems,
    });

    const helper = createFakeHelper();
    const results = new SearchResults(helper.state, [
      createSingleSearchResponse(),
    ]);

    widget.init!(createInitOptions({ helper, state: helper.state }));
    widget.render!(
      createRenderOptions({
        results,
        helper,
      })
    );

    expect(transformItems).toHaveBeenLastCalledWith(
      expect.anything(),
      expect.objectContaining({ results })
    );
  });

  it('expect to reset the map state when position changed', () => {
    const render = jest.fn();
    const unmount = jest.fn();

    const customGeoSearch = connectGeoSearch(render, unmount);
    const widget = customGeoSearch({});

    const helper = createFakeHelper();

    const northEast = {
      lat: 12,
      lng: 10,
    };

    const southWest = {
      lat: 40,
      lng: 42,
    };

    const results = new SearchResults(helper.state, [
      createSingleSearchResponse({
        hits: [
          { objectID: '123', _geoloc: { lat: 10, lng: 12 } },
          { objectID: '456' },
          { objectID: '789', _geoloc: { lat: 10, lng: 12 } },
        ],
      }),
    ]);

    helper.setQueryParameter('aroundLatLng', '10,12');

    widget.init!(
      createInitOptions({
        state: helper.state,
        helper,
      })
    );

    widget.render!(
      createRenderOptions({
        results,
        helper,
      })
    );

    lastRenderArgs(render).refine({ northEast, southWest });

    widget.render!(
      createRenderOptions({
        results,
        helper,
      })
    );

    expect(render).toHaveBeenCalledTimes(3);
    expect(lastRenderArgs(render).hasMapMoveSinceLastRefine()).toBe(false);
    expect(lastRenderArgs(render).isRefinedWithMap()).toBe(true);

    lastRenderArgs(render).setMapMoveSinceLastRefine();

    expect(render).toHaveBeenCalledTimes(4);
    expect(lastRenderArgs(render).hasMapMoveSinceLastRefine()).toBe(true);
    expect(lastRenderArgs(render).isRefinedWithMap()).toBe(true);

    helper.setQueryParameter('aroundLatLng', '14,16');

    widget.render!(
      createRenderOptions({
        results,
        helper,
      })
    );

    expect(render).toHaveBeenCalledTimes(5);
    expect(lastRenderArgs(render).hasMapMoveSinceLastRefine()).toBe(false);
    expect(lastRenderArgs(render).isRefinedWithMap()).toBe(true);
  });

  it("expect to not reset the map state when position don't changed", () => {
    const render = jest.fn();
    const unmount = jest.fn();

    const customGeoSearch = connectGeoSearch(render, unmount);
    const widget = customGeoSearch({});

    const helper = createFakeHelper();

    const northEast = {
      lat: 12,
      lng: 10,
    };

    const southWest = {
      lat: 40,
      lng: 42,
    };

    const results = new SearchResults(helper.state, [
      createSingleSearchResponse({
        hits: [
          { objectID: '123', _geoloc: { lat: 10, lng: 12 } },
          { objectID: '456' },
          { objectID: '789', _geoloc: { lat: 10, lng: 12 } },
        ],
      }),
    ]);

    helper.setQueryParameter('aroundLatLng', '10,12');

    widget.init!(
      createInitOptions({
        state: helper.state,
        helper,
      })
    );

    widget.render!(
      createRenderOptions({
        results,
        helper,
      })
    );

    lastRenderArgs(render).refine({ northEast, southWest });

    widget.render!(
      createRenderOptions({
        results,
        helper,
      })
    );

    expect(render).toHaveBeenCalledTimes(3);
    expect(lastRenderArgs(render).hasMapMoveSinceLastRefine()).toBe(false);
    expect(lastRenderArgs(render).isRefinedWithMap()).toBe(true);

    lastRenderArgs(render).setMapMoveSinceLastRefine();

    expect(render).toHaveBeenCalledTimes(4);
    expect(lastRenderArgs(render).hasMapMoveSinceLastRefine()).toBe(true);
    expect(lastRenderArgs(render).isRefinedWithMap()).toBe(true);

    helper.setQueryParameter('aroundLatLng', '10,12');

    widget.render!(
      createRenderOptions({
        results,
        helper,
      })
    );

    expect(render).toHaveBeenCalledTimes(5);
    expect(lastRenderArgs(render).hasMapMoveSinceLastRefine()).toBe(true);
    expect(lastRenderArgs(render).isRefinedWithMap()).toBe(true);
  });

  it('expect to reset the map state when boundingBox is reset', () => {
    const render = jest.fn();
    const unmount = jest.fn();

    const customGeoSearch = connectGeoSearch(render, unmount);
    const widget = customGeoSearch({});

    const helper = createFakeHelper();

    const northEast = {
      lat: 12,
      lng: 10,
    };

    const southWest = {
      lat: 40,
      lng: 42,
    };

    const results = new SearchResults(helper.state, [
      createSingleSearchResponse({
        hits: [
          { objectID: '123', _geoloc: { lat: 10, lng: 12 } },
          { objectID: '456' },
          { objectID: '789', _geoloc: { lat: 10, lng: 12 } },
        ],
      }),
    ]);

    // @ts-ignore
    helper.setQueryParameter('insideBoundingBox', '10,12,14,16');

    widget.init!(
      createInitOptions({
        state: helper.state,
        helper,
      })
    );

    widget.render!(
      createRenderOptions({
        results,
        helper,
      })
    );

    lastRenderArgs(render).refine({ northEast, southWest });

    widget.render!(
      createRenderOptions({
        results,
        helper,
      })
    );

    expect(render).toHaveBeenCalledTimes(3);
    expect(lastRenderArgs(render).hasMapMoveSinceLastRefine()).toBe(false);
    expect(lastRenderArgs(render).isRefinedWithMap()).toBe(true);

    lastRenderArgs(render).setMapMoveSinceLastRefine();

    expect(render).toHaveBeenCalledTimes(4);
    expect(lastRenderArgs(render).hasMapMoveSinceLastRefine()).toBe(true);
    expect(lastRenderArgs(render).isRefinedWithMap()).toBe(true);

    helper.setQueryParameter('insideBoundingBox', undefined);

    widget.render!(
      createRenderOptions({
        results,
        helper,
      })
    );

    expect(render).toHaveBeenCalledTimes(5);
    expect(lastRenderArgs(render).hasMapMoveSinceLastRefine()).toBe(false);
    expect(lastRenderArgs(render).isRefinedWithMap()).toBe(false);
  });

  it('expect to not reset the map state when boundingBox is preserve', () => {
    const render = jest.fn();
    const unmount = jest.fn();

    const customGeoSearch = connectGeoSearch(render, unmount);
    const widget = customGeoSearch({});

    const helper = createFakeHelper();

    const northEast = {
      lat: 12,
      lng: 10,
    };

    const southWest = {
      lat: 40,
      lng: 42,
    };

    const results = new SearchResults(helper.state, [
      createSingleSearchResponse({
        hits: [
          { objectID: '123', _geoloc: { lat: 10, lng: 12 } },
          { objectID: '456' },
          { objectID: '789', _geoloc: { lat: 10, lng: 12 } },
        ],
      }),
    ]);

    // @ts-ignore
    helper.setQueryParameter('insideBoundingBox', '10,12,14,16');

    widget.init!(
      createInitOptions({
        state: helper.state,
        helper,
      })
    );

    widget.render!(
      createRenderOptions({
        results,
        helper,
      })
    );

    lastRenderArgs(render).refine({ northEast, southWest });

    widget.render!(
      createRenderOptions({
        results,
        helper,
      })
    );

    expect(render).toHaveBeenCalledTimes(3);
    expect(lastRenderArgs(render).hasMapMoveSinceLastRefine()).toBe(false);
    expect(lastRenderArgs(render).isRefinedWithMap()).toBe(true);

    lastRenderArgs(render).setMapMoveSinceLastRefine();

    expect(render).toHaveBeenCalledTimes(4);
    expect(lastRenderArgs(render).hasMapMoveSinceLastRefine()).toBe(true);
    expect(lastRenderArgs(render).isRefinedWithMap()).toBe(true);

    // @ts-ignore
    helper.setQueryParameter('insideBoundingBox', '12,14,16,18');

    widget.render!(
      createRenderOptions({
        results,
        helper,
      })
    );

    expect(render).toHaveBeenCalledTimes(5);
    expect(lastRenderArgs(render).hasMapMoveSinceLastRefine()).toBe(true);
    expect(lastRenderArgs(render).isRefinedWithMap()).toBe(true);
  });

  describe('currentRefinement', () => {
    it('expect to render with currentRefinement from a string', () => {
      const render = jest.fn();
      const unmount = jest.fn();

      const customGeoSearch = connectGeoSearch(render, unmount);
      const widget = customGeoSearch({});
      const helper = createFakeHelper();

      // Simulate the configuration or external setter (like URLSync)
      // @ts-ignore
      helper.setQueryParameter('insideBoundingBox', '10,12,12,14');

      widget.init!(
        createInitOptions({
          helper,
          state: helper.state,
        })
      );

      expect(render).toHaveBeenCalledTimes(1);
      expect(lastRenderArgs(render).isRefinedWithMap()).toBe(true);
      expect(lastRenderArgs(render).currentRefinement).toEqual({
        northEast: {
          lat: 10,
          lng: 12,
        },
        southWest: {
          lat: 12,
          lng: 14,
        },
      });

      widget.render!(
        createRenderOptions({
          results: new SearchResults(helper.state, [
            createSingleSearchResponse({
              hits: [],
            }),
          ]),
          helper,
        })
      );

      expect(render).toHaveBeenCalledTimes(2);
      expect(lastRenderArgs(render).isRefinedWithMap()).toBe(true);
      expect(lastRenderArgs(render).currentRefinement).toEqual({
        northEast: {
          lat: 10,
          lng: 12,
        },
        southWest: {
          lat: 12,
          lng: 14,
        },
      });

      // Simulate the configuration or external setter (like URLSync)
      helper.setQueryParameter('insideBoundingBox', undefined);

      widget.render!(
        createRenderOptions({
          results: new SearchResults(helper.state, [
            createSingleSearchResponse({
              hits: [],
            }),
          ]),
          helper,
        })
      );

      expect(render).toHaveBeenCalledTimes(3);
      expect(lastRenderArgs(render).currentRefinement).toBeUndefined();
    });

    it('expect to render with currentRefinement from an array', () => {
      const render = jest.fn();
      const unmount = jest.fn();

      const customGeoSearch = connectGeoSearch(render, unmount);
      const widget = customGeoSearch({});
      const helper = createFakeHelper();

      helper.setQueryParameter('insideBoundingBox', [[10, 12, 12, 14]]);

      widget.init!(
        createInitOptions({
          helper,
          state: helper.state,
        })
      );

      expect(render).toHaveBeenCalledTimes(1);
      expect(lastRenderArgs(render).isRefinedWithMap()).toBe(true);
      expect(lastRenderArgs(render).currentRefinement).toEqual({
        northEast: {
          lat: 10,
          lng: 12,
        },
        southWest: {
          lat: 12,
          lng: 14,
        },
      });

      widget.render!(
        createRenderOptions({
          results: new SearchResults(helper.state, [
            createSingleSearchResponse({
              hits: [],
            }),
          ]),
          helper,
        })
      );

      expect(render).toHaveBeenCalledTimes(2);
      expect(lastRenderArgs(render).isRefinedWithMap()).toBe(true);
      expect(lastRenderArgs(render).currentRefinement).toEqual({
        northEast: {
          lat: 10,
          lng: 12,
        },
        southWest: {
          lat: 12,
          lng: 14,
        },
      });

      // Simulate the configuration or external setter (like URLSync)
      helper.setQueryParameter('insideBoundingBox', undefined);

      widget.render!(
        createRenderOptions({
          results: new SearchResults(helper.state, [
            createSingleSearchResponse({
              hits: [],
            }),
          ]),
          helper,
        })
      );

      expect(render).toHaveBeenCalledTimes(3);
      expect(lastRenderArgs(render).currentRefinement).toBeUndefined();
    });
  });

  describe('refine', () => {
    it('expect to refine with the given bounds during init', () => {
      const render = jest.fn();
      const unmount = jest.fn();

      const customGeoSearch = connectGeoSearch(render, unmount);
      const widget = customGeoSearch({});

      const helper = createFakeHelper();

      const northEast = {
        lat: 12,
        lng: 10,
      };

      const southWest = {
        lat: 40,
        lng: 42,
      };

      const results = new SearchResults(helper.state, [
        createSingleSearchResponse({
          hits: [{ objectID: '123', _geoloc: { lat: 10, lng: 12 } }],
        }),
      ]);

      widget.init!(
        createInitOptions({
          state: helper.state,
          helper,
        })
      );

      expect(render).toHaveBeenCalledTimes(1);
      expect(lastRenderArgs(render).hasMapMoveSinceLastRefine()).toBe(false);
      expect(lastRenderArgs(render).isRefinedWithMap()).toBe(false);
      expect(helper.state.insideBoundingBox).toBe(undefined);
      expect(helper.search).not.toHaveBeenCalled();

      lastRenderArgs(render).refine({ northEast, southWest });

      widget.render!(
        createRenderOptions({
          results,
          helper,
        })
      );

      expect(render).toHaveBeenCalledTimes(2);
      expect(lastRenderArgs(render).hasMapMoveSinceLastRefine()).toBe(false);
      expect(lastRenderArgs(render).isRefinedWithMap()).toBe(true);
      expect(helper.state.insideBoundingBox).toEqual('12,10,40,42');
      expect(helper.search).toHaveBeenCalledTimes(1);
    });

    it('expect to refine with the given bounds during render', () => {
      const render = jest.fn();
      const unmount = jest.fn();

      const customGeoSearch = connectGeoSearch(render, unmount);
      const widget = customGeoSearch({});

      const helper = createFakeHelper();

      const northEast = {
        lat: 12,
        lng: 10,
      };

      const southWest = {
        lat: 40,
        lng: 42,
      };

      const results = new SearchResults(helper.state, [
        createSingleSearchResponse({
          hits: [{ objectID: '123', _geoloc: { lat: 10, lng: 12 } }],
        }),
      ]);

      widget.init!(
        createInitOptions({
          state: helper.state,
          helper,
        })
      );

      widget.render!(
        createRenderOptions({
          results,
          helper,
        })
      );

      expect(render).toHaveBeenCalledTimes(2);
      expect(lastRenderArgs(render).hasMapMoveSinceLastRefine()).toBe(false);
      expect(lastRenderArgs(render).isRefinedWithMap()).toBe(false);
      expect(helper.state.insideBoundingBox).toBe(undefined);
      expect(helper.search).not.toHaveBeenCalled();

      lastRenderArgs(render).refine({ northEast, southWest });

      widget.render!(
        createRenderOptions({
          results,
          helper,
        })
      );

      expect(render).toHaveBeenCalledTimes(3);
      expect(lastRenderArgs(render).hasMapMoveSinceLastRefine()).toBe(false);
      expect(lastRenderArgs(render).isRefinedWithMap()).toBe(true);
      expect(helper.state.insideBoundingBox).toEqual('12,10,40,42');
      expect(helper.search).toHaveBeenCalledTimes(1);
    });
  });

  describe('clearMapRefinement', () => {
    it('expect to clear the map refinement after the map has been refine during init', () => {
      const render = jest.fn();
      const unmount = jest.fn();

      const customGeoSearch = connectGeoSearch(render, unmount);
      const widget = customGeoSearch({});

      const helper = createFakeHelper();

      const northEast = {
        lat: 12,
        lng: 10,
      };

      const southWest = {
        lat: 40,
        lng: 42,
      };

      const results = new SearchResults(helper.state, [
        createSingleSearchResponse({
          hits: [{ objectID: '123', _geoloc: { lat: 10, lng: 12 } }],
        }),
      ]);

      widget.init!(
        createInitOptions({
          state: helper.state,
          helper,
        })
      );

      expect(render).toHaveBeenCalledTimes(1);
      expect(lastRenderArgs(render).hasMapMoveSinceLastRefine()).toBe(false);
      expect(lastRenderArgs(render).isRefinedWithMap()).toBe(false);
      expect(helper.state.insideBoundingBox).toBe(undefined);
      expect(helper.search).not.toHaveBeenCalled();

      lastRenderArgs(render).refine({ northEast, southWest });

      widget.render!(
        createRenderOptions({
          results,
          helper,
        })
      );

      expect(render).toHaveBeenCalledTimes(2);
      expect(lastRenderArgs(render).hasMapMoveSinceLastRefine()).toBe(false);
      expect(lastRenderArgs(render).isRefinedWithMap()).toBe(true);
      expect(helper.state.insideBoundingBox).toEqual('12,10,40,42');
      expect(helper.search).toHaveBeenCalledTimes(1);

      lastRenderArgs(render).clearMapRefinement();

      widget.render!(
        createRenderOptions({
          results,
          helper,
        })
      );

      expect(render).toHaveBeenCalledTimes(3);
      expect(lastRenderArgs(render).hasMapMoveSinceLastRefine()).toBe(false);
      expect(lastRenderArgs(render).isRefinedWithMap()).toBe(false);
      expect(helper.state.insideBoundingBox).toBe(undefined);
      expect(helper.search).toHaveBeenCalledTimes(2);
    });

    it('expect to clear the map refinement after the map has been refine during render', () => {
      const render = jest.fn();
      const unmount = jest.fn();

      const customGeoSearch = connectGeoSearch(render, unmount);
      const widget = customGeoSearch({});

      const helper = createFakeHelper();

      const northEast = {
        lat: 12,
        lng: 10,
      };

      const southWest = {
        lat: 40,
        lng: 42,
      };

      const results = new SearchResults(helper.state, [
        createSingleSearchResponse({
          hits: [{ objectID: '123', _geoloc: { lat: 10, lng: 12 } }],
        }),
      ]);

      widget.init!(
        createInitOptions({
          state: helper.state,
          helper,
        })
      );

      widget.render!(
        createRenderOptions({
          results,
          helper,
        })
      );

      expect(render).toHaveBeenCalledTimes(2);
      expect(lastRenderArgs(render).hasMapMoveSinceLastRefine()).toBe(false);
      expect(lastRenderArgs(render).isRefinedWithMap()).toBe(false);
      expect(helper.state.insideBoundingBox).toBe(undefined);
      expect(helper.search).not.toHaveBeenCalled();

      lastRenderArgs(render).refine({ northEast, southWest });

      widget.render!(
        createRenderOptions({
          results,
          helper,
        })
      );

      expect(render).toHaveBeenCalledTimes(3);
      expect(lastRenderArgs(render).hasMapMoveSinceLastRefine()).toBe(false);
      expect(lastRenderArgs(render).isRefinedWithMap()).toBe(true);
      expect(helper.state.insideBoundingBox).toEqual('12,10,40,42');
      expect(helper.search).toHaveBeenCalledTimes(1);

      lastRenderArgs(render).clearMapRefinement();

      widget.render!(
        createRenderOptions({
          results,
          helper,
        })
      );

      expect(render).toHaveBeenCalledTimes(4);
      expect(lastRenderArgs(render).hasMapMoveSinceLastRefine()).toBe(false);
      expect(lastRenderArgs(render).isRefinedWithMap()).toBe(false);
      expect(helper.state.insideBoundingBox).toBe(undefined);
      expect(helper.search).toHaveBeenCalledTimes(2);
    });
  });

  describe('toggleRefineOnMapMove', () => {
    it('expect to toggle refine on map move during init', () => {
      const render = jest.fn();
      const unmount = jest.fn();

      const customGeoSearch = connectGeoSearch(render, unmount);
      const widget = customGeoSearch({});

      const helper = createFakeHelper();

      widget.init!(
        createInitOptions({
          state: helper.state,
          helper,
        })
      );

      expect(render).toHaveBeenCalledTimes(1);
      expect(lastRenderArgs(render).isRefineOnMapMove()).toBe(true);

      lastRenderArgs(render).toggleRefineOnMapMove();

      expect(render).toHaveBeenCalledTimes(1);
      expect(lastRenderArgs(render).isRefineOnMapMove()).toBe(false);

      widget.render!(
        createRenderOptions({
          results: new SearchResults(helper.state, [
            createSingleSearchResponse({
              hits: [{ objectID: '123', _geoloc: { lat: 10, lng: 12 } }],
            }),
          ]),
          helper,
        })
      );

      expect(render).toHaveBeenCalledTimes(2);
      expect(lastRenderArgs(render).isRefineOnMapMove()).toBe(false);
      expect(firstRenderArgs(render).toggleRefineOnMapMove).toBe(
        lastRenderArgs(render).toggleRefineOnMapMove
      );
    });

    it('expect to toggle refine on map move during render', () => {
      const render = jest.fn();
      const unmount = jest.fn();

      const customGeoSearch = connectGeoSearch(render, unmount);
      const widget = customGeoSearch({});

      const helper = createFakeHelper();

      widget.init!(
        createInitOptions({
          state: helper.state,
          helper,
        })
      );

      widget.render!(
        createRenderOptions({
          results: new SearchResults(helper.state, [
            createSingleSearchResponse({
              hits: [{ objectID: '123', _geoloc: { lat: 10, lng: 12 } }],
            }),
          ]),
          helper,
        })
      );

      expect(render).toHaveBeenCalledTimes(2);
      expect(lastRenderArgs(render).isRefineOnMapMove()).toBe(true);

      lastRenderArgs(render).toggleRefineOnMapMove();

      expect(render).toHaveBeenCalledTimes(3);
      expect(lastRenderArgs(render).isRefineOnMapMove()).toBe(false);
      expect(firstRenderArgs(render).toggleRefineOnMapMove).toBe(
        lastRenderArgs(render).toggleRefineOnMapMove
      );
    });
  });

  describe('setMapMoveSinceLastRefine', () => {
    it('expect to set map move during init', () => {
      const render = jest.fn();
      const unmount = jest.fn();

      const customGeoSearch = connectGeoSearch(render, unmount);
      const widget = customGeoSearch({});

      widget.init!(createInitOptions());

      expect(render).toHaveBeenCalledTimes(1);
      expect(lastRenderArgs(render).hasMapMoveSinceLastRefine()).toBe(false);

      lastRenderArgs(render).setMapMoveSinceLastRefine();

      expect(render).toHaveBeenCalledTimes(1);
      expect(lastRenderArgs(render).hasMapMoveSinceLastRefine()).toBe(true);

      widget.render!(
        createRenderOptions({
          results: new SearchResults(createFakeHelper().state, [
            createSingleSearchResponse({
              hits: [{ objectID: '123', _geoloc: { lat: 10, lng: 12 } }],
            }),
          ]),
        })
      );

      expect(render).toHaveBeenCalledTimes(2);
      expect(lastRenderArgs(render).hasMapMoveSinceLastRefine()).toBe(true);
      expect(firstRenderArgs(render).setMapMoveSinceLastRefine).toBe(
        lastRenderArgs(render).setMapMoveSinceLastRefine
      );
    });

    it('expect to set map move during render', () => {
      const render = jest.fn();
      const unmount = jest.fn();

      const customGeoSearch = connectGeoSearch(render, unmount);
      const widget = customGeoSearch({});

      const helper = createFakeHelper();

      const results = new SearchResults(helper.state, [
        createSingleSearchResponse(
          createSingleSearchResponse({
            hits: [{ objectID: '123', _geoloc: { lat: 10, lng: 12 } }],
          })
        ),
      ]);

      widget.init!(
        createInitOptions({
          state: helper.state,
          helper,
        })
      );

      widget.render!(
        createRenderOptions({
          results,
          helper,
        })
      );

      expect(render).toHaveBeenCalledTimes(2);
      expect(lastRenderArgs(render).hasMapMoveSinceLastRefine()).toBe(false);

      lastRenderArgs(render).setMapMoveSinceLastRefine();

      expect(render).toHaveBeenCalledTimes(3);
      expect(lastRenderArgs(render).hasMapMoveSinceLastRefine()).toBe(true);
      expect(firstRenderArgs(render).setMapMoveSinceLastRefine).toBe(
        lastRenderArgs(render).setMapMoveSinceLastRefine
      );
    });

    it('expect to set map move during render & trigger render only when value change', () => {
      const render = jest.fn();
      const unmount = jest.fn();

      const customGeoSearch = connectGeoSearch(render, unmount);
      const widget = customGeoSearch({});

      const helper = createFakeHelper();

      const results = new SearchResults(helper.state, [
        createSingleSearchResponse(
          createSingleSearchResponse({
            hits: [{ objectID: '123', _geoloc: { lat: 10, lng: 12 } }],
          })
        ),
      ]);

      widget.init!(
        createInitOptions({
          state: helper.state,
          helper,
        })
      );

      widget.render!(
        createRenderOptions({
          results,
          helper,
        })
      );

      expect(render).toHaveBeenCalledTimes(2);
      expect(lastRenderArgs(render).hasMapMoveSinceLastRefine()).toBe(false);

      lastRenderArgs(render).setMapMoveSinceLastRefine();

      expect(render).toHaveBeenCalledTimes(3);
      expect(lastRenderArgs(render).hasMapMoveSinceLastRefine()).toBe(true);

      lastRenderArgs(render).setMapMoveSinceLastRefine();

      expect(render).toHaveBeenCalledTimes(3);
      expect(lastRenderArgs(render).hasMapMoveSinceLastRefine()).toBe(true);
      expect(firstRenderArgs(render).setMapMoveSinceLastRefine).toBe(
        lastRenderArgs(render).setMapMoveSinceLastRefine
      );
    });
  });

  describe('dispose', () => {
    it('expect reset insideBoundingBox', () => {
      const render = jest.fn();
      const unmount = jest.fn();

      const customGeoSearch = connectGeoSearch(render, unmount);
      const widget = customGeoSearch({});
      const helper = createFakeHelper();

      // @ts-ignore
      helper.setQueryParameter('insideBoundingBox', '10,12,12,14');

      const expectation = new SearchParameters({ index: '' });

      const actual = widget.dispose!(
        createDisposeOptions({ state: helper.state })
      );

      expect(unmount).toHaveBeenCalled();
      expect(actual).toEqual(expectation);
    });

    it('does not throw without the unmount function', () => {
      const render = () => {};
      const customGeoSearch = connectGeoSearch(render);
      const widget = customGeoSearch({});
      expect(() => widget.dispose!(createDisposeOptions())).not.toThrow();
    });
  });

  describe('getWidgetUiState', () => {
    it('expect to return the uiState unmodified if no boundingBox is selected', () => {
      const [widget, helper] = getInitializedWidget();

      const uiStateBefore = {};
      const uiStateAfter = widget.getWidgetUiState(uiStateBefore, {
        searchParameters: helper.state,
        helper,
      });

      expect(uiStateAfter).toBe(uiStateBefore);
    });

    it('expect to return the uiState with an entry equal to the boundingBox', () => {
      const [widget, helper, refine] = getInitializedWidget();

      refine({
        northEast: { lat: 10, lng: 12 },
        southWest: { lat: 12, lng: 14 },
      });

      const uiStateBefore = {};
      const uiStateAfter = widget.getWidgetUiState(uiStateBefore, {
        searchParameters: helper.state,
        helper,
      });

      expect(uiStateAfter).toEqual({
        geoSearch: {
          boundingBox: '10,12,12,14',
        },
      });
    });

    it('expect to return the same uiState instance if the value is already there', () => {
      const [widget, helper, refine] = getInitializedWidget();

      refine({
        northEast: { lat: 10, lng: 12 },
        southWest: { lat: 12, lng: 14 },
      });

      const uiStateBefore = widget.getWidgetUiState(
        {},
        {
          searchParameters: helper.state,
          helper,
        }
      );

      const uiStateAfter = widget.getWidgetUiState(uiStateBefore, {
        searchParameters: helper.state,
        helper,
      });

      expect(uiStateAfter).toBe(uiStateBefore);
    });
  });

  describe('getWidgetSearchParameters', () => {
    it('expect to return the same SearchParameters if the uiState is empty', () => {
      const [widget, helper] = getInitializedWidget();

      const uiState = {};
      const searchParametersBefore = SearchParameters.make(helper.state);
      const searchParametersAfter = widget.getWidgetSearchParameters(
        searchParametersBefore,
        { uiState }
      );

      expect(searchParametersAfter).toBe(searchParametersBefore);
    });

    it('expect to return the same SearchParameters if the geoSearch attribute is empty', () => {
      const [widget, helper] = getInitializedWidget();

      const uiState = {
        geoSearch: {},
      };

      const searchParametersBefore = SearchParameters.make(helper.state);
      const searchParametersAfter = widget.getWidgetSearchParameters(
        searchParametersBefore,
        // @ts-expect-error wrong state check
        { uiState }
      );

      expect(searchParametersAfter).toBe(searchParametersBefore);
    });

    it('expect to return the SearchParameters with the boundingBox value from the uiState', () => {
      const [widget, helper] = getInitializedWidget();

      const uiState = {
        geoSearch: {
          boundingBox: '10,12,12,14',
        },
      };

      const searchParametersBefore = SearchParameters.make(helper.state);
      const searchParametersAfter = widget.getWidgetSearchParameters(
        searchParametersBefore,
        { uiState }
      );

      expect(searchParametersAfter.insideBoundingBox).toBe('10,12,12,14');
    });

    it('expect to remove the boundingBox from the SearchParameters if the value is not in the uiState', () => {
      const [widget, helper, refine] = getInitializedWidget();

      refine({
        northEast: { lat: 10, lng: 12 },
        southWest: { lat: 12, lng: 14 },
      });

      const uiState = {};
      const searchParametersBefore = SearchParameters.make(helper.state);
      const searchParametersAfter = widget.getWidgetSearchParameters(
        searchParametersBefore,
        { uiState }
      );

      expect(searchParametersAfter.insideBoundingBox).toBeUndefined();
    });
  });

  describe('getWidgetRenderState', () => {
    it('gives empty items without results', () => {
      const [widget, helper] = getInitializedWidget();

      expect(
        widget.getWidgetRenderState(
          createRenderOptions({ helper, results: undefined })
        ).items
      ).toEqual([]);
    });

    it('gives items from results', () => {
      const { widget, helper, results } = getRenderedWidget();

      expect(
        widget.getWidgetRenderState(createRenderOptions({ helper, results }))
          .items
      ).toMatchInlineSnapshot(`
        [
          {
            "__position": 0,
            "__queryID": "test-query-id",
            "_geoloc": {
              "lat": 10,
              "lng": 12,
            },
            "objectID": "123",
          },
          {
            "__position": 1,
            "__queryID": "test-query-id",
            "_geoloc": {
              "lat": 12,
              "lng": 14,
            },
            "objectID": "456",
          },
          {
            "__position": 2,
            "__queryID": "test-query-id",
            "_geoloc": {
              "lat": 14,
              "lng": 16,
            },
            "objectID": "789",
          },
        ]
      `);
    });

    it('gives all render functions without refinement', () => {
      const [widget] = getInitializedWidget();

      expect(widget.getWidgetRenderState(createInitOptions())).toEqual({
        position: undefined,
        currentRefinement: undefined,
        items: [],
        clearMapRefinement: expect.any(Function),
        hasMapMoveSinceLastRefine: expect.any(Function),
        isRefineOnMapMove: expect.any(Function),
        isRefinedWithMap: expect.any(Function),
        refine: expect.any(Function),
        sendEvent: expect.any(Function),
        setMapMoveSinceLastRefine: expect.any(Function),
        toggleRefineOnMapMove: expect.any(Function),
        widgetParams: {},
      });
    });

    it('gives all render functions with refinement', () => {
      const [widget, helper] = getInitializedWidget();
      helper.setQueryParameter('aroundLatLng', '10, 12');
      // @ts-ignore
      helper.setQueryParameter('insideBoundingBox', '10,12,11,2');

      expect(
        widget.getWidgetRenderState(createInitOptions({ helper }))
      ).toEqual({
        currentRefinement: {
          northEast: {
            lat: 10,
            lng: 12,
          },
          southWest: {
            lat: 11,
            lng: 2,
          },
        },
        position: {
          lat: 10,
          lng: 12,
        },
        items: [],
        refine: expect.any(Function),
        clearMapRefinement: expect.any(Function),
        hasMapMoveSinceLastRefine: expect.any(Function),
        isRefineOnMapMove: expect.any(Function),
        isRefinedWithMap: expect.any(Function),
        setMapMoveSinceLastRefine: expect.any(Function),
        toggleRefineOnMapMove: expect.any(Function),
        sendEvent: expect.any(Function),
        widgetParams: {},
      });
    });
  });

  describe('getRenderState', () => {
    it('merges with existing renderState', () => {
      const renderState = {
        something: {},
        geoSearch: false,
      };

      const [widget, helper] = getInitializedWidget();

      // @ts-expect-error wrong renderState for the test's purpose
      expect(widget.getRenderState(renderState, { helper })).toEqual({
        something: {},
        geoSearch: {
          position: undefined,
          currentRefinement: undefined,
          items: [],
          clearMapRefinement: expect.any(Function),
          hasMapMoveSinceLastRefine: expect.any(Function),
          isRefineOnMapMove: expect.any(Function),
          isRefinedWithMap: expect.any(Function),
          refine: expect.any(Function),
          sendEvent: expect.any(Function),
          setMapMoveSinceLastRefine: expect.any(Function),
          toggleRefineOnMapMove: expect.any(Function),
          widgetParams: {},
        },
      });
    });
  });

  describe('insights', () => {
    it('sends view event when hits are rendered', () => {
      const { instantSearchInstance } = getRenderedWidget();
      expect(instantSearchInstance.sendEventToInsights).toHaveBeenCalledTimes(
        1
      );
      expect(instantSearchInstance.sendEventToInsights).toHaveBeenCalledWith({
        eventType: 'view',
        hits: [
          {
            __position: 0,
            __queryID: 'test-query-id',
            _geoloc: {
              lat: 10,
              lng: 12,
            },
            objectID: '123',
          },
          {
            __position: 1,
            __queryID: 'test-query-id',
            _geoloc: {
              lat: 12,
              lng: 14,
            },
            objectID: '456',
          },
          {
            __position: 2,
            __queryID: 'test-query-id',
            _geoloc: {
              lat: 14,
              lng: 16,
            },
            objectID: '789',
          },
        ],
        insightsMethod: 'viewedObjectIDs',
        payload: {
          eventName: 'Hits Viewed',
          index: 'indexName',
          objectIDs: ['123', '456', '789'],
        },
        widgetType: 'ais.geoSearch',
      });
    });

    it('does not send view event when hits are stalled rendered', async () => {
      const renderFn = jest.fn();
      const makeWidget = connectGeoSearch(renderFn);
      const widget = makeWidget({});

      const hits = [
        {
          objectID: '123',
          _geoloc: { lat: 10, lng: 12 },
          __position: 0,
          __queryID: 'test-query-id',
        },
        {
          objectID: '456',
          _geoloc: { lat: 12, lng: 14 },
          __position: 1,
          __queryID: 'test-query-id',
        },
        {
          objectID: '789',
          _geoloc: { lat: 14, lng: 16 },
          __position: 2,
          __queryID: 'test-query-id',
        },
      ];

      const searchClient = createSearchClient({
        search<T>() {
          return Promise.resolve(
            createMultiSearchResponse(
              createSingleSearchResponse({
                hits: hits as unknown as SearchResponse<T>['hits'],
              })
            )
          );
        },
      });

      const instantSearchInstance = instantsearch({
        searchClient,
        stalledSearchDelay: 1,
        indexName: 'indexName',
      });
      instantSearchInstance.sendEventToInsights = jest.fn();
      instantSearchInstance.start();

      instantSearchInstance.addWidgets([widget]);

      await wait(0);

      expect(instantSearchInstance.sendEventToInsights).toHaveBeenCalledTimes(
        1
      );

      // this client never resolves, thus search is stalled
      searchClient.search = () => new Promise(() => {});
      instantSearchInstance.scheduleSearch();
      await wait(10); // stalled search + a margin of error

      expect(instantSearchInstance.sendEventToInsights).toHaveBeenCalledTimes(
        1
      );
    });

    it('sends click event', () => {
      const { instantSearchInstance, render, hits } = getRenderedWidget();
      expect(instantSearchInstance.sendEventToInsights).toHaveBeenCalledTimes(
        1
      ); // view event by render

      const { sendEvent } = render.mock.calls[render.mock.calls.length - 1][0];
      sendEvent('click', hits[0], 'Location Added');
      expect(instantSearchInstance.sendEventToInsights).toHaveBeenCalledTimes(
        2
      );
      expect(instantSearchInstance.sendEventToInsights).toHaveBeenCalledWith({
        eventType: 'click',
        hits: [
          {
            __position: 0,
            __queryID: 'test-query-id',
            _geoloc: {
              lat: 10,
              lng: 12,
            },
            objectID: '123',
          },
        ],
        insightsMethod: 'clickedObjectIDsAfterSearch',
        payload: {
          eventName: 'Location Added',
          index: 'indexName',
          objectIDs: ['123'],
          positions: [0],
          queryID: 'test-query-id',
        },
        widgetType: 'ais.geoSearch',
      });
    });

    it('sends conversion event', () => {
      const { instantSearchInstance, render, hits } = getRenderedWidget();
      expect(instantSearchInstance.sendEventToInsights).toHaveBeenCalledTimes(
        1
      ); // view event by render

      const { sendEvent } = render.mock.calls[render.mock.calls.length - 1][0];
      sendEvent('conversion', hits[0], 'Location Saved');
      expect(instantSearchInstance.sendEventToInsights).toHaveBeenCalledTimes(
        2
      );
      expect(
        instantSearchInstance.sendEventToInsights
      ).toHaveBeenLastCalledWith({
        eventType: 'conversion',
        hits: [
          {
            __position: 0,
            __queryID: 'test-query-id',
            _geoloc: {
              lat: 10,
              lng: 12,
            },
            objectID: '123',
          },
        ],
        insightsMethod: 'convertedObjectIDsAfterSearch',
        payload: {
          eventName: 'Location Saved',
          index: 'indexName',
          objectIDs: ['123'],
          queryID: 'test-query-id',
        },
        widgetType: 'ais.geoSearch',
      });
    });
  });
});
