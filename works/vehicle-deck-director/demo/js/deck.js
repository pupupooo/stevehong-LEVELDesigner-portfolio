// ═══════════════════════════════════════════
// deck.js — 牌组管理：洗牌/抽牌/弃牌/重洗
// ═══════════════════════════════════════════
(function() {
  const C = DS.Config;

  // 牌的数据定义
  const CARD_DEFS = {
    midnight_race: {
      name: '午夜竞速',
      shortName: '竞',
      cssClass: 'race',
      color: '#ff4500',
      rarity: 'normal',
    },
    intimidation_ride: {
      name: '恐吓专车',
      shortName: '吓',
      cssClass: 'intim',
      color: '#ffaa22',
      rarity: 'normal',
    },
    armored_heist: {
      name: '拦截运钞车',
      shortName: '劫',
      cssClass: 'heist',
      color: '#aa66ff',
      rarity: 'rare',
    },
    copilot_command: {
      name: '副驾指挥',
      shortName: '驾',
      cssClass: 'copilot',
      color: '#4488ff',
      rarity: 'normal',
    },
    blank: {
      name: '空牌',
      shortName: '—',
      cssClass: 'blank',
      color: '#555',
      rarity: 'blank',
    },
  };

  DS.CardDefs = CARD_DEFS;

  DS.DeckManager = {
    drawPile: [],     // 牌组（待抽）
    discardPile: [],  // 弃牌堆
    currentCard: null, // 当前抽出的牌
    totalCards: 0,
    reshuffleCount: 0,

    init() {
      this.drawPile = [];
      this.discardPile = [];
      this.currentCard = null;
      this.reshuffleCount = 0;
      this._buildDeck();
      this._shuffle();
    },

    _buildDeck() {
      this.drawPile = [];
      for (const entry of C.deck.composition) {
        for (let i = 0; i < entry.count; i++) {
          this.drawPile.push({
            type: entry.type,
            id: entry.type + '_' + i,
            def: CARD_DEFS[entry.type],
          });
        }
      }
      this.totalCards = this.drawPile.length;
    },

    _shuffle() {
      // Fisher-Yates
      const arr = this.drawPile;
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
    },

    _pickWeightedIndex(weights) {
      if (!weights || this.drawPile.length <= 1) return this.drawPile.length - 1;

      let bestIndex = this.drawPile.length - 1;
      let bestScore = -Infinity;

      for (let i = 0; i < this.drawPile.length; i++) {
        const card = this.drawPile[i];
        const base = weights[card.type] == null ? 1 : weights[card.type];
        const score = base + Math.random() * 0.001;
        if (score > bestScore) {
          bestScore = score;
          bestIndex = i;
        }
      }

      return bestIndex;
    },

    draw() {
      // 如果牌组空了，重洗
      if (this.drawPile.length === 0) {
        this._reshuffle();
      }

      if (this.drawPile.length === 0) return null;

      const weights = DS.EchoDirector && DS.EchoDirector.getDeckWeights ?
        DS.EchoDirector.getDeckWeights() :
        null;
      const index = this._pickWeightedIndex(weights);
      const card = this.drawPile.splice(index, 1)[0];
      this.currentCard = card;
      this.discardPile.push(card);

      DS.Events.emit('card_drawn', {
        card: card,
        remaining: this.drawPile.length,
        discarded: this.discardPile.length,
      });

      return card;
    },

    _reshuffle() {
      this.drawPile = this.discardPile.slice();
      this.discardPile = [];
      this._shuffle();
      this.reshuffleCount++;

      DS.Events.emit('deck_reshuffled', {
        count: this.reshuffleCount,
        totalCards: this.drawPile.length,
      });
    },

    // 状态查询
    getState() {
      return {
        drawPile: this.drawPile.slice(),
        discardPile: this.discardPile.slice(),
        currentCard: this.currentCard,
        remaining: this.drawPile.length,
        discarded: this.discardPile.length,
        total: this.totalCards,
        reshuffleCount: this.reshuffleCount,
      };
    },
  };
})();
