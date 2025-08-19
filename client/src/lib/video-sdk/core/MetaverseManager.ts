/**
 * MetaverseManager - AR/VR features
 */

import { EventEmitter } from './EventEmitter';

export class MetaverseManager extends EventEmitter {
  constructor(config?: any) {
    super();
  }

  cleanup(): void {
    this.removeAllListeners();
  }
}