/* Turo Car Forecaster — the money model.
   Shared by the Turo page (apps/turo/index.html) and the Master Dashboard home.
   Exposes window.TuroModel = { DEFAULTS, forecast }. */
(function () {
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const num = v => { const n = parseFloat(String(v ?? "").replace(/[^0-9.\-]/g, "")); return isFinite(n) ? n : 0; };

/* ---------- Inputs (the example car — change anything) ---------- */
const DEFAULTS = {
  name: "2022 Toyota Corolla LE (example)",
  // the car
  year: 2022, price: 19500, odometer: 32000, salesTaxPct: 7, titleFees: 450, prepCost: 600,
  // financing (down payment ≥ total → paid in cash, no loan)
  downPayment: 4500, apr: 7.9, termMonths: 60,
  // renting on Turo
  dailyRate: 68, bookedDays: 19, avgTripDays: 3.5, discountPct: 6, hostPlanPct: 75, extrasPerTrip: 12,
  milesPerDay: 85, personalMiles: 0,
  // running costs
  insuranceMonthly: 145, cleaningPerTrip: 20, maintPerMile: 0.08, repairReserve: 40, fuelMonthly: 20,
  parkingMonthly: 0, techMonthly: 15, registrationYearly: 250, miscMonthly: 25,
  // value, taxes, plan
  depreciationPct: 12, depPerMile: 0.05, taxPct: 15, sellCostPct: 3, horizonMonths: 36,
  maxMiles: 130000, maxAgeYears: 12,
  season: [0.8, 0.8, 0.95, 1.0, 1.05, 1.2, 1.25, 1.2, 1.0, 0.95, 0.9, 1.05],
};

/* ---------- The money model ---------- */
function forecast(car, override = {}) {
  const c = { ...car, ...override };
  const g = k => num(c[k]);
  const price = g("price"), taxRate = g("salesTaxPct") / 100;
  const vehicleCost = price * (1 + taxRate) + g("titleFees");          // car + sales tax + title/registration
  const allIn = vehicleCost + g("prepCost");                            // everything to get it Turo-ready
  const down = Math.min(Math.max(g("downPayment"), 0), vehicleCost);
  const financed = vehicleCost - down;
  const upfront = down + g("prepCost");                                 // cash out of your pocket on day one
  const r = g("apr") / 1200, term = Math.max(1, Math.round(g("termMonths")));
  const payment = financed <= 0 ? 0 : r ? financed * r / (1 - Math.pow(1 + r, -term)) : financed / term;

  const season = (c.season || DEFAULTS.season).map(num);
  const sMean = season.reduce((a, b) => a + b, 0) / 12 || 1;
  const startCal = new Date().getMonth();
  const startYear = new Date().getFullYear();
  const host = g("hostPlanPct") / 100, disc = g("discountPct") / 100, tax = g("taxPct") / 100;
  const tripDays = Math.max(g("avgTripDays"), 0.5);
  const horizon = Math.max(1, Math.round(g("horizonMonths")));
  const RUN = Math.max(horizon, 120);

  let bal = financed, cum = -upfront, opCum = 0, cumMiles = 0, prevValue = price;
  const rows = [];
  for (let m = 1; m <= RUN; m++) {
    const cal = (startCal + m - 1) % 12;
    const f = (season[cal] || 0) / sMean;
    const days = Math.min(30, Math.max(0, g("bookedDays") * f));
    const trips = days / tripDays;
    const gross = days * g("dailyRate") * (1 - disc) + trips * g("extrasPerTrip");
    const turoCut = gross * (1 - host);
    const payout = gross - turoCut;
    const mi = days * g("milesPerDay") + g("personalMiles");
    cumMiles += mi;
    const costs = {
      insurance: g("insuranceMonthly"),
      cleaning: trips * g("cleaningPerTrip"),
      maintenance: mi * g("maintPerMile"),
      repairs: g("repairReserve"),
      fuel: g("fuelMonthly"),
      parking: g("parkingMonthly"),
      tech: g("techMonthly"),
      registration: g("registrationYearly") / 12,
      misc: g("miscMonthly"),
    };
    const opCost = Object.values(costs).reduce((a, b) => a + b, 0);
    const interest = bal * r;
    const principal = bal > 0 ? Math.min(bal, payment - interest) : 0;
    const loanPay = bal > 0 ? interest + principal : 0;
    bal = Math.max(0, bal - principal);
    const value = Math.max(0, price * Math.pow(1 - g("depreciationPct") / 100, m / 12) - g("depPerMile") * cumMiles);
    const depreciation = prevValue - value; prevValue = value;
    const taxOwed = tax * Math.max(0, payout - opCost - interest - depreciation);
    const net = payout - opCost - loanPay - taxOwed;
    cum += net;
    opCum += payout - opCost - interest - taxOwed;
    const position = cum + value * (1 - g("sellCostPct") / 100) - bal;
    rows.push({
      m, label: MONTHS[cal] + " " + String(startYear + Math.floor((startCal + m - 1) / 12)).slice(2),
      days, trips, gross, turoCut, payout, costs, opCost, interest, principal, loanPay, taxOwed, net, cum, opCum,
      value, bal, position, odometer: g("odometer") + cumMiles, age: startYear + (startCal + m - 1) / 12 - g("year"),
    });
  }
  const first = fn => { const r = rows.find(fn); return r ? r.m : null; };
  const yr = rows.slice(0, 12);
  const avg = k => yr.reduce((a, r) => a + (typeof k === "function" ? k(r) : r[k]), 0) / yr.length;
  const costKeys = Object.keys(rows[0].costs);
  const avgCosts = Object.fromEntries(costKeys.map(k => [k, avg(r => r.costs[k])]));
  const end = rows[horizon - 1];
  return {
    c, allIn, vehicleCost, upfront, financed, payment, horizon, rows, view: rows.slice(0, horizon), end,
    yr1: {
      days: avg("days"), trips: avg("trips"), gross: avg("gross"), turoCut: avg("turoCut"), payout: avg("payout"),
      opCost: avg("opCost"), interest: avg("interest"), principal: avg("principal"), loanPay: avg("loanPay"),
      taxOwed: avg("taxOwed"), net: avg("net"), costs: avgCosts,
      depreciation: (price - yr[yr.length - 1].value) / yr.length,
    },
    fullPayback: first(r => r.opCum >= allIn),       // rental profit has covered the whole car
    cashPayback: first(r => r.cum >= 0),             // your out-of-pocket cash is back
    soldBreakEven: first(r => r.position >= 0),      // you'd be even if you sold the car that month
    turoLimit: first(r => r.odometer > g("maxMiles") || r.age > g("maxAgeYears")),
    annualRoi: upfront > 0 ? (end.position / upfront) / (horizon / 12) : null,
  };
}


window.TuroModel = { DEFAULTS, forecast };
})();
