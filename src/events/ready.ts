import { event } from '../utils';

export default event({
  name: 'ready',
  once: true,
  async handler() {
    console.log('Ready!');
  },
});
