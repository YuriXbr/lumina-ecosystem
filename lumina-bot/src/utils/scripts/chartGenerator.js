const { ChartJSNodeCanvas } = require('chartjs-node-canvas');
const ChartDataLabels = require('chartjs-plugin-datalabels');

/** Function to generate a match chart 
* @param {object} participant - The player participant object
* @returns {Buffer} - The image buffer
*/

async function generateMatchChart(participant) {
    const width = 500;
    const height = 300;
    const chartJSNodeCanvas = new ChartJSNodeCanvas({ width, height, plugins: { modern: ['chartjs-plugin-datalabels'] } });

    const statsConfig = {
        maxValues: {
            kills: 30,
            deaths: 15,
            assists: 50,
            totalDamageDealtToChampions: 120000,
            totalDamageTaken: 200000,
            goldEarned: 28000,
            visionScore: 100,
            wardsPlaced: 30,
            totalMinionsKilled: 400
        },
        labelToKeyMap: {
            'Kills': 'kills',
            'Deaths': 'deaths',
            'Assists': 'assists',
            'Damage Dealt': 'totalDamageDealtToChampions',
            'Damage Taken': 'totalDamageTaken',
            'Gold Earned': 'goldEarned',
            'Vision Score': 'visionScore',
            'Wards Placed': 'wardsPlaced',
            'Creep Score': 'totalMinionsKilled'
        },
        colors: {
            'Kills': 'rgba(0, 255, 0, 0.2)', // Verde
            'Deaths': 'rgba(255, 0, 0, 0.2)', // Vermelho
            'Assists': 'rgba(255, 255, 0, 0.2)', // Amarelo
            'Damage Dealt': 'rgba(54, 162, 235, 0.2)', // Azul
            'Damage Taken': 'rgba(75, 192, 192, 0.2)', // Verde-água
            'Gold Earned': 'rgba(255, 159, 64, 0.2)', // Laranja
            'Vision Score': 'rgba(153, 102, 255, 0.2)', // Roxo
            'Wards Placed': 'rgba(201, 203, 207, 0.2)', // Cinza
            'Creep Score': 'rgba(255, 99, 132, 0.2)' // Rosa
        },
        borderColors: {
            'Kills': 'rgba(0, 255, 0, 1)', // Verde
            'Deaths': 'rgba(255, 0, 0, 1)', // Vermelho
            'Assists': 'rgba(255, 255, 0, 1)', // Amarelo
            'Damage Dealt': 'rgba(54, 162, 235, 1)', // Azul
            'Damage Taken': 'rgba(75, 192, 192, 1)', // Verde-água
            'Gold Earned': 'rgba(255, 159, 64, 1)', // Laranja
            'Vision Score': 'rgba(153, 102, 255, 1)', // Roxo
            'Wards Placed': 'rgba(201, 203, 207, 1)', // Cinza
            'Creep Score': 'rgba(255, 99, 132, 1)' // Rosa
        }
    };

    const data = {
        labels: ['Kills', 'Deaths', 'Assists', 'Damage Dealt', 'Damage Taken', 'Gold Earned', 'Vision Score', 'Wards Placed', 'Creep Score'],
        datasets: [{
            label: 'Match Statistics',
            data: [
                participant.kills / statsConfig.maxValues.kills,
                participant.deaths / statsConfig.maxValues.deaths,
                participant.assists / statsConfig.maxValues.assists,
                participant.totalDamageDealtToChampions / statsConfig.maxValues.totalDamageDealtToChampions,
                participant.totalDamageTaken / statsConfig.maxValues.totalDamageTaken,
                participant.goldEarned / statsConfig.maxValues.goldEarned,
                participant.visionScore / statsConfig.maxValues.visionScore,
                participant.wardsPlaced / statsConfig.maxValues.wardsPlaced,
                participant.totalMinionsKilled / statsConfig.maxValues.totalMinionsKilled
            ],
            backgroundColor: [
                statsConfig.colors['Kills'],
                statsConfig.colors['Deaths'],
                statsConfig.colors['Assists'],
                statsConfig.colors['Damage Dealt'],
                statsConfig.colors['Damage Taken'],
                statsConfig.colors['Gold Earned'],
                statsConfig.colors['Vision Score'],
                statsConfig.colors['Wards Placed'],
                statsConfig.colors['Creep Score']
            ],
            borderColor: [
                statsConfig.borderColors['Kills'],
                statsConfig.borderColors['Deaths'],
                statsConfig.borderColors['Assists'],
                statsConfig.borderColors['Damage Dealt'],
                statsConfig.borderColors['Damage Taken'],
                statsConfig.borderColors['Gold Earned'],
                statsConfig.borderColors['Vision Score'],
                statsConfig.borderColors['Wards Placed'],
                statsConfig.borderColors['Creep Score']
            ],
            borderWidth: 1
        }]
    };

    const configuration = {
        type: 'bar',
        data: data,
        options: {
            indexAxis: 'y', // Gráfico na horizontal
            scales: {
                x: {
                    ticks: {
                        color: 'rgba(0, 0, 0, 0)' // Tornar os números da escala invisíveis
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.2)' // Cor da grade
                    }
                },
                y: {
                    ticks: {
                        color: 'white' // Cor dos rótulos
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.2)' // Cor da grade
                    }
                }
            },
            plugins: {
                legend: {
                    display: false // Remover a legenda
                },
                datalabels: {
                    color: 'white', // Cor dos rótulos
                    anchor: 'start', // Ancorar os rótulos no início da barra
                    align: 'center', // Alinhar os valores ao final da barra
                    formatter: (value, context) => {
                        const label = context.chart.data.labels[context.dataIndex];
                        const key = statsConfig.labelToKeyMap[label];
                        const originalValue = value * statsConfig.maxValues[key];
                        return originalValue.toFixed(2); // Formatar o valor original
                    }
                }
            }
        },
        plugins: [ChartDataLabels]
    };

    const image = await chartJSNodeCanvas.renderToBuffer(configuration);
    return image;
}

module.exports = { generateMatchChart };