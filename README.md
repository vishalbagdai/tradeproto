# Autotrade prototype

Clickable HTML prototype of the auto-trading web app with sample data. No build step and no server needed.

## Run it
Open `index.html` in a browser. Or serve the folder, for example `npx serve .` or `python -m http.server 8080`.

## Pages
Customer: `#dashboard`, `#strategies`, `#strategy-spx-ic`, `#my-versions`, `#orders`, `#analytics`, `#backtest`, `#leaderboard`, `#go-live`, `#account`, `#appearance`, `#plans`, `#signin`, `#signup`
Admin: `#admin-users`, `#admin-invites`, `#admin-strategies`, `#admin-review`, `#admin-audit`, `#admin-health`

## Files
- `css/app.css` – layout and theme tokens
- `js/data.js` – all sample data (strategies, positions, orders, users, 15 themes)
- `js/ui.js` – formatting, charts, modal, toast, theme switching
- `js/app.js` – state, hash router, header, kill switch, live price ticks
- `js/pages-customer.js`, `js/pages-admin.js` – one render function per page

Everything resets on reload except the chosen theme and collapsed sections.
When the real Blazor app is built, each page function maps to one Razor component in the shared RCL.
