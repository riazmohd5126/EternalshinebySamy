# Turo Car Forecaster

Before you buy a car to rent on Turo, this shows what you could earn and how long the car takes to pay for itself.
It's built the same way as the EternalShine dashboard: one HTML page plus a tiny local server
that saves your cars to a plain JSON file on your computer.

## Run it on your laptop

You need Node.js (LTS, from nodejs.org). Then:

    cd turo-forecaster
    npm run web          # or: node server.js

Open **http://localhost:4310** in your browser. Your cars are saved to
`~/Documents/Turo-Forecaster/turo-data.json`.

You don't need `npm install` for this. The page loads React from a CDN the first time it opens.

### Desktop app version (optional, like EternalShine)

    npm install          # downloads Electron, ~200 MB, one time
    npm start            # opens it in its own window
    npm run dist         # builds a Mac .app into dist/

## What it models

| Area | Inputs |
|---|---|
| The car | price, current miles, model year, sales tax, title/registration/dealer fees, Turo prep costs |
| Financing | down payment, APR, loan term (set the down payment to the full price for a cash purchase) |
| Renting | daily price, booked days per month, trip length, discounts, your host-plan share, extras per trip, guest and personal miles |
| Running costs | insurance, cleaning per trip, maintenance per mile, repair reserve, fuel/tolls/washes, parking, tracker & apps, registration, supplies |
| Value & plan | depreciation per year and per mile, income-tax set-aside, cost to sell, forecast length, Turo mileage/age limits |
| Seasonality | a busy-ness multiplier for each month (summer high, winter low) |

What it shows you:
- **Pays for itself in**: how long until rental profit covers the full all-in cost (car, tax, fees, prep and loan interest).
- **Your cash back in**: how long until you've recovered the cash you put in.
- **Monthly take-home**: your year-one average after Turo's share, every cost, the loan payment and taxes.
- **Month by month**: a chart and table of cash in hand, what you'd have if you sold that month, the car's value, the loan balance and the odometer.
- **What-if**: the break-even daily price and break-even booked days, plus a grid of take-home across different prices and booking levels.
- **Compare cars**: add each car you're considering (or duplicate one and change a single number) and compare them side by side.
- **Checks**: warnings when the car loses money, when it will pass Turo's mileage or age limit, and when your booking assumptions look too optimistic.
- Export CSV, Backup and Restore.

## Changing it

Everything is in `turo-forecaster.html`. There's no build step: edit the file and refresh the browser.
- `DEFAULTS`: the example car's numbers.
- `forecast()`: the money model, month by month. All the maths is in this one function.
- `SECTIONS`: the input form (labels, units, hints). To add an input, add it to `DEFAULTS`, list it in `SECTIONS`, and use it in `forecast()`.

These are estimates only. Check Turo's current host plans, fees and vehicle eligibility rules, and ask an accountant about taxes.
