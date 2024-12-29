const ctx = document.getElementById('foodChart').getContext('2d');
let foodChart = new Chart(ctx, {
    type: 'line',
    data: {
        labels: [], // time labels
        datasets: [{
            label: 'Weight of Cat Food (g)',
            data: [],
            backgroundColor: 'rgba(255, 99, 132, 0.2)',
            borderColor: 'rgba(255, 99, 132, 1)',
            borderWidth: 1
        }]
    },
    options: {
        scales: {
            y: {
                reverse: true,
                beginAtZero: true,
                suggestedMin: 0, 
                suggestedMax: 200 
            }
        }
    }
});

let lastClearTime = null;
async function fetchPrediction(startDate, endDate) {
    try {
        const response = await fetch(`http://192.168.1.68:6969/predict/?start_date=${startDate}&end_date=${endDate}`);
        const prediction = await response.json();
        
        // Update prediction display
        const predictionAmount = document.getElementById('predictionAmount');
        const predictionConfidence = document.getElementById('predictionConfidence');
        
        predictionAmount.textContent = `${prediction.food_added.toFixed(1)}g`;
        predictionConfidence.textContent = `Confidence: ${(prediction.confidence * 100).toFixed(1)}%`;
    } catch (error) {
        console.error('Error fetching prediction:', error);
        displayNotification('Failed to fetch prediction.', true);
    }
}

function fetchData() {
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;

    let url = 'http://192.168.1.68:6969/weights/filter/';
    let startTimestamp, endTimestamp;

    if (startDate && endDate) {
        startTimestamp = new Date(startDate).getTime();
        endTimestamp = new Date(endDate).getTime();
    } else {
        const now = new Date();
        endTimestamp = now.getTime();
        startTimestamp = lastClearTime ? lastClearTime.getTime() : now.getTime() - 5 * 60 * 1000;
    }

    url += `?start_date=${startTimestamp}&end_date=${endTimestamp}`;

    fetch(url)
        .then(response => response.json())
        .then(data => {
            console.log('Received data:', data);
            if (data.length === 0) {
                displayNotification('No data available for the selected range.', true);
                return;
            }
            
            // Parse timestamps and adjust for local timezone
            const dates = data.map(item => adjustToLocalTimezone(new Date(item.timestamp)));
            
            // Sort data by date
            data.sort((a, b) => adjustToLocalTimezone(new Date(a.timestamp)) - adjustToLocalTimezone(new Date(b.timestamp)));
            
            const weights = data.map(item => item.weight);
            const formattedDates = dates.map(date => formatDate(date));
            
            foodChart.data.labels = formattedDates;
            foodChart.data.datasets[0].data = weights;
            foodChart.update();

            // Fetch prediction for the timeframe
            fetchPrediction(startTimestamp, endTimestamp);
        })
        .catch(error => {
            console.error('Error fetching data:', error);
            displayNotification('Failed to fetch data. Please check your connection.', true);
        });
}

function adjustToLocalTimezone(date) {
    return new Date(date.getTime() + date.getTimezoneOffset() * 60000);
}

function formatDate(date) {
    return date.toLocaleString('en-GB', { 
        year: 'numeric', 
        month: '2-digit', 
        day: '2-digit', 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
    }).replace(',', '');
}


function setDateTimeInputValue(elementId, date) {
    const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    const formattedDate = localDate.toISOString().slice(0, 16);
    document.getElementById(elementId).value = formattedDate;
}

function showToday() {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    setDateTimeInputValue('startDate', startOfToday);
    setDateTimeInputValue('endDate', endOfToday);
    fetchData();
}

function showYesterday() {
    const now = new Date();
    const startOfYesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
    const endOfYesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59);
    setDateTimeInputValue('startDate', startOfYesterday);
    setDateTimeInputValue('endDate', endOfYesterday);
    fetchData();
}

function clearChart() {
    foodChart.data.labels = [];
    foodChart.data.datasets[0].data = [];
    foodChart.update();
    lastClearTime = new Date();
    document.getElementById('startDate').value = '';
    document.getElementById('endDate').value = '';
    document.getElementById('predictionAmount').textContent = '-';
    document.getElementById('predictionConfidence').textContent = 'Confidence: -';
    displayNotification('Chart cleared. New data will be shown from now.', false);
}

function displayNotification(message, isError = false) {
    const notification = document.createElement('div');
    notification.textContent = message;
    notification.style.backgroundColor = isError ? 'red' : 'green';
    notification.style.color = 'white';
    notification.style.padding = '10px';
    notification.style.marginTop = '10px';
    notification.style.borderRadius = '5px';
    document.body.appendChild(notification);
    setTimeout(() => {
        document.body.removeChild(notification);
    }, 5000);
}

document.addEventListener('DOMContentLoaded', () => {
    fetchData();
    setInterval(() => {
        if (!document.getElementById('startDate').value && !document.getElementById('endDate').value) {
            fetchData(); // update only if no dates are selected
        }
    }, 1000); // refresh every second
});