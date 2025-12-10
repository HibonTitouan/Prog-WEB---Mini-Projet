let allData = [];
let monthsByYear = {};
let deptsByRegion = {};

let profilChart = null;
let pieDepenseDeptChart = null;
let odFddChart = null;

// Initialisation au chargement de la page
document.addEventListener('DOMContentLoaded', async () => {
    await loadData();
});

/* -------------------------------------------------------------------------- */
/*                        CHARGEMENT DES DONNEES JSON                         */
/* -------------------------------------------------------------------------- */

async function loadData() {
    try {
        const response = await fetch('evolution_indicateurs_cles_ac.json');
        if (!response.ok) {
            throw new Error(`Erreur HTTP: ${response.status}`);
        }
        const json = await response.json();
        if (!Array.isArray(json) || json.length === 0) {
            console.error('Le fichier JSON est vide ou invalide.');
            return;
        }
        allData = json;
        buildLookups();
        populateFilters();
        attachFilterListeners();
        updateDashboard();
    } catch (error) {
        console.error('Erreur lors du chargement des données :', error);
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
    const deptSelect = document.getElementById('select-departement');
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

    // Départements
    deptSelect.innerHTML = '';
    const optDeptAll = new Option('Tous les départements', 'all');
    optDeptAll.selected = true;
    deptSelect.add(optDeptAll);
    const allDepts = new Set();
    Object.values(deptsByRegion).forEach(set => set.forEach(d => allDepts.add(d)));
    [...allDepts].sort().forEach(d => deptSelect.add(new Option(d, d)));

    // Années
    yearSelect.innerHTML = '';
    const optYearAll = new Option("Tout l'historique", 'all');
    optYearAll.selected = true;
    yearSelect.add(optYearAll);
    allYears.forEach(y => yearSelect.add(new Option(y, y)));

    // Mois
    dateSelect.innerHTML = '';
    const optMonthAll = new Option("Tout l'historique", 'all');
    optMonthAll.selected = true;
    dateSelect.add(optMonthAll);
    const allMonths = new Set();
    Object.values(monthsByYear).forEach(set => set.forEach(m => allMonths.add(m)));
    [...allMonths].sort().reverse().forEach(m => dateSelect.add(new Option(m, m)));
}

function attachFilterListeners() {
    const regionSelect = document.getElementById('select-region');
    const deptSelect = document.getElementById('select-departement');
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
        Array.from(select.options).forEach(o => {
            if (o.value === allValue) o.selected = false;
        });
    } else if (selected.length === 0) {
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
    months.forEach(m => dateSelect.add(new Option(m, m)));

    const newOpts = new Set(months.concat(['all']));
    prevSelected.forEach(v => {
        if (newOpts.has(v)) {
            const opt = Array.from(dateSelect.options).find(o => o.value === v);
            if (opt) opt.selected = true;
        }
    });
    normaliseMultiSelect(dateSelect);
}

function updateDeptOptions() {
    const regionSelect = document.getElementById('select-region');
    const deptSelect = document.getElementById('select-departement');
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

    const newOpts = new Set(depts.concat(['all']));
    prevSelected.forEach(v => {
        if (newOpts.has(v)) {
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
    const deptSelect = document.getElementById('select-departement');
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

    let dataFiltered = allData.filter(d => d.departement && d.departement !== 'Total');

    dataFiltered = dataFiltered.filter(d => {
        if (!d.annee_mois) return false;
        const year = d.annee_mois.substring(0, 4);

        if (filterByYear && !yearSet.has(year)) return false;
        if (filterByMonth && !monthSet.has(d.annee_mois)) return false;
        if (filterByRegion && !regionSet.has(d.region)) return false;
        if (filterByDept && !deptSet.has(d.departement)) return false;
        return true;
    });

    updateKPIProtection(dataFiltered);
    updateProfilIndemnisation(dataFiltered);
    updateTerritoires(dataFiltered);
    updatePieDepense(dataFiltered);

    updateFluxSection(regions, depts, years); // flux = série temporelle
}

/* -------------------------------------------------------------------------- */
/*                       SECTION 1 : NIVEAU DE PROTECTION                     */
/* -------------------------------------------------------------------------- */

function updateKPIProtection(data) {
    const kpiDepMoy = document.getElementById('kpi-depense-moyenne');
    const kpiAjMoy = document.getElementById('kpi-aj-moyenne');

    if (!kpiDepMoy || !kpiAjMoy) return;

    if (!data || data.length === 0) {
        kpiDepMoy.textContent = '—';
        kpiAjMoy.textContent = '—';
        return;
    }

    let totalAlloc = 0;
    let totalDepense = 0;
    let sumAj = 0;
    let sumPoidsAj = 0;

    data.forEach(d => {
        const alloc = d.nb_alloc || 0;
        const depense = d.depense || 0;
        const aj = d.aj_moy || 0;
        const poidsAj = d.nb_indemnises || d.nb_alloc || 0;

        totalAlloc += alloc;
        totalDepense += depense;
        sumAj += aj * poidsAj;
        sumPoidsAj += poidsAj;
    });

    const depMoy = totalAlloc > 0 ? totalDepense / totalAlloc : 0;
    const ajMoy = sumPoidsAj > 0 ? sumAj / sumPoidsAj : 0;

    kpiDepMoy.textContent = formatEuro(depMoy);
    kpiAjMoy.textContent = formatEuro(ajMoy);
}

/* -------------------------------------------------------------------------- */
/*           SECTION 2 : PROFIL D'ACTIVITE ET D'INDEMNISATION                 */
/* -------------------------------------------------------------------------- */

function updateProfilIndemnisation(data) {
    const kpiTravailInd = document.getElementById('kpi-part-travail-ind');
    const kpiFormation = document.getElementById('kpi-part-formation');
    const kpiIndemSansTrav = document.getElementById('kpi-part-indem-sans-travail');
    const ctx = document.getElementById('chart-profil-indemnisation');

    if (!kpiTravailInd || !kpiFormation || !kpiIndemSansTrav || !ctx) return;

    if (!data || data.length === 0) {
        kpiTravailInd.textContent = '— %';
        kpiFormation.textContent = '— %';
        kpiIndemSansTrav.textContent = '— %';
        if (profilChart) {
            profilChart.destroy();
            profilChart = null;
        }
        return;
    }

    let totalAlloc = 0;
    let totalIndemnises = 0;
    let totalTravailInd = 0;
    let totalArefAsp = 0;

    data.forEach(d => {
        const alloc = d.nb_alloc || 0;
        const indem = d.nb_indemnises || 0;
        const partTravInd = d.part_travail_ind || 0; // proportion des allocataires
        const nbTravInd = partTravInd * alloc;

        const nbFormation = (d.nb_indemnises_aref || 0) + (d.nb_indemnises_asp || 0);

        totalAlloc += alloc;
        totalIndemnises += indem;
        totalTravailInd += nbTravInd;
        totalArefAsp += nbFormation;
    });

    const partTravIndAlloc = totalAlloc > 0 ? (totalTravailInd / totalAlloc) * 100 : 0;
    const partFormationAlloc = totalAlloc > 0 ? (totalArefAsp / totalAlloc) * 100 : 0;
    const partIndemSansTrav = totalIndemnises > 0 ? ((totalIndemnises - totalTravailInd) / totalIndemnises) * 100 : 0;

    kpiTravailInd.textContent = formatPourcentage(partTravIndAlloc);
    kpiFormation.textContent = formatPourcentage(partFormationAlloc);
    kpiIndemSansTrav.textContent = formatPourcentage(partIndemSansTrav);

    const labels = [
        'Travail + indemnisés',
        'En formation (AREF + ASP)',
        'Indemnisés sans activité'
    ];
    const valeurs = [partTravIndAlloc, partFormationAlloc, partIndemSansTrav];

    if (profilChart) profilChart.destroy();
    profilChart = new Chart(ctx.getContext('2d'), {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                data: valeurs,
                backgroundColor: [
                    'rgba(0, 84, 164, 0.7)',
                    'rgba(0, 161, 154, 0.7)',
                    'rgba(255, 127, 50, 0.7)'
                ]
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    ticks: {
                        callback: value => value + '%'
                    }
                }
            },
            plugins: {
                legend: { display: false }
            }
        }
    });
}

/* -------------------------------------------------------------------------- */
/*                     SECTION 3 : TERRITOIRES / PIE DEPARTEMENT              */
/* -------------------------------------------------------------------------- */

function updateTerritoires(data) {
    const kpiRegion = document.getElementById('kpi-region-plus-aidee');
    const kpiDeptAide = document.getElementById('kpi-dept-plus-aide');
    const kpiDeptCouteux = document.getElementById('kpi-dept-plus-couteux');
    const texteDeptCouteux = document.getElementById('texte-dept-plus-couteux');

    if (!kpiRegion || !kpiDeptAide || !kpiDeptCouteux) return;

    if (!data || data.length === 0) {
        kpiRegion.textContent = '—';
        kpiDeptAide.textContent = '—';
        kpiDeptCouteux.textContent = '—';
        if (texteDeptCouteux) texteDeptCouteux.textContent = '';
        return;
    }

    const byRegion = {};
    const byDeptAlloc = {};
    const byDeptDepense = {};

    data.forEach(d => {
        const region = d.region || 'Non renseigné';
        const dept = d.departement || 'Non renseigné';
        const alloc = d.nb_alloc || 0;
        const depense = d.depense || 0;

        byRegion[region] = (byRegion[region] || 0) + alloc;
        byDeptAlloc[dept] = (byDeptAlloc[dept] || 0) + alloc;
        byDeptDepense[dept] = (byDeptDepense[dept] || 0) + depense;
    });

    // Région la plus aidée
    let bestRegion = null;
    let bestRegionVal = -1;
    Object.entries(byRegion).forEach(([reg, val]) => {
        if (val > bestRegionVal) {
            bestRegionVal = val;
            bestRegion = reg;
        }
    });
    kpiRegion.textContent = bestRegion
        ? `${bestRegion} (${formatNombre(bestRegionVal)} allocataires)`
        : '—';

    // Département le plus aidé
    let bestDeptAlloc = null;
    let bestDeptAllocVal = -1;
    Object.entries(byDeptAlloc).forEach(([dep, val]) => {
        if (val > bestDeptAllocVal) {
            bestDeptAllocVal = val;
            bestDeptAlloc = dep;
        }
    });
    kpiDeptAide.textContent = bestDeptAlloc
        ? `${bestDeptAlloc} (${formatNombre(bestDeptAllocVal)} allocataires)`
        : '—';

    // Département le plus coûteux
    let bestDeptCout = null;
    let bestDeptCoutVal = -1;
    Object.entries(byDeptDepense).forEach(([dep, val]) => {
        if (val > bestDeptCoutVal) {
            bestDeptCoutVal = val;
            bestDeptCout = dep;
        }
    });

    kpiDeptCouteux.textContent = bestDeptCout
        ? `${bestDeptCout} (${formatEuro(bestDeptCoutVal)})`
        : '—';

    if (texteDeptCouteux) {
        texteDeptCouteux.textContent = bestDeptCout
            ? `Département le plus coûteux : ${bestDeptCout} (${formatEuro(bestDeptCoutVal)})`
            : '';
    }
}

function updatePieDepense(data) {
    const ctx = document.getElementById('pieDepenseDept');
    if (!ctx) return;

    if (!data || data.length === 0) {
        if (pieDepenseDeptChart) {
            pieDepenseDeptChart.destroy();
            pieDepenseDeptChart = null;
        }
        return;
    }

    const byDept = {};
    data.forEach(d => {
        if (!d.departement || d.departement === 'Total') return;
        const depense = d.depense || 0;
        byDept[d.departement] = (byDept[d.departement] || 0) + depense;
    });

    const entries = Object.entries(byDept).sort((a, b) => b[1] - a[1]);
    const top = entries.slice(0, 10);
    const others = entries.slice(10);

    const labels = top.map(e => e[0]);
    const valeurs = top.map(e => e[1]);

    if (others.length > 0) {
        labels.push('Autres');
        const sumOthers = others.reduce((s, e) => s + e[1], 0);
        valeurs.push(sumOthers);
    }

    if (pieDepenseDeptChart) pieDepenseDeptChart.destroy();
    pieDepenseDeptChart = new Chart(ctx.getContext('2d'), {
        type: 'pie',
        data: {
            labels,
            datasets: [{
                data: valeurs
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
}

/* -------------------------------------------------------------------------- */
/*                       SECTION 4 : FLUX (OD VS FDD)                         */
/* -------------------------------------------------------------------------- */

function updateFluxSection(regions, depts, years) {
    const kpiOd = document.getElementById('kpi-od-moyennes');
    const kpiFdd = document.getElementById('kpi-fdd-moyennes');
    const ctx = document.getElementById('chart-od-fdd');

    if (!kpiOd || !kpiFdd || !ctx) return;

    let history = allData.filter(d => d.departement && d.departement !== 'Total');

    const filterByRegion = !regions.includes('all');
    const filterByDept = !depts.includes('all');
    const filterByYear = !years.includes('all');

    const regionSet = new Set(filterByRegion ? regions : []);
    const deptSet = new Set(filterByDept ? depts : []);
    const yearSet = new Set(filterByYear ? years : []);

    history = history.filter(d => {
        if (!d.annee_mois) return false;
        const year = d.annee_mois.substring(0, 4);
        if (filterByYear && !yearSet.has(year)) return false;
        if (filterByRegion && !regionSet.has(d.region)) return false;
        if (filterByDept && !deptSet.has(d.departement)) return false;
        return true;
    });

    const group = {};
    history.forEach(d => {
        const date = d.annee_mois;
        if (!date) return;
        if (!group[date]) {
            group[date] = { od: 0, fdd: 0 };
        }
        group[date].od += d.nb_od || 0;
        group[date].fdd += d.fdd || 0;
    });

    const labels = Object.keys(group).sort();
    const serieOd = labels.map(l => group[l].od);
    const serieFdd = labels.map(l => group[l].fdd);

    // KPI : moyenne sur les 12 derniers mois
    const lastLabels = labels.slice(-12);
    if (lastLabels.length === 0) {
        kpiOd.textContent = '—';
        kpiFdd.textContent = '—';
    } else {
        let sumOd = 0;
        let sumFdd = 0;
        lastLabels.forEach(l => {
            sumOd += group[l].od;
            sumFdd += group[l].fdd;
        });
        const denom = lastLabels.length;
        kpiOd.textContent = formatNombre(Math.round(sumOd / denom));
        kpiFdd.textContent = formatNombre(Math.round(sumFdd / denom));
    }

    if (odFddChart) odFddChart.destroy();
    odFddChart = new Chart(ctx.getContext('2d'), {
        type: 'line',
        data: {
            labels,
            datasets: [
                {
                    label: 'Ouvertures de droits',
                    data: serieOd,
                    borderColor: 'rgb(0, 84, 164)',
                    tension: 0.1
                },
                {
                    label: 'Fins de droits',
                    data: serieFdd,
                    borderColor: 'rgb(255, 99, 132)',
                    tension: 0.1
                }
            ]
        }
    });
}

/* -------------------------------------------------------------------------- */
/*                               FONCTIONS UTILES                             */
/* -------------------------------------------------------------------------- */

function formatNombre(n) {
    return new Intl.NumberFormat('fr-FR').format(Math.round(n || 0));
}

function formatEuro(v) {
    return new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: 'EUR',
        maximumFractionDigits: 0
    }).format(v || 0);
}

function formatPourcentage(v) {
    return `${(v || 0).toFixed(1).replace('.', ',')} %`;
}
