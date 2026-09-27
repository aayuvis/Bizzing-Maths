/* runtime.js — the one shared mutable object. Views read it, main.js writes it.
   Kept in its own module so views.js and main.js can both import it without
   importing each other (Finance's arrangement). */
export const R = {
  h: null,            // the household (store.js shape)
  ui: { nav: 'home', arg: null, tab: 'learn', watch: 0, draft: null, factOp: null, cell: null, gateIn: '', gate: false, confirm: null },
  run: null,          // a question session in progress (runner in main.js)
  contest: null,      // a mock contest in progress
  render: () => {},
};
