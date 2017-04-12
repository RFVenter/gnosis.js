'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Config = exports.defaultConfig = undefined;

var _keys = require('babel-runtime/core-js/object/keys');

var _keys2 = _interopRequireDefault(_keys);

var _promise = require('babel-runtime/core-js/promise');

var _promise2 = _interopRequireDefault(_promise);

var _classCallCheck2 = require('babel-runtime/helpers/classCallCheck');

var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);

exports.initialize = initialize;

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var _bignumber = require('bignumber.js');

var _bignumber2 = _interopRequireDefault(_bignumber);

var _web = require('web3');

var _web2 = _interopRequireDefault(_web);

var _callbacks = require('./lib/callbacks');

var _rxWeb = require('./lib/rx-web3');

var _rxWeb2 = _interopRequireDefault(_rxWeb);

var _abi = require('./abi');

var abi = _interopRequireWildcard(_abi);

var _web3ProviderEngine = require('web3-provider-engine');

var _web3ProviderEngine2 = _interopRequireDefault(_web3ProviderEngine);

var _rpc = require('web3-provider-engine/subproviders/rpc.js');

var _rpc2 = _interopRequireDefault(_rpc);

var _state = require('./state');

var state = _interopRequireWildcard(_state);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var defaultConfig = exports.defaultConfig = {
  addresses: {
    // optional: Allows to do market operations without passing the
    // market address
    defaultMarket: '0x3ddb5f64c40ea7fc7544246e9f372f74f9916b2b',

    // optional: Allows calculating of share prices without passing the
    // maker address
    defaultMarketMaker: '0xfaf8913492cef6e4a99904962703529b8f3ad781',

    // obligatory
    etherToken: '0x4955fd25df125d1abf23d45df1d094111f4b864e',

    // obligatory
    events: '0x631298cdbd72d1f2cb4b8e5120d3f8c41b8abe97',

    // optional
    ultimateOracle: '0x97ed93a5cebf62a7a48ebbbef7f16b87a80fee90',
    // optional
    lmsrMarketMaker: '0x3ddb5f64c40ea7fc7544246e9f372f74f9916b2b'
  },
  addressFiltersPostLoad: {
    marketMakers: ['0xfaf8913492cef6e4a99904962703529b8f3ad781'],
    oracles: ['0x97ed93a5cebf62a7a48ebbbef7f16b87a80fee90'],
    tokens: ['0x4955fd25df125d1abf23d45df1d094111f4b864e', '0xce2562752c3d635b94be9b18f2250ddc638aadca']
  },

  addressFilters: {
    // optional: Only loads events from blockchain, which are resolved by
    // given oracle
    oracle: '0x97ed93a5cebf62a7a48ebbbef7f16b87a80fee90',
    // optional: Only loads markets from blockchain, which are created by
    // given investor
    investor: null
  },

  eventDescriptionFilters: {
    // resolutionDate: new Date(new Date().getTime() + 3600000*24*60),
    oracleAddresses: null,
    includeWhitelistedOracles: false,
    pageSize: 50 // number of events returned by API for each page
  },

  defaultGas: 3000000,
  defaultGasPrice: new _bignumber2.default('5e10'), // 50 gwei

  gnosisServiceURL: 'http://localhost:8050/api/',
  ethereumNodeURL: 'http://127.0.0.1:8545',

  persistTransactions: false,
  transactionConfirmCallback: null,
  newTransactionCallback: null,

  // an array of functions that each return a Promise. These functions will be
  // called in buildState and updateState calls.
  additionalUpdates: null,

  transactionsLoop: true, // transactions receipt loop
  requestBlockNumberTimeout: 5
};

function buildWeb3(nodeURL) {
  //let engine = new ProviderEngine();
  return new _web2.default(new _web2.default.providers.HttpProvider(nodeURL));

  /*engine.addProvider(new RpcSubprovider({
    rpcUrl: nodeURL,
  }));
  engine.start();*/
}

var Config = exports.Config = function Config(overrides) {
  var _this = this;

  (0, _classCallCheck3.default)(this, Config);

  // Override defaults with the provided config and assign them to this object.
  _lodash2.default.merge(this, defaultConfig, overrides);
  if (this.web3 == null) {
    this.web3 = buildWeb3(this.ethereumNodeURL);
  }

  //for(let contractName in this.addresses){
  //  this.addresses[contractName] = web3.toChecksumAddress(this.addresses[contractName]);
  //}
  //this.rxWeb3 = new RxWeb3(this.web3);

  if (this.account == null) {
    // Load an account from the web3 provider as a fallback. this.initialize
    // is a Promise that clients can wait on to make sure initialization has
    // completed before they use this data.
    this.initialize = new _promise2.default(function (resolve, reject) {
      _this.web3.eth.getAccounts((0, _callbacks.promiseCallback)(resolve, reject));
    }).then(function (result) {
      if (result.length > 0) {
        _this.account = result[0];
      } else {
        _this.account = '0x0000000000000000000000000000000000000000';
      }
      _this.accounts = result;
    });
  } else {
    this.initialize = _promise2.default.resolve();
  }

  if (this.batch == null) {
    this.batch = this.web3.createBatch();
  }

  if (this.receiptPromises == null) {
    this.receiptPromises = {};
  }
};

function checkTransactions(config) {
  var stateSnapshot = state.get(config);

  // Check if there is a new block
  config.web3.eth.getBlockNumber(function (error, blockNumber) {
    if (blockNumber != stateSnapshot.blockNumber) {
      // Update state blocknumber
      state.updateBlocknumber(config);

      // Get transactions from state
      var transactions = stateSnapshot.transactions;

      // batch requests
      var batch = config.web3.createBatch();

      // Check receipts for each pending transactions

      var _loop = function _loop(key) {
        var transaction = transactions[key];

        if (transaction.receipt == null) {
          batch.add(config.web3.eth.getTransactionReceipt.request(key, function (e, receipt) {
            if (e == null && receipt && state.get(config).transactions && state.get(config).transactions[key].receipt == null) {
              var transactionCallback = transaction.callback;
              var newTransaction = {};
              newTransaction[key] = {
                callback: null,
                receipt: receipt,
                subject: transaction.subject,
                date: transaction.date,
                transactionHash: key
              };
              state.updateTransactions(newTransaction, config);
              // call transaction callback
              if (transactionCallback) {
                transactionCallback(e, receipt);
              }

              //call config transaction callback
              if (config.transactionConfirmCallback) {
                config.transactionConfirmCallback(e, receipt);
              }
            }
          }));
        }
      };

      for (var key in transactions) {
        _loop(key);
      }
      if ((0, _keys2.default)(transactions).length > 0) {
        batch.execute();
      }
    }

    setTimeout(function () {
      checkTransactions(config);
    }, config.requestBlockNumberTimeout * 1000);
  });
}

/**
 * Generate an initialized config.
 * This is less error-prone than directly constructing a Config. It's easy to
 * forget to wait for config.initialize to resolve. This interface avoids that.
 * @return {Promise<Config>}
 */
function initialize(overrides) {
  var config = new Config(overrides);

  if (config.transactionsLoop) {
    // Init check transactions receipts
    // Not using filter due to lot of requests
    // let blockFilter = config.web3.eth.filter("latest");

    setTimeout(function () {
      checkTransactions(config);
    }, config.requestBlockNumberTimeout * 1000);
  }
  return config.initialize.then(function () {
    return config;
  });
}