(function (global) {
  'use strict';

  var KEYS = (global.CONTRACTS && global.CONTRACTS.STORAGE_KEYS) || {
    USER: 'g7_user',
    APPLICATIONS: 'g7_applications',
    TRANSACTIONS: 'g7_transactions',
    NOTIFICATIONS: 'g7_notifications',
    TEAM: 'g7_team',
    BINARY: 'g7_binary',
    WALLET: 'g7_wallet',
    SETTINGS: 'g7_settings',
    LANG: 'g7_language'
  };

  function getJSON(key) {
    try {
      var raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      console.error('Storage getJSON error for key ' + key, e);
      return null;
    }
  }

  function setJSON(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      console.error('Storage setJSON error for key ' + key, e);
      return false;
    }
  }

  var storageService = {
    KEYS: KEYS,

    init: function () {
      var needReset = false;
      if (!localStorage.getItem(KEYS.USER)) needReset = true;
      if (KEYS.TREE && !localStorage.getItem(KEYS.TREE)) needReset = true;
      if (KEYS.TREE_FOCUS && !localStorage.getItem(KEYS.TREE_FOCUS)) needReset = true;
      try {
        var t = KEYS.TEAM ? localStorage.getItem(KEYS.TEAM) : null;
        var teamT = t ? JSON.parse(t) : null;
        var hasTree = !!(KEYS.TREE && localStorage.getItem(KEYS.TREE));
        if ((!teamT || !teamT.activeCount || Number(teamT.activeCount) <= 1) && hasTree) {
          needReset = true;
        }
        var b = KEYS.BINARY ? localStorage.getItem(KEYS.BINARY) : null;
        var binS = b ? JSON.parse(b) : null;
        if ((!binS || (Number(binS.leftPoints || 0) + Number(binS.rightPoints || 0) < 10)) && hasTree) {
          needReset = true;
        }
      } catch (e) { /* noop */ }
      if (needReset) { this.resetToDefaults(); }
    },

    resetToDefaults: function () {
      setJSON(KEYS.USER, {
        name: 'João da Silva',
        username: 'g7investidor',
        email: 'usuario@g7gold.com',
        sponsor: 'goldmaster',
        walletAddress: ''
      });

      setJSON(KEYS.WALLET, {
        dailyGains: 0,
        teamGains: 0,
        bonusGains: 0,
        totalGains: 0,
        totalWithdrawn: 0,
        availableWithdraw: 0
      });

      setJSON(KEYS.APPLICATIONS, []);
      setJSON(KEYS.TRANSACTIONS, []);
      setJSON(KEYS.NOTIFICATIONS, [
        { id: 1, title: 'Bem-vindo à G7 Gold Invest', date: new Date().toLocaleTimeString(), read: false }
      ]);
      setJSON(KEYS.TEAM, {
        directCount: 2,
        activeCount: 12,
        bonusClaimed: false
      });
      setJSON(KEYS.BINARY, {
        leftPoints: 500,
        rightPoints: 300
      });
      if (KEYS.TREE) {
        var seed = (global.treeEngine && typeof global.treeEngine.defaultSeedTree === 'function')
          ? global.treeEngine.defaultSeedTree()
          : null;
        setJSON(KEYS.TREE, seed);
      }
      if (KEYS.TREE_FOCUS) {
        setJSON(KEYS.TREE_FOCUS, { focusNodeId: 'eu' });
      }
      setJSON(KEYS.LANG, 'pt');
    },

    getUser: function () { return getJSON(KEYS.USER); },
    saveUser: function (user) { return setJSON(KEYS.USER, user); },

    getWallet: function () { return getJSON(KEYS.WALLET); },
    saveWallet: function (wallet) { return setJSON(KEYS.WALLET, wallet); },

    getApplications: function () { return getJSON(KEYS.APPLICATIONS); },
    saveApplications: function (apps) { return setJSON(KEYS.APPLICATIONS, apps); },

    getTransactions: function () { return getJSON(KEYS.TRANSACTIONS); },
    saveTransactions: function (txs) { return setJSON(KEYS.TRANSACTIONS, txs); },

    getNotifications: function () { return getJSON(KEYS.NOTIFICATIONS); },
    saveNotifications: function (notes) { return setJSON(KEYS.NOTIFICATIONS, notes); },

    getTeam: function () { return getJSON(KEYS.TEAM); },
    saveTeam: function (team) { return setJSON(KEYS.TEAM, team); },

    getBinary: function () { return getJSON(KEYS.BINARY); },
    saveBinary: function (bin) { return setJSON(KEYS.BINARY, bin); },

    getTree: function () { return KEYS.TREE ? getJSON(KEYS.TREE) : null; },
    saveTree: function (tree) { return KEYS.TREE ? setJSON(KEYS.TREE, tree) : false; },

    getTreeFocus: function () { return KEYS.TREE_FOCUS ? getJSON(KEYS.TREE_FOCUS) : { focusNodeId: 'eu' }; },
    saveTreeFocus: function (focus) { return KEYS.TREE_FOCUS ? setJSON(KEYS.TREE_FOCUS, focus) : false; }
  };

  global.storageService = storageService;
})(window);
