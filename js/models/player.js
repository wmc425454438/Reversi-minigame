import { INITIAL_HP } from '../game/constants.js';

export class Player {
  constructor(name, id) {
    this._name = name;
    this._id = id;
    this._hp = INITIAL_HP;
  }

  takeDamage(damage) {
    this._hp = Math.max(0, this._hp - damage);
  }

  isDead() {
    return this._hp <= 0;
  }
}
