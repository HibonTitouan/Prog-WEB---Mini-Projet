let allData = [];
let map;
let geoLayer;
let chartLineInstance = null;
let chartBarInstance = null;

let monthsByYear = {};
let deptsByRegion = {};

// Initialisation au chargement
document.addEventListener('DOMContentLoaded', async () => {
    if (document.getElementById('map')) {
        initMap();
    }
    await loadData();
});

function initMap() {
    map = L.map('map').setView([46.603354, 1.888334], 6);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);
}

/* -------------------------------------------------------------------------- */
/*                         CHARGEMENT DES DONNEES JSON                        */
/* -------------------------------------------------------------------------- */

async function loadData() {
    try {
        const response = await fetch('evolution_indicateurs_cles_ac.json');
        if (!response.ok) {
            throw new Error(`Erreur HTTP: ${response.status}`);
        }
        allData = await response.json();

        if (!Array.isArray(allData) || allData.length === 0) {
            console.error('Aucune donnée disponible');
            return;
        }

        buildLookups();
        populateFilters();
        attachFilterListeners();
        updateDashboard();
    } catch (error) {
        console.error('Erreur de chargement des données :', error);
    }
}

/* -------------------------------------------------------------------------- */
/*                           CONSTRUCTION DES LOOKUPS                         */
/* -------------------------------------------------------------------------- */

function buildLookups() {
    monthsByYear = {};
    deptsByRegion = {};

    allData.forEach(d => {
        if (!d.annee_mois) return;
        const year = d.annee_mois.substring(0, 4);
        if (!monthsByYear[year]) monthsByYear[year] = new Set();
        monthsByYear[year].add(d.annee_mois);

        if (d.region) {
            if (!deptsByRegion[d.region]) deptsByRegion[d.region] = new Set();
            if (d.departement && d.departement !== 'Total') {
                deptsByRegion[d.region].add(d.departement);
            }
        }
    });
}

/* -------------------------------------------------------------------------- */
/*                               GESTION FILTRES                              */
/* -------------------------------------------------------------------------- */

function populateFilters() {
    const regionSelect = document.getElementById('select-region');
    const deptSelect = document.getElementById('select-dept');
    const yearSelect = document.getElementById('select-year');
    const dateSelect = document.getElementById('select-date');

    if (!regionSelect || !deptSelect || !yearSelect || !dateSelect) return;

    const allRegions = Object.keys(deptsByRegion).sort();
    const allYears = Object.keys(monthsByYear).sort().reverse();

    // Régions
    regionSelect.innerHTML = '';
    const optRegAll = new Option('France entière', 'all');
    optRegAll.selected = true;
    regionSelect.add(optRegAll);
    allRegions.forEach(r => regionSelect.add(new Option(r, r)));

    // Départements (sera affiné en fonction des régions)
    deptSelect.innerHTML = '';
    const optDeptAll = new Option('Tous les départements', 'all');
    optDeptAll.selected = true;
    deptSelect.add(optDeptAll);
    // On ajoute tous les départements pour l'instant
    const allDepts = new Set();
    Object.values(deptsByRegion).forEach(set => set.forEach(d => allDepts.add(d)));
    [...allDepts].sort().forEach(d => deptSelect.add(new Option(d, d)));

    // Années
    yearSelect.innerHTML = '';
    const optYearAll = new Option("Tout l'historique", 'all');
    optYearAll.selected = true;
    yearSelect.add(optYearAll);
    allYears.forEach(y => yearSelect.add(new Option(y, y)));

    // Mois (sera affiné ensuite)
    dateSelect.innerHTML = '';
    const optMonthAll = new Option("Tout l'historique", 'all');
    optMonthAll.selected = true;
    dateSelect.add(optMonthAll);

    // Ajout de tous les mois au départ
    const allMonths = new Set();
    Object.values(monthsByYear).forEach(set => set.forEach(m => allMonths.add(m)));
    [...allMonths].sort().reverse().forEach(m => dateSelect.add(new Option(m, m)));
}

function attachFilterListeners() {
    const regionSelect = document.getElementById('select-region');
    const deptSelect = document.getElementById('select-dept');
    const yearSelect = document.getElementById('select-year');
    const dateSelect = document.getElementById('select-date');

    if (yearSelect) {
        yearSelect.addEventListener('change', () => {
            normaliseMultiSelect(yearSelect);
            updateMonthOptions();
            updateDashboard();
        });
    }

    if (dateSelect) {
        dateSelect.addEventListener('change', () => {
            normaliseMultiSelect(dateSelect);
            updateDashboard();
        });
    }

    if (regionSelect) {
        regionSelect.addEventListener('change', () => {
            normaliseMultiSelect(regionSelect);
            updateDeptOptions();
            updateDashboard();
        });
    }

    if (deptSelect) {
        deptSelect.addEventListener('change', () => {
            normaliseMultiSelect(deptSelect);
            updateDashboard();
        });
    }
}

