# CliniFlow HTML Dashboard Template

Open `login.html` for the sign-in experience or `index.html` for the dashboard. No build step is required.

## File structure

- `assets/css/theme.css` — shared colors, typography, navigation, cards, buttons and responsive theme rules
- `assets/css/dashboard.css` — dashboard-only layout and component styling
- `assets/css/login.css` — responsive login page layout and form styling
- `assets/js/common.js` — shared sidebar, navigation, toast and keyboard interactions
- `assets/js/dashboard.js` — dashboard charts, search filtering and live queue interaction
- `assets/js/login.js` — login validation, password visibility, remembered ID and login-page charts
- `assets/images/receptionist.png` — supplied reception illustration
- `assets/images/brand-mark.png` — transparent CliniFlow medical-plus brand mark
- `assets/images/queue-tracking.png` — supplied reception feature artwork
- `assets/images/reports-analytics.png` — supplied reports feature artwork
- `assets/images/login-reception.png` — supplied reception scene for the login page

The five KPI line charts are drawn as responsive HTML canvas charts and automatically redraw when the viewport changes.
