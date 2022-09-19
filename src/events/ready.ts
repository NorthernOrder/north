import { event } from '../utils.js';

export default event({
  name: 'ready',
  once: true,
  async handler(_ctx, ..._args) {
    console.log('Ready!');
  },
});
