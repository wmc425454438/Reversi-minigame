import { MAX_HAND_SIZE } from '../game/constants.js';
import { getCharactersByFaction } from './characters.js';

export class PlayerDeck {
  constructor(faction) {
    this.faction = faction;
    this.cards = [];
    this.initializeDeck();
  }

  initializeDeck() {
    const characters = getCharactersByFaction(this.faction);
    const maxCardsPerCharacter = 2;
    const totalCardsNeeded = 20;
    const cardCounts = new Map();

    let remainingCards = totalCardsNeeded;
    for (const character of characters) {
      const count = Math.min(
        maxCardsPerCharacter,
        Math.ceil(remainingCards / (characters.length - cardCounts.size))
      );
      cardCounts.set(character._name, count);
      remainingCards -= count;
      if (remainingCards <= 0) break;
    }

    for (const [characterName, count] of cardCounts) {
      const character = characters.find(c => c._name === characterName);
      if (character) {
        for (let i = 0; i < count; i++) {
          this.cards.push({
            id: `${this.faction}_${characterName}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            character,
            faction: this.faction,
          });
        }
      }
    }

    this.shuffle();
  }

  shuffle() {
    for (let i = this.cards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
    }
  }

  drawCard() {
    if (this.cards.length === 0) return null;
    return this.cards.pop();
  }

  getRemainingCards() {
    return this.cards.length;
  }
}

export class PlayerHand {
  constructor(maxHandSize) {
    this.cards = [];
    this.maxHandSize = maxHandSize || MAX_HAND_SIZE;
  }

  addCard(card) {
    if (this.cards.length >= this.maxHandSize) return false;
    this.cards.push(card);
    return true;
  }

  removeCard(cardId) {
    const index = this.cards.findIndex(card => card.id === cardId);
    if (index === -1) return null;
    return this.cards.splice(index, 1)[0];
  }

  getCards() {
    return [...this.cards];
  }

  getCardCount() {
    return this.cards.length;
  }

  isFull() {
    return this.cards.length >= this.maxHandSize;
  }
}
