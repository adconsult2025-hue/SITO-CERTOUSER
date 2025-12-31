function el(id) { return document.getElementById(id); }
let lastPlan = null;

function getQs() {
  try { return new URLSearchParams(window.location.search || ''); } catch { return new URLSearchParams(); }
}

function setSelectValue(id, value) {
  const s = el(id);
  if (!s) return;
  const v = String(value || '');
  const opt = Array.from(s.options || []).find(o => o.value === v);
  if (opt) s.value = v;
}

function normProfileType(t) {
  const x = String(t || '').toLowerCase().trim();
  if (x === 'condominio') return 'condominio';
  if (x === 'terzo_settore' || x === 'terzo' || x === 'ets') return 'terzo_settore';
  if (x === 'corporate') return 'corporate';
  return 'corporate';
}

function syncProfileToCtType(profileType) {
  // Keep CT workflow parameter coherent with profile (without breaking existing CT30 logic)
  if (profileType === 'condominio') setSelectValue('ct_type', 'condominio');
  if (profileType === 'terzo_settore') setSelectValue('ct_type', 'terzo');
  if (profileType === 'corporate') setSelectValue('ct_type', 'terzo');
}

// Mapping minimale (coerente col seed CT della piattaforma)
// NB: FV-PDC è gestito dalla validazione server-side (requires_pdc) in ct-practice-interventions-save
const ACTION_TO_CT_CODES = {
  install_pdc: ['PDC-CENTRALE'],
  building_automation: ['BACS'],
  install_pv: ['FV-PDC']
};

function uniq(items) {
  return Array.from(new Set((items || []).filter(Boolean)));
}

function buildCtCodesFromPlan(plan) {
  const actions = (plan && plan.actions) || [];
  return uniq(actions.flatMap(a => ACTION_TO_CT_CODES[a.action_type] || []));
}

// Init from querystring: /esg/plan.html?profile=corporate|terzo_settore|condominio
(() => {
  const qs = getQs();
  const p = normProfileType(qs.get('profile') || qs.get('profile_type'));
  setSelectValue('profile_type', p);
  syncProfileToCtType(p);
  el('profile_type')?.addEventListener('change', () => syncProfileToCtType(normProfileType(el('profile_type').value)));
})();

function badge(text) {
  const span = document.createElement('span');
  span.className = 'badge';
  span.textContent = text;
  return span;
}

function actionCard(action) {
  const div = document.createElement('div');
  div.className = 'action';
  const title = document.createElement('div');
  title.style.display = 'flex';
  title.style.alignItems = 'center';
  title.style.gap = '8px';
  title.appendChild(document.createTextNode(action.action_type));
  if (action.preferred_channel) title.appendChild(badge(action.preferred_channel));
  if (action.ct_type) title.appendChild(badge(`CT: ${action.ct_type}`));
  const scope = document.createElement('div');
  scope.textContent = `Scope: ${action.scope}`;
  const imp = document.createElement('div');
  const ei = action.expected_impact || {};
  imp.textContent = `Impatti attesi: energia ${ei.energy_kwh} kWh, CO₂ ${Math.round((ei.co2_tons || 0) * 100) / 100} t`;;
  div.appendChild(title);
  div.appendChild(scope);
  div.appendChild(imp);
  return div;
}

async function generatePlan() {
  const payload = {
    profile: {
      type: 'corporate',
      profile_type: normProfileType(el('profile_type')?.value),
      preferences: {
        maximize_incentives: el('maximize_incentives').checked,
        timeline_months: Number(el('timeline_months').value || 36)
      }
    },
    economy: {
      energy_price_eur_kwh: Number(el('energy_price_eur_kwh').value || 0.25),
      capex_limit_eur: el('capex_limit_eur').value ? Number(el('capex_limit_eur').value) : null
    },
    baseline: {
      electric_kwh: Number(el('electric_kwh').value || 0),
      thermal_kwh: Number(el('thermal_kwh').value || 0)
    },
    objectives: {
      co2_reduction_percent: Number(el('co2_target_percent').value || 0),
      budget_eur: el('budget_eur').value ? Number(el('budget_eur').value) : null
    },
    preferences: {
      ct_type: el('ct_type')?.value || 'terzo'
    }
  };

  const res = await fetch('/.netlify/functions/esg-plan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (!res.ok || data.ok === false) {
    throw new Error(data.error || 'Errore generazione piano');
  }
  renderPlan(data.plan || data);
}

function renderPlan(plan) {
  lastPlan = plan;
  el('out').style.display = 'block';
  el('baseline_box').textContent =
    `Baseline: elettrico ${plan.baseline_summary.electric_kwh} kWh, termico ${plan.baseline_summary.thermal_kwh} kWh, CO₂ stimata ${plan.baseline_summary.co2_tons} t/anno.`;

  // Economy summary (MVP)
  const eco = plan.economy_summary || {};
  const capexTxt = (eco.capex_limit_eur || eco.capex_limit_eur === 0) ? ` • CAPEX limite: €${eco.capex_limit_eur}` : '';
  el('economy_box').textContent =
    `Economia (stima): prezzo energia €${eco.energy_price_eur_kwh}/kWh • risparmio annuo stimato €${eco.estimated_annual_saving_eur}${capexTxt}`;

  const alerts = plan.alerts || [];
  const alertsBox = el('alerts_box');
  alertsBox.innerHTML = '';
  alerts.forEach(a => {
    const p = document.createElement('p');
    p.className = 'muted';
    p.textContent = `• ${a}`;
    alertsBox.appendChild(p);
  });

  const actionsBox = el('actions_box');
  actionsBox.innerHTML = '';
  (plan.actions || []).forEach(a => actionsBox.appendChild(actionCard(a)));
}

el('btn_generate').addEventListener('click', () => {
  generatePlan().catch(err => alert(err.message));
});

el('btn_precompile_ct').addEventListener('click', () => {
  if (!lastPlan) return alert('Genera prima un piano.');

  (async () => {
    try {
      const ct_type = el('ct_type')?.value || 'terzo';
      const profileType = normProfileType(el('profile_type')?.value);

      // Guardrail: if user chooses "condominio", suggest using Strada 1 (keep as-is)
      if (profileType === 'condominio') {
        const proceed = confirm('Sei in profilo CONDOMINIO: per i condomini la piattaforma è pensata in Strada 1 (interventi→compatibilità). Vuoi comunque creare una bozza CT da questo piano?');
        if (!proceed) return;
      }

      const ctCodes = buildCtCodesFromPlan(lastPlan);

      if (!ctCodes.length) {
        return alert('Il Piano non contiene azioni instradate su CT 3.0. Usa “Instrada Alternative” oppure modifica obiettivi/preferenze.');
      }

      // 1) Crea la pratica via workflow API
      const title = `CT 3.0 – Bozza da Piano ESG (${ct_type})`;
      const createRes = await fetch('/.netlify/functions/ct-practice-create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, ct_type })
      });
      const createJson = await createRes.json();
      if (!createRes.ok || !createJson.ok) {
        throw new Error(createJson.error || 'Errore creazione pratica CT');
      }

      const practiceId = createJson.practice_id;

      // 2) Salva interventi selezionati via workflow API
      const saveRes = await fetch('/.netlify/functions/ct-practice-interventions-save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ practice_id: practiceId, selected: ctCodes })
      });
      const saveJson = await saveRes.json();
      if (!saveJson.ok) {
        // Se FV-PDC senza PDC o vincoli CT: qui ricevi l’errore “corretto” dal backend
        throw new Error(saveJson.error || 'Errore salvataggio interventi CT');
      }

      // 3) Redirect al dettaglio workflow reale
      window.location.assign(`/ct30/workflow/detail.html?id=${encodeURIComponent(practiceId)}`);
    } catch (e) {
      alert(e.message);
    }
  })();
});

el('btn_route_alt').addEventListener('click', () => {
  alert('Instradamento alternativo non ancora implementato in MVP.');
});