function normaliseMultiSelect(select, allValue = 'all') {
    const selected = Array.from(select.selectedOptions).map(o => o.value);
    if (selected.length > 1 && selected.includes(allValue)) {
        // si "all" + autres -> on décoche "all"
        Array.from(select.options).forEach(o => {
            if (o.value === allValue) o.selected = false;
        });
    } else if (selected.length === 0) {
        // aucune sélection -> on remet "all"
        const optAll = Array.from(select.options).find(o => o.value === allValue);
        if (optAll) optAll.selected = true;
    }
}

function getMultiSelectValues(select, allValue = 'all') {
    const values = Array.from(select.selectedOptions || []).map(o => o.value);
    if (values.length === 0 || values.includes(allValue)) {
        return [allValue];
    }
    return values;
}

/* ---- Filtres dépendants -------------------------------------------------- */

function updateMonthOptions() {
    const yearSelect = document.getElementById('select-year');
    const dateSelect = document.getElementById('select-date');
    if (!yearSelect || !dateSelect) return;

    const years = getMultiSelectValues(yearSelect, 'all');
    const prevSelected = Array.from(dateSelect.selectedOptions).map(o => o.value);

    const monthSet = new Set();
    if (years.includes('all')) {
        Object.values(monthsByYear).forEach(set => set.forEach(m => monthSet.add(m)));
    } else {
        years.forEach(y => {
            const set = monthsByYear[y];
            if (set) set.forEach(m => monthSet.add(m));
        });
    }

    const months = [...monthSet].sort().reverse();
    dateSelect.innerHTML = '';
    const optAll = new Option("Tout l'historique", 'all');
    dateSelect.add(optAll);

    months.forEach(m => {
        const opt = new Option(m, m);
        dateSelect.add(opt);
    });

    // Réappliquer la sélection si possible
    const newOptions = new Set(months.concat(['all']));
    prevSelected.forEach(v => {
        if (newOptions.has(v)) {
            const opt = Array.from(dateSelect.options).find(o => o.value === v);
            if (opt) opt.selected = true;
        }
    });
    normaliseMultiSelect(dateSelect);
}

function updateDeptOptions() {
    const regionSelect = document.getElementById('select-region');
    const deptSelect = document.getElementById('select-dept');
    if (!regionSelect || !deptSelect) return;

    const regions = getMultiSelectValues(regionSelect, 'all');
    const prevSelected = Array.from(deptSelect.selectedOptions).map(o => o.value);

    const deptSet = new Set();

    if (regions.includes('all')) {
        Object.values(deptsByRegion).forEach(set => set.forEach(d => deptSet.add(d)));
    } else {
        regions.forEach(r => {
            const set = deptsByRegion[r];
            if (set) set.forEach(d => deptSet.add(d));
        });
    }

    const depts = [...deptSet].sort();

    deptSelect.innerHTML = '';
    const optAll = new Option('Tous les départements', 'all');
    deptSelect.add(optAll);
    depts.forEach(d => deptSelect.add(new Option(d, d)));

    // Réappliquer la sélection valide
    const newOptions = new Set(depts.concat(['all']));
    prevSelected.forEach(v => {
        if (newOptions.has(v)) {
            const opt = Array.from(deptSelect.options).find(o => o.value === v);
            if (opt) opt.selected = true;
        }
    });
    normaliseMultiSelect(deptSelect);
}

/* -------------------------------------------------------------------------- */
/*                          MISE A JOUR DU TABLEAU DE BORD                    */
/* -------------------------------------------------------------------------- */

function updateDashboard() {
    if (!allData || allData.length === 0) return;

    const regionSelect = document.getElementById('select-region');
    const deptSelect = document.getElementById('select-dept');
    const yearSelect = document.getElementById('select-year');
    const dateSelect = document.getElementById('select-date');

    const regions = getMultiSelectValues(regionSelect, 'all');
    const depts = getMultiSelectValues(deptSelect, 'all');
    const years = getMultiSelectValues(yearSelect, 'all');
    const months = getMultiSelectValues(dateSelect, 'all');

    const filterByRegion = !regions.includes('all');
    const filterByDept = !depts.includes('all');
    const filterByYear = !years.includes('all');
    const filterByMonth = !months.includes('all');

    const regionSet = new Set(filterByRegion ? regions : []);
    const deptSet = new Set(filterByDept ? depts : []);
    const yearSet = new Set(filterByYear ? years : []);
    const monthSet = new Set(filterByMonth ? months : []);

    const filtered = allData.filter(d => {
        if (!d.annee_mois) return false;
        const year = d.annee_mois.substring(0, 4);

        if (filterByYear && !yearSet.has(year)) return false;
        if (filterByMonth && !monthSet.has(d.annee_mois)) return false;
        if (filterByRegion && !regionSet.has(d.region)) return false;
        if (filterByDept && !deptSet.has(d.departement)) return false;
        return true;
    });

    const dataForKPI = filtered.filter(d => d.departement && d.departement !== 'Total');

    updateKPI(dataForKPI);
    updateMap(filtered);
    updateCharts(filtered);
}

