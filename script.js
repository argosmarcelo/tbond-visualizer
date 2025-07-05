let allData = [];
let chart;

document.getElementById('fileInput').addEventListener('change', handleFile);
document.getElementById('loadJson').addEventListener('click', handleManualJson);
document.getElementById('bondSelector').addEventListener('change', updateChart);

function handleFile(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    const content = e.target.result;
    if (file.name.endsWith('.json')) {
      try {
        const parsed = JSON.parse(content);
        validateAndSetData(parsed);
      } catch (err) {
        alert("Erro ao ler JSON.");
      }
    } else if (file.name.endsWith('.csv')) {
      const parsed = parseCSV(content);
      validateAndSetData(parsed);
    }
  };
  reader.readAsText(file);
}

function handleManualJson() {
  try {
    const input = document.getElementById('jsonInput').value.trim();
    if (!input) throw new Error("JSON vazio");
    const parsed = JSON.parse(input);
    validateAndSetData(parsed);
  } catch (err) {
    alert("JSON inválido: " + err.message);
  }
}

function validateAndSetData(parsed) {
  if (!Array.isArray(parsed)) throw new Error("O JSON deve ser um array de objetos.");
  const hasRequiredFields = parsed.every(item =>
    item.bond && item.date && !isNaN(parseFloat(item.price)) && !isNaN(parseFloat(item.yield))
  );
  if (!hasRequiredFields) throw new Error("Alguns registros estão incompletos ou com dados inválidos.");

  allData = parsed.map(item => ({
    bond: item.bond,
    date: item.date,
    price: parseFloat(item.price),
    yield: parseFloat(item.yield)
  }));

  populateBondSelector();
}

function parseCSV(csv) {
  const [header, ...lines] = csv.trim().split('\n');
  const fields = header.split(',');
  return lines.map(line => {
    const obj = {};
    line.split(',').forEach((val, i) => {
      const key = fields[i].trim();
      const cleanVal = val.replace(/"/g, '').trim();
      obj[key] = (key === 'price' || key === 'yield') ? parseFloat(cleanVal) : cleanVal;
    });
    return obj;
  });
}

function populateBondSelector() {
  const selector = document.getElementById('bondSelector');
  selector.innerHTML = '';

  const bonds = [...new Set(allData.map(d => d.bond))];
  bonds.forEach(bond => {
    const opt = document.createElement('option');
    opt.value = bond;
    opt.textContent = bond;
    opt.selected = true;
    selector.appendChild(opt);
  });

  updateChart();
}

function updateChart() {
  const selected = Array.from(document.getElementById('bondSelector').selectedOptions).map(o => o.value);
  const ctx = document.getElementById('chart').getContext('2d');

  const datasets = [];

  selected.forEach((bond, idx) => {
    const bondData = allData
      .filter(d => d.bond === bond)
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    const priceData = bondData.map(d => ({
      x: new Date(d.date + 'T00:00:00'),
      y: d.price
    }));

    const yieldData = bondData.map(d => ({
      x: new Date(d.date + 'T00:00:00'),
      y: d.yield
    }));

    datasets.push(
      {
        label: `${bond} - Preço`,
        data: priceData,
        borderColor: `hsl(${idx * 60}, 70%, 50%)`,
        backgroundColor: `hsl(${idx * 60}, 70%, 70%)`,
        borderWidth: 2,
        tension: 0.4,
        pointRadius: 2,
        fill: false,
        yAxisID: 'y'
      },
      {
        label: `${bond} - Yield`,
        data: yieldData,
        borderColor: `hsl(${(idx * 60 + 30) % 360}, 60%, 35%)`,
        backgroundColor: `hsl(${(idx * 60 + 30) % 360}, 70%, 65%)`,
        borderDash: [4, 4],
        borderWidth: 2,
        tension: 0.4,
        pointRadius: 2,
        fill: false,
        yAxisID: 'y1'
      }
    );
  });

  const allDates = datasets.flatMap(ds => ds.data.map(d => new Date(d.x)));
  const minDate = new Date(Math.min(...allDates));
  const maxDate = new Date(Math.max(...allDates));
  minDate.setDate(minDate.getDate() - 1);
  maxDate.setDate(maxDate.getDate() + 1);

  if (chart) chart.destroy();

  chart = new Chart(ctx, {
    type: 'line',
    data: { datasets },
    options: {
      parsing: false,
      responsive: true,
      interaction: {
        mode: 'index',
        intersect: false
      },
      scales: {
        x: {
          type: 'time',
          time: { unit: 'day' },
          min: minDate,
          max: maxDate,
          title: { display: true, text: 'Data' }
        },
        y: {
          type: 'linear',
          position: 'left',
          title: { display: true, text: 'Preço ($)' }
        },
        y1: {
          type: 'linear',
          position: 'right',
          title: { display: true, text: 'Yield (%)' },
          grid: { drawOnChartArea: false }
        }
      },
      plugins: {
        legend: { display: true },
        tooltip: {
          callbacks: {
            title: (items) => new Date(items[0].parsed.x).toLocaleDateString('pt-BR')
          }
        }
      }
    }
  });
}
