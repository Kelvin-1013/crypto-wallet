import React from 'react';
import configureMockStore from 'redux-mock-store';
import thunk from 'redux-thunk';
import nock from 'nock';
import { MemoryRouter } from 'react-router-dom';

import { setBackgroundConnection } from '../../store/background-connection';
import { renderWithProvider, MOCKS, CONSTANTS } from '../../../test/jest';
import { createBridgeMockStore } from '../../../test/jest/mock-store';
import {
  CROSS_CHAIN_SWAP_ROUTE,
  PREPARE_SWAP_ROUTE,
} from '../../helpers/constants/routes';
import CrossChainSwap from '.';

const mockResetBridgeState = jest.fn();
const middleware = [thunk];
setBackgroundConnection({
  resetPostFetchState: jest.fn(),
  resetSwapsState: jest.fn(),
  setSwapsLiveness: jest.fn(() => true),
  setSwapsTokens: jest.fn(),
  setSwapsTxGasPrice: jest.fn(),
  gasFeeStartPolling: jest.fn().mockResolvedValue('pollingToken'),
  gasFeeStopPollingByPollingToken: jest.fn(),
  getNetworkConfigurationByNetworkClientId: jest
    .fn()
    .mockResolvedValue({ chainId: '0x1' }),
  setBridgeFeatureFlags: jest.fn(),
  selectSrcNetwork: jest.fn(),
  resetState: () => mockResetBridgeState(),
  tokenBalancesStartPolling: jest.fn().mockResolvedValue('pollingToken'),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
} as any);

describe('Bridge', () => {
  beforeEach(() => {
    nock(CONSTANTS.METASWAP_BASE_URL)
      .get('/networks/1/topAssets')
      .reply(200, MOCKS.TOP_ASSETS_GET_RESPONSE);

    nock(CONSTANTS.METASWAP_BASE_URL)
      .get('/refreshTime')
      .reply(200, MOCKS.REFRESH_TIME_GET_RESPONSE);

    nock(CONSTANTS.METASWAP_BASE_URL)
      .get('/networks/1/aggregatorMetadata')
      .reply(200, MOCKS.AGGREGATOR_METADATA_GET_RESPONSE);

    nock(CONSTANTS.GAS_API_URL)
      .get('/networks/1/gasPrices')
      .reply(200, MOCKS.GAS_PRICES_GET_RESPONSE);

    nock(CONSTANTS.METASWAP_BASE_URL)
      .get('/networks/1/tokens')
      .reply(200, MOCKS.TOKENS_GET_RESPONSE);

    nock(CONSTANTS.METASWAP_BASE_URL)
      .get('/networks/1/tokens?includeBlockedTokens=true')
      .reply(200, MOCKS.TOKENS_GET_RESPONSE);

    nock(CONSTANTS.METASWAP_BASE_URL)
      .get('/featureFlags')
      .reply(200, MOCKS.createFeatureFlagsResponse());
  });

  afterAll(() => {
    nock.cleanAll();
  });

  it('renders the component with initial props', async () => {
    const swapsMockStore = createBridgeMockStore({
      featureFlagOverrides: {
        extensionConfig: { support: true },
      },
      metamaskStateOverrides: {
        useExternalServices: true,
      },
    });
    const store = configureMockStore(middleware)(swapsMockStore);

    const { container, getByText } = renderWithProvider(
      <MemoryRouter
        initialEntries={[CROSS_CHAIN_SWAP_ROUTE + PREPARE_SWAP_ROUTE]}
      >
        <CrossChainSwap />
      </MemoryRouter>,
      store,
    );

    expect(getByText('Bridge')).toBeInTheDocument();
    expect(container).toMatchSnapshot();
    expect(mockResetBridgeState).toHaveBeenCalledTimes(1);
  });
});