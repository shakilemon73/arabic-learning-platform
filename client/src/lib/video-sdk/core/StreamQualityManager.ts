/**
 * StreamQualityManager - Video/audio quality optimization
 */

import { EventEmitter } from './EventEmitter';

export class StreamQualityManager extends EventEmitter {
  constructor() {
    super();
  }

  cleanup(): void {
    this.removeAllListeners();
  }
}