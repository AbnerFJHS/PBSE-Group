import { route, startRouter } from './router.js';
import { renderLookup } from './views/lookup.js';
import { renderMembershipDetail } from './views/membershipDetail.js';
import { renderCheckIns } from './views/checkIns.js';

route('/', (app) => renderCheckIns(app));
route('/check-ins', (app) => renderCheckIns(app));
route('/check-in', (app) => renderLookup(app));
route('/memberships/:id', (app, params) => renderMembershipDetail(app, params));

startRouter();
