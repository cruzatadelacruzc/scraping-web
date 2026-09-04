import { authHandlers } from './auth-handlers';
import { teaserHandlers } from './teaser-handlers';
import { alarmsHandlers } from './alarms-handlers';
import { productsHandlers } from './products-handlers';
import { plansHandlers } from './plans-handlers';
import { miscHandlers } from './misc-handlers';

/** The single, real-contract handler set shared by the dev worker and tests. */
export const handlers = [
  ...authHandlers,
  ...teaserHandlers,
  ...alarmsHandlers,
  ...productsHandlers,
  ...plansHandlers,
  ...miscHandlers,
];

export {
  authHandlers,
  teaserHandlers,
  miscHandlers,
  alarmsHandlers,
  productsHandlers,
  plansHandlers,
};
