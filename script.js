const apiBaseUrl = 'https://api.coingecko.com/api/v3';
let chart; // Declare the chart variable globally
const maxSelectedCoins = 2; // Allow only two selected coins
let selectedCoins = []; // Store selected coin values

async function fetchCryptoData() {
    const loadingIndicator = document.getElementById('loading');
    loadingIndicator.style.display = 'block'; // Show loading indicator

    try {
        const pricePromises = selectedCoins.map(currency =>
            fetch(`${apiBaseUrl}/simple/price?ids=${currency}&vs_currencies=usd&include_market_cap=true&include_24hr_vol=true&include_24hr_change=true&include_last_updated_at=true`)
        );

        const pricesData = await Promise.all(pricePromises);
        const priceInfo = await Promise.all(pricesData.map(response => response.json()));

        // Fetch historical data for the last 30 days
        const historicalPromises = selectedCoins.map(currency =>
            fetch(`${apiBaseUrl}/coins/${currency}/market_chart?vs_currency=usd&days=30`)
        );

        const historicalData = await Promise.all(historicalPromises);
        const historicalInfo = await Promise.all(historicalData.map(response => response.json()));

        const allPriceData = selectedCoins.map((currency, index) => {
            const priceData = priceInfo[index][currency];
            const historicalPrices = historicalInfo[index].prices.map(price => price[1]);
            const historicalDates = historicalInfo[index].prices.map(price => new Date(price[0]).toLocaleDateString());

            return {
                currency,
                price: priceData.usd,
                marketCap: priceData.usd_market_cap,
                volume: priceData.usd_24h_vol,
                change: priceData.usd_24h_change,
                historicalPrices,
                historicalDates,
            };
        });

        updateCryptoData(allPriceData);
        renderChart(allPriceData);
    } catch (error) {
        console.error("Error fetching crypto data:", error);
    } finally {
        loadingIndicator.style.display = 'none'; // Hide loading indicator
    }
}

function updateCryptoData(allPriceData) {
    const cryptoDataDiv = document.getElementById('crypto-data');
    cryptoDataDiv.innerHTML = `
        <table class="crypto-table">
            <thead>
                <tr>
                    <th>Currency</th>
                    <th>Price (USD)</th>
                    <th>Market Cap (USD)</th>
                    <th>24h Volume (USD)</th>
                    <th>24h Change (%)</th>
                </tr>
            </thead>
            <tbody>
                ${allPriceData.map(data => `
                    <tr>
                        <td>${data.currency.charAt(0).toUpperCase() + data.currency.slice(1)}</td>
                        <td>$${data.price.toFixed(2)}</td>
                        <td>$${data.marketCap.toLocaleString()}</td>
                        <td>$${data.volume.toLocaleString()}</td>
                        <td style="color: ${data.change < 0 ? 'red' : 'green'};">${data.change.toFixed(2)}%</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

function renderChart(allPriceData) {
    const ctx = document.getElementById('crypto-chart').getContext('2d');
    
    if (chart) {
        chart.destroy(); // Destroy existing chart instance
    }

    // Prepare data for chart
    const datasets = allPriceData.map((data, index) => ({
        label: data.currency.charAt(0).toUpperCase() + data.currency.slice(1),
        data: data.historicalPrices,
        borderColor: index === 0 ? 'red' : 'grey', // Color based on selection
        backgroundColor: 'rgba(255, 0, 0, 0.2)',
        fill: true,
    }));

    chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: allPriceData[0].historicalDates,
            datasets: datasets,
        },
        options: {
            scales: {
                y: {
                    beginAtZero: false,
                },
            },
        },
    });
}

// Handle icon click events
const cryptoIcons = document.querySelectorAll('.crypto-checkbox');
cryptoIcons.forEach(icon => {
    icon.addEventListener('click', function() {
        const currency = this.value;

        if (selectedCoins.includes(currency)) {
            // Deselect the icon
            selectedCoins = selectedCoins.filter(coin => coin !== currency);
            updateIconStyles();
        } else {
            // Add the new coin and handle selection
            if (selectedCoins.length < maxSelectedCoins) {
                selectedCoins.push(currency);
            } else {
                selectedCoins[0] = currency; // Replace the first selected coin
            }
            updateIconStyles();
        }

        // Fetch data if there are coins selected
        if (selectedCoins.length > 0) {
            fetchCryptoData();
        }
    });
});

// Update the ring styles for icons based on selection
function updateIconStyles() {
    cryptoIcons.forEach(icon => {
        const currency = icon.value;
        const iconElement = icon.nextElementSibling; // Get the associated image

        if (selectedCoins.length === 0) {
            iconElement.style.border = 'none';
        } else if (selectedCoins[0] === currency) {
            iconElement.style.border = '5px solid grey'; // First selected coin
        } else if (selectedCoins[1] === currency) {
            iconElement.style.border = '5px solid red'; // Second selected coin
        } else {
            iconElement.style.border = 'none'; // Not selected
        }
    });
}

// Fetch data for the default selected currency on load
fetchCryptoData();
