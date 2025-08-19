/**
 * AdaptiveStreamingManager - Dynamic quality adaptation
 */

import { EventEmitter } from './EventEmitter';

export class AdaptiveStreamingManager extends EventEmitter {
  constructor() {
    super();
  }

  cleanup(): void {
    this.removeAllListeners();
  }
}