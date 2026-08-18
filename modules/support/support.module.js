(function (global) {
  'use strict';

  function el(id) { return document.getElementById(id); }

  var supportModule = {
    init: function () {},

    sendChatMessage: function () {
      var input = el('chatInput');
      var box = el('chatMessages');
      if (!input || !box) return;

      var text = (input.value || '').trim();
      if (!text) return;

      box.innerHTML +=
        '<div class="flex items-start gap-2 justify-end">' +
          '<div class="bg-amber-500/20 border border-amber-500/30 p-3 rounded-2xl rounded-tr-none max-w-xs text-xs text-white">' +
            text +
          '</div>' +
        '</div>';
      input.value = '';

      setTimeout(function () {
        box.innerHTML +=
          '<div class="flex items-start gap-2">' +
            '<div class="w-7 h-7 rounded-full gold-bg-gradient text-black flex items-center justify-center font-bold text-[10px]">G7</div>' +
            '<div class="bg-dark-hover border border-dark-border p-3 rounded-2xl rounded-tl-none max-w-xs text-xs text-gray-200">' +
              'Obrigado pelo contato! Um atendente especializado em XAU/USD responderá em instantes.' +
            '</div>' +
          '</div>';
        box.scrollTop = box.scrollHeight;
      }, 1000);

      box.scrollTop = box.scrollHeight;
    }
  };

  global.supportModule = supportModule;
})(window);
