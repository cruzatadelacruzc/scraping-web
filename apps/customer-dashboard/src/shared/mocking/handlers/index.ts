import { authHandlers } from './auth-handlers';
import { teaserHandlers } from './teaser-handlers';
import { miscHandlers } from './misc-handlers';

/** The single, real-contract handler set shared by the dev worker and tests. */
export const handlers = [...authHandlers, ...teaserHandlers, ...miscHandlers];

export { authHandlers, teaserHandlers, miscHandlers };
