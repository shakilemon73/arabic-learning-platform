/**
 * ConnectionOptimizer - Network optimization
 */

import { EventEmitter } from './EventEmitter';

export class ConnectionOptimizer extends EventEmitter {
  constructor() {
    super();
  }

  cleanup(): void {
    this.removeAllListeners();
  }
}