/* -------------------------------------------------------------------------- */
/*                                    KPI                                     */
/* -------------------------------------------------------------------------- */

function updateKPI(data) {
    const kpiAlloc = document.getElementById('kpi-alloc');
    const kpiDepense = document.getElementById('kpi-depense');

    if (!kpiAlloc || !kpiDepense) return;

    if (!data || data.length === 0) {
        kpiAlloc.textContent = '—';
        kpiDepense.textContent = '—';
        return;
    }

    const totalAlloc = data.reduce((s, d) => s + (d.nb_alloc || 0), 0);
    const totalDepense = data.reduce((s, d) => s + (d.depense || 0), 0);

    kpiAlloc.textContent = new Intl.NumberFormat('fr-FR').format(totalAlloc);
    kpiDepense.textContent = new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: 'EUR',
        maximumFractionDigits: 0
    }).format(totalDepense);
}

/* -------------------------------------------------------------------------- */
/*                                   CARTE                                    */
/* -------------------------------------------------------------------------- */

function updateMap(data) {
    if (!map || !document.getElementById('map')) return;

    if (geoLayer) {
        map.removeLayer(geoLayer);
    }

    // Agrégation par département
    const byDept = {};
    (data || []).forEach(d => {
        if (!d.departement || d.departement === 'Total') return;
        if (!d.geo_departement || d.geo_departement.type !== 'Feature') return;

        if (!byDept[d.departement]) {
            byDept[d.departement] = {
                nb_alloc: 0,
                feature: d.geo_departement
            };
        }
        byDept[d.departement].nb_alloc += d.nb_alloc || 0;
    });

    const features = Object.keys(byDept).map(dep => {
        const info = byDept[dep];
        const f = { ...info.feature };
        f.properties = f.properties || {};
        f.properties.nom = dep;
        f.properties.nb_alloc = info.nb_alloc;
        return f;
    });

    if (features.length === 0) return;

    // Effet choroplèthe basé sur le nombre d'allocataires
    function getColor(v) {
        return v > 50000 ? '#08306b' :
               v > 30000 ? '#08519c' :
               v > 15000 ? '#2171b5' :
               v > 8000  ? '#4292c6' :
               v > 4000  ? '#6baed6' :
               v > 2000  ? '#9ecae1' :
               v > 1000  ? '#c6dbef' :
                           '#eff3ff';
    }

    geoLayer = L.geoJSON(features, {
        style: f => ({
            fillColor: getColor(f.properties.nb_alloc),
            weight: 1,
            opacity: 1,
            color: 'white',
            dashArray: '3',
            fillOpacity: 0.7
        }),
        onEachFeature: (f, layer) => {
            layer.bindPopup(
                `<strong>${f.properties.nom}</strong><br>` +
                `Allocataires : ${new Intl.NumberFormat('fr-FR').format(f.properties.nb_alloc)}`
            );
        }
    }).addTo(map);

    const group = new L.featureGroup(features.map(f => L.geoJSON(f)));
    map.fitBounds(group.getBounds());
}

/* -------------------------------------------------------------------------- */
/*                                GRAPHIQUES                                  */
/* -------------------------------------------------------------------------- */

function updateCharts(data) {
    const history = data.filter(d => d.departement && d.departement !== 'Total');

    const group = {};
    history.forEach(d => {
        const date = d.annee_mois;
        if (!group[date]) {
            group[date] = { depense: 0, part: 0, count: 0 };
        }
        group[date].depense += d.depense || 0;
        group[date].part += d.part_travail || 0;
        group[date].count++;
    });

    const labels = Object.keys(group).sort();
    const dep = labels.map(l => group[l].depense);
    const part = labels.map(l => group[l].count ? (group[l].part / group[l].count) * 100 : 0);

    const ctx1 = document.getElementById('chartLine');
    if (ctx1) {
        if (chartLineInstance) chartLineInstance.destroy();
        chartLineInstance = new Chart(ctx1.getContext('2d'), {
            type: 'line',
            data: {
                labels,
                datasets: [{
                    label: 'Dépenses (€)',
                    data: dep,
                    borderColor: 'rgb(0, 161, 154)',
                    tension: 0.1
                }]
            }
        });
    }

    const ctx2 = document.getElementById('chartBar');
    if (ctx2) {
        if (chartBarInstance) chartBarInstance.destroy();
        chartBarInstance = new Chart(ctx2.getContext('2d'), {
            type: 'bar',
            data: {
                labels,
                datasets: [{
                    label: 'Part Travail (%)',
                    data: part,
                    backgroundColor: 'rgba(0, 84, 164, 0.6)'
                }]
            }
        });
    }
}
