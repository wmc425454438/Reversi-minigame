import { getCharactersByFaction } from './characters.js';

const STORAGE_KEY = 'reversi_decks';

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// 稀有度: 金/紫/蓝 按攻+连总值
function calcRarity(ch) {
  const total = ch._attack + ch._combo;
  if (total >= 25) return '金';
  if (total >= 18) return '紫';
  return '蓝';
}

function makeCardFromCharacter(ch) {
  return {
    id: ch._faction + '_' + ch._name + '_' + uid(),
    character: ch,
    faction: ch._faction,
    rarity: calcRarity(ch),
  };
}

// 默认卡组名
const DEFAULT_DECK_NAMES = {
  '魏': '魏国精锐',
  '蜀': '蜀汉五虎',
  '吴': '东吴水师',
};

function createDefaultDeck(faction) {
  const pool = getCharactersByFaction(faction);
  // 随机抽5张初始卡牌
  const shuffled = [...pool].sort(() => Math.random() - 0.5).slice(0, 5);
  return {
    id: 'deck_' + uid(),
    name: DEFAULT_DECK_NAMES[faction] || '默认卡组',
    faction: faction,
    cards: shuffled.map(ch => makeCardFromCharacter(ch)),
    maxSize: 20,
  };
}

export class DeckManager {
  constructor() {
    this._load();
  }

  _load() {
    try {
      const raw = wx.getStorageSync(STORAGE_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        this.decks = data.decks || {};
        this.selectedDeckId = data.selectedDeckId || null;
        this.deckOrder = data.deckOrder || [];
      } else {
        this._initDefault();
      }
    } catch (e) {
      this._initDefault();
    }
  }

  _initDefault() {
    const d = createDefaultDeck('蜀');
    this.decks = { [d.id]: d };
    this.deckOrder = [d.id];
    this.selectedDeckId = d.id;
    this._save();
  }

  _save() {
    try {
      wx.setStorageSync(STORAGE_KEY, JSON.stringify({
        decks: this.decks,
        selectedDeckId: this.selectedDeckId,
        deckOrder: this.deckOrder,
      }));
    } catch (e) { /* ignore */ }
  }

  getAllDecks() {
    return this.deckOrder.map(id => this.decks[id]).filter(Boolean);
  }

  getDeck(id) {
    return this.decks[id] || null;
  }

  getSelectedDeck() {
    return this.decks[this.selectedDeckId] || this.getAllDecks()[0] || null;
  }

  setSelectedDeck(id) {
    if (this.decks[id]) {
      this.selectedDeckId = id;
      this._save();
    }
  }

  createDeck(name, faction) {
    const pool = getCharactersByFaction(faction);
    const shuffled = [...pool].sort(() => Math.random() - 0.5).slice(0, 5);
    const deck = {
      id: 'deck_' + uid(),
      name: name || '新卡组',
      faction: faction,
      cards: shuffled.map(ch => makeCardFromCharacter(ch)),
      maxSize: 20,
    };
    this.decks[deck.id] = deck;
    this.deckOrder.push(deck.id);
    this._save();
    return deck;
  }

  deleteDeck(id) {
    if (!this.decks[id]) return;
    if (this.deckOrder.length <= 1) return; // 至少保留一套
    delete this.decks[id];
    this.deckOrder = this.deckOrder.filter(did => did !== id);
    if (this.selectedDeckId === id) {
      this.selectedDeckId = this.deckOrder[0];
    }
    this._save();
  }

  renameDeck(id, name) {
    const d = this.decks[id];
    if (d) { d.name = name; this._save(); }
  }

  addCard(deckId, poolCardId) {
    const d = this.decks[deckId];
    if (!d) return false;
    if (d.cards.length >= d.maxSize) return false;
    const ch = this._findCharacterByPoolId(poolCardId);
    if (!ch) return false;
    if (d.cards.some(c => c.character._name === ch._name)) return false;
    d.cards.push(makeCardFromCharacter(ch));
    return true;
  }

  removeCard(deckId, deckCardId) {
    const d = this.decks[deckId];
    if (!d) return false;
    const idx = d.cards.findIndex(c => c.id === deckCardId);
    if (idx < 0) return false;
    d.cards.splice(idx, 1);
    return true;
  }

  isCharInDeck(deckId, poolCardId) {
    const d = this.decks[deckId];
    if (!d) return false;
    const ch = this._findCharacterByPoolId(poolCardId);
    if (!ch) return false;
    return d.cards.some(c => c.character._name === ch._name);
  }

  resetDeck(deckId) {
    const d = this.decks[deckId];
    if (!d) return;
    const pool = getCharactersByFaction(d.faction);
    const shuffled = [...pool].sort(() => Math.random() - 0.5).slice(0, 5);
    d.cards = shuffled.map(ch => makeCardFromCharacter(ch));
    this._save();
  }

  // 卡池：该阵营所有角色（每角色1张虚拟卡牌）
  getCardPool(faction) {
    const chars = getCharactersByFaction(faction);
    return chars.map(ch => ({
      id: ch._faction + '_' + ch._name,
      character: ch,
      faction: ch._faction,
      rarity: calcRarity(ch),
    }));
  }

  _findCharacterByPoolId(poolCardId) {
    // poolCardId 格式: "蜀_刘备"
    const idx = poolCardId.indexOf('_');
    if (idx < 0) return null;
    const faction = poolCardId.substring(0, idx);
    const name = poolCardId.substring(idx + 1);
    const chars = getCharactersByFaction(faction);
    return chars.find(ch => ch._name === name) || null;
  }
}
