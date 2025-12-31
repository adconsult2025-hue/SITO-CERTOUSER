// ESG Plan (Corporate / Strada 2)
// Additive, read-only: produces a recommended actions plan without creating CT/CER practices.

function normProfileType(t) {
  const x = String(t || '').toLowerCase().trim();
  if (x === 'corporate') return 'corporate';
  if (x === 'terzo_settore' || x === 'terzo' || x === 'ets') return 'terzo_settore';
  if (x === 'condominio') return 'condominio';
  return 'corporate';
}

function clampNumber(n, min, max) {
  const x = Number.isFinite(n) ? n : 0;
  return Math.max(min, Math.min(max, x));
}

function computeBaselineCo2Tons(baseline) {
  const electric = Number.isFinite(baseline.electric_kwh) ? baseline.electric_kwh : 0;
  const thermal = Number.isFinite(baseline.thermal_kwh) ? baseline.thermal_kwh : 0;
  // Simplified emission factors (tons of CO2 per kWh)
  const electricFactor = 0.00023;
  const thermalFactor = 0.00025;
  return electric * electricFactor + thermal * thermalFactor;
}

function buildAction({ action_type, scope, expected_impact, preferred_channel, ct_type }) {
  return {
    action_type,
    scope,
    preferred_channel,
    ct_type,
    expected_impact: {
      energy_kwh: expected_impact.energy_kwh,
      co2_tons: expected_impact.co2_tons
    }
  };
}

function recommendPlan(payload) {
  const profile = payload.profile || {};
  const profile_type = normProfileType(profile.profile_type || payload.profile_type);
  const baseline = payload.baseline || {};
  const objectives = payload.objectives || {};
  const economy = payload.economy || {};

  const baselineElectric = Number.isFinite(baseline.electric_kwh) ? baseline.electric_kwh : 0;
  const baselineThermal = Number.isFinite(baseline.thermal_kwh) ? baseline.thermal_kwh : 0;
  const baselineCo2 = computeBaselineCo2Tons(baseline);

  const targetReductionPercent = clampNumber(objectives.co2_reduction_percent, 0, 100) || 30;
  const budgetEur = Number.isFinite(objectives.budget_eur) ? objectives.budget_eur : null;

  const preferIncentives = !!(profile.preferences && profile.preferences.maximize_incentives);
  const timelineMonths = profile.preferences && Number.isFinite(profile.preferences.timeline_months)
    ? profile.preferences.timeline_months
    : 36;

  // Economy (simple, MVP): energy price for estimating annual savings (EUR/kWh)
  const energyPrice = Number.isFinite(economy.energy_price_eur_kwh) ? economy.energy_price_eur_kwh : 0.25;
  const capexLimit = Number.isFinite(economy.capex_limit_eur) ? economy.capex_limit_eur : null;

  const actions = [];
  const alerts = [];

  const targetCo2 = Math.max(0, baselineCo2 * (1 - targetReductionPercent / 100));
  const targetDeltaCo2 = baselineCo2 - targetCo2;

  // PV sizing: reduce part of electric baseline
  if (baselineElectric > 0) {
    const pvImpactKwh = -Math.round(baselineElectric * 0.35);
    const pvImpactCo2 = pvImpactKwh * 0.00023;
    actions.push(buildAction({
      action_type: 'install_pv',
      scope: 'elettrico',
      preferred_channel: 'CT_3_0',
      ct_type: profile_type === 'condominio' ? 'condominio' : 'terzo',
      expected_impact: {
        energy_kwh: pvImpactKwh,
        co2_tons: pvImpactCo2
      }
    }));
  }

  // Heat pump for thermal baseline
  if (baselineThermal > 0) {
    const pdcImpactKwh = -Math.round(baselineThermal * 0.4);
    const pdcImpactCo2 = pdcImpactKwh * 0.00025;
    actions.push(buildAction({
      action_type: 'install_pdc',
      scope: 'termico',
      preferred_channel: 'CT_3_0',
      ct_type: profile_type === 'condominio' ? 'condominio' : 'terzo',
      expected_impact: {
        energy_kwh: pdcImpactKwh,
        co2_tons: pdcImpactCo2
      }
    }));
  }

  // Automation (always helpful)
  const baImpactKwh = -Math.round((baselineElectric + baselineThermal) * 0.05);
  if (baImpactKwh !== 0) {
    actions.push(buildAction({
      action_type: 'building_automation',
      scope: 'multisito',
      preferred_channel: preferIncentives ? 'CT_3_0' : 'ALTRO',
      ct_type: 'terzo',
      expected_impact: {
        energy_kwh: baImpactKwh,
        co2_tons: baImpactKwh * 0.00023
      }
    }));
  }

  // Hard compliance alerts (CT3 must be correct in more points)
  if (actions.some(a => a.preferred_channel === 'CT_3_0')) {
    alerts.push('CT 3.0: definire formalmente Soggetto Responsabile / eventuale delega (ruoli).');
    alerts.push('CT 3.0: scegliere percorso (accesso diretto vs prenotazione) e mantenere workflow coerente.');
    alerts.push('CT 3.0: verificare cumulabilità con detrazioni/altre misure per ogni intervento (no cumuli vietati).');
    alerts.push('CT 3.0: predisporre fascicolo documentale coerente (documenti da caricare vs da conservare).');
  }

  // Profile-specific emphasis: corporate/terzo settore require tighter governance
  if (profile_type !== 'condominio') {
    alerts.push('Corporate/ETS: governare baseline e KPI (ESG) con tracciabilità dati e audit trail per sede.');
    alerts.push('Corporate/ETS: definire governance economica (CAPEX/OPEX) e priorità interventi per raggiungere l’obiettivo.');
  }

  // Simple economy summary based on expected energy savings (annualized rough)
  const totalEnergyDelta = (actions || []).reduce((acc, a) => {
    const ek = a?.expected_impact?.energy_kwh;
    return acc + (Number.isFinite(ek) ? ek : 0);
  }, 0);
  const annualSavingEur = Math.max(0, -totalEnergyDelta) * energyPrice;

  return {
    profile_type,
    baseline_summary: {
      electric_kwh: baselineElectric,
      thermal_kwh: baselineThermal,
      co2_tons: Math.round(baselineCo2 * 100) / 100
    },
    objectives: {
      co2_reduction_percent: targetReductionPercent,
      co2_target_tons: Math.round(targetCo2 * 100) / 100,
      budget_eur: budgetEur
    },
    meta: {
      timeline_months: timelineMonths
    },
    economy_summary: {
      energy_price_eur_kwh: energyPrice,
      capex_limit_eur: capexLimit,
      estimated_annual_saving_eur: Math.round(annualSavingEur * 100) / 100
    },
    actions,
    alerts,
    next_steps: [
      'Valida piano con dati reali per sito (drill-down).',
      'Precompila CT/CER solo dopo conferma utente (no invio automatico).'
    ]
  };
}

exports.handler = async function handler(event) {
  if (event.httpMethod && event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ ok: false, error: 'Method Not Allowed' }) };
  }

  try {
    const payload = event.body ? JSON.parse(event.body) : {};
    const plan = recommendPlan(payload || {});

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: true, plan })
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: false, error: err.message || 'Internal Error' })
    };
  }
};
