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

function fetchData() {
    const startDate = document.getElementById('startDate').valueAsNumber;
    const endDate = document.getElementById('endDate').valueAsNumber;

    let url = 'http://192.168.1.68:6969/weights/filter/';
    if (startDate && endDate) {
        url += `?start_date=${startDate}&end_date=${endDate}`;
    } else {
        let now = new Date()
        const end = now.valueOf();
        
        //subtract 5 min voor de start tijd
        now.setMinutes(now.getMinutes() - 5);
        
        const start = lastClearTime ? lastClearTime.valueOf() : now.valueOf();
        url += `?start_date=${start}&end_date=${end}`;
    }

    fetch(url)
        .then(response => response.json())
        .then(data => {
            console.log('Received data:', data);
            if (data.length === 0) {
                displayNotification('No data available for the selected range.', true);
                return;
            }
            
            // Parse timestamps correctly
            const dates = data.map(item => parseTimestamp(item.timestamp));
            
            // Sort data by date
            data.sort((a, b) => new Date(a.date) - new Date(b.date));
            
            // Use the parsed dates instead of the incorrect 'date' field
            const weights = data.map(item => item.weight);
            const formattedDates = dates.map(date => {
                // Format the date string as desired (e.g., 'YYYY-MM-DD HH')
                const year = date.getFullYear();
                const month = (date.getMonth() + 1).toString().padStart(2, '0'); // Month is zero-indexed
                const day = date.getDate().toString().padStart(2, '0');
                const hours = date.getHours().toString().padStart(2, '0');
            
                return `${year}-${month}-${day} ${hours}`;
            });
            foodChart.data.labels = formattedDates;
            foodChart.data.datasets[0].data = weights;
            foodChart.update();
        })
        .catch(error => {
            console.error('Error fetching data:', error);
            displayNotification('Failed to fetch data. Please check your connection.', true);
        });
}

document.addEventListener('DOMContentLoaded', () => {
    fetchData();
    setInterval(() => {
        if (!document.getElementById('startDate').value && !document.getElementById('endDate').value) {
            fetchData(); // update only if no dates are selected
        }
    }, 1000); // refresh elke second
});

function showToday() {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(),0,0,0).valueOf();
    const nowString = now.valueOf();
    document.getElementById('startDate').value = startOfToday;
    document.getElementById('endDate').value = nowString;
    fetchData();
}

function showYesterday() {
    const now = new Date();
    const startOfYesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1,0,0,0).valueOf();
    const endOfYesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59).valueOf();
    document.getElementById('startDate').value = startOfYesterday;
    document.getElementById('endDate').value = endOfYesterday;
    fetchData();
}

function clearChart() {
    foodChart.data.labels = [];
    foodChart.data.datasets[0].data = [];
    foodChart.update();
    lastClearTime = new Date();
    document.getElementById('startDate').value = null;
    document.getElementById('endDate').value = null;
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

// Function to parse the timestamp string into a Date object
function parseTimestamp(timestampString) {
    // Split the timestamp string into its components
    const [datePart, timePart] = timestampString.split(' ');
    const [year, month, day] = datePart.split('-');
    const [hours, minutes, seconds] = timePart.split(':');

    // Create a new Date object using the components
    return new Date(Date.UTC(year, month - 1, day, hours));
}
