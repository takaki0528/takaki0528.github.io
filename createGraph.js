var device_name = "bms_multiple_battery";
var ba_ids = ["ba0", "ba1", "ba2", "ba3"];
var selectedBaId = "Ave";  // 初期値は Ave
var hosturl = "https://4bbamgyg6f.execute-api.ap-northeast-1.amazonaws.com/bms";
var apiurl = hosturl + "/datas/" + device_name;
var retryInterval = 10000;
var windowSize = 1;  // 平均化処理のウィンドウサイズ
var charts = {};  // グラフのインスタンスを保持

function createChart() {
    reqGet();  // まず一度実行
    setInterval(function () {
        reqGet();  // 定期的にデータを取得して更新
    }, retryInterval);
}

// 選択されたバッテリーIDを変更したときに呼び出される関数
function handleBatteryChange() {
    var selectElement = document.getElementById("batterySelect");
    selectedBaId = selectElement.value;  // 新しいバッテリーIDを取得
    clearCharts();  // グラフをリセット
    reqGet();  // 新しいバッテリーのデータを取得して更新
}

function reqGet() {
    console.log("reqGet() start");
    $.ajax({
        url: apiurl,
        method: "GET",
        success: function (data) {
            if (selectedBaId === "Ave") {
                updateChartsForAverage(data[device_name]);
            } else if (selectedBaId === "All") {
                updateChartsForAllBA(data[device_name]);
            } else {
                updateChartsForSelectedBA(data[device_name], selectedBaId);
            }
        },
        error: function (jqXHR, textStatus, errorThrown) {
            console.log("Error: " + textStatus + " " + errorThrown);
        }
    });
}

// グラフをクリアする関数
function clearCharts() {
    if (charts.voltageChart) charts.voltageChart.clear();
    if (charts.currentChart) charts.currentChart.clear();
    if (charts.socChart) charts.socChart.clear();
    if (charts.tempChart) charts.tempChart.clear();
}

// 選択されたバッテリーIDに基づいてデータを更新
function updateChartsForSelectedBA(vals, ba_id) {
    var voltage_data = [], current_data = [], soc_data = [], temp_data = [];

    for (var i = 0; i < vals.length; i++) {
        voltage_data.push([vals[i].timestamp, vals[i][ba_id].voltage]);
        current_data.push([vals[i].timestamp, vals[i][ba_id].current]);
        soc_data.push([vals[i].timestamp, vals[i][ba_id].soc * 100]);
        temp_data.push([vals[i].timestamp, vals[i][ba_id].temperature]);
    }

    // 平均化処理
    voltage_data = calculateMovingAverage(voltage_data, windowSize);
    current_data = calculateMovingAverage(current_data, windowSize);
    soc_data = calculateMovingAverage(soc_data, windowSize);
    temp_data = calculateMovingAverage(temp_data, windowSize);

    // 最新の値を更新
    if (vals.length > 0) {
        var latestData = vals[vals.length - 1][ba_id];
        updateLatestValues(latestData);  // 単一のバッテリーの最新値を更新
    }

    updateChart("voltageChart", "Voltage (V)", voltage_data);
    updateChart("currentChart", "Current (A)", current_data);
    updateChart("socChart", "SOC (%)", soc_data);
    updateChart("tempChart", "Temperature (℃)", temp_data);
}

// 4つのバッテリーの平均データを更新
function updateChartsForAverage(vals) {
    var voltage_data = [], current_data = [], soc_data = [], temp_data = [];

    for (var i = 0; i < vals.length; i++) {
        var avg_voltage = 0, avg_current = 0, avg_soc = 0, avg_temp = 0;
        ba_ids.forEach(function (ba_id) {
            avg_voltage += vals[i][ba_id].voltage;
            avg_current += vals[i][ba_id].current;
            avg_soc += vals[i][ba_id].soc * 100;
            avg_temp += vals[i][ba_id].temperature;
        });
        avg_voltage /= ba_ids.length;
        avg_current /= ba_ids.length;
        avg_soc /= ba_ids.length;
        avg_temp /= ba_ids.length;

        voltage_data.push([vals[i].timestamp, avg_voltage]);
        current_data.push([vals[i].timestamp, avg_current]);
        soc_data.push([vals[i].timestamp, avg_soc]);
        temp_data.push([vals[i].timestamp, avg_temp]);
    }

    // 平均化処理
    voltage_data = calculateMovingAverage(voltage_data, windowSize);
    current_data = calculateMovingAverage(current_data, windowSize);
    soc_data = calculateMovingAverage(soc_data, windowSize);
    temp_data = calculateMovingAverage(temp_data, windowSize);

    // 最新の平均値を更新
    if (vals.length > 0) {
        var latestAverageData = {
            voltage: voltage_data[voltage_data.length - 1][1],
            current: current_data[current_data.length - 1][1],
            soc: soc_data[soc_data.length - 1][1] / 100,  // SOCは%表記なので100で割る
            temperature: temp_data[temp_data.length - 1][1]
        };
        updateLatestValues(latestAverageData);  // 平均値を更新
    }

    updateChart("voltageChart", "Average Voltage (V)", voltage_data);
    updateChart("currentChart", "Average Current (A)", current_data);
    updateChart("socChart", "Average SOC (%)", soc_data);
    updateChart("tempChart", "Average Temperature (℃)", temp_data);
}

// すべてのバッテリーのデータを同時に更新
function updateChartsForAllBA(vals) {
    var voltage_data = {}, current_data = {}, soc_data = {}, temp_data = {};

    // 各バッテリーのデータを初期化
    ba_ids.forEach(function (ba_id) {
        voltage_data[ba_id] = [];
        current_data[ba_id] = [];
        soc_data[ba_id] = [];
        temp_data[ba_id] = [];
    });

    // 各バッテリーのデータを収集
    for (var i = 0; i < vals.length; i++) {
        ba_ids.forEach(function (ba_id) {
            voltage_data[ba_id].push([vals[i].timestamp, vals[i][ba_id].voltage]);
            current_data[ba_id].push([vals[i].timestamp, vals[i][ba_id].current]);
            soc_data[ba_id].push([vals[i].timestamp, vals[i][ba_id].soc * 100]);
            temp_data[ba_id].push([vals[i].timestamp, vals[i][ba_id].temperature]);
        });
    }

    // 平均化処理
    ba_ids.forEach(function (ba_id) {
        voltage_data[ba_id] = calculateMovingAverage(voltage_data[ba_id], windowSize);
        current_data[ba_id] = calculateMovingAverage(current_data[ba_id], windowSize);
        soc_data[ba_id] = calculateMovingAverage(soc_data[ba_id], windowSize);
        temp_data[ba_id] = calculateMovingAverage(temp_data[ba_id], windowSize);
    });

    updateChartForAll("voltageChart", "Voltage (V)", voltage_data);
    updateChartForAll("currentChart", "Current (A)", current_data);
    updateChartForAll("socChart", "SOC (%)", soc_data);
    updateChartForAll("tempChart", "Temperature (℃)", temp_data);
}

// グラフに新しいデータを追加する関数
function updateChart(chartId, yAxisTitle, data) {
    if (!charts[chartId]) {
        charts[chartId] = echarts.init(document.getElementById(chartId));
        charts[chartId].setOption({
            title: {
                text: yAxisTitle + ' Over Time',
                left: 'center',
                top: '5%',
                textStyle: {
                    fontSize: 16,
                    padding: [10, 0, 0, 0]
                }
            },
            tooltip: {
                trigger: 'axis',
                formatter: function (params) {
                    let result = params[0].axisValueLabel + '<br/>';
                    params.forEach(item => {
                        result += item.marker + ' ' + item.seriesName + ': ' + item.data.toFixed(3) + '<br/>';
                    });
                    return result;
                }
            },
            legend: {
                data: [selectedBaId],
                top: '10%',
                right: 'center'
            },
            grid: {
                top: '20%'
            },
            xAxis: { type: 'category', data: data.map(item => item[0]) },
            yAxis: {
                type: 'value',
                name: yAxisTitle,
                scale: true
            },
            series: [{
                name: selectedBaId,
                type: 'line',
                data: data.map(item => item[1]),
                tooltip: {
                    valueFormatter: function (value) {
                        return value.toFixed(3);
                    }
                }
            }]
        });
    } else {
        charts[chartId].setOption({
            xAxis: { data: data.map(item => item[0]) },
            series: [{
                data: data.map(item => item[1])
            }]
        });
    }
}

// すべてのバッテリーのデータを同時に更新するための関数
function updateChartForAll(chartId, yAxisTitle, data) {
    if (!charts[chartId]) {
        charts[chartId] = echarts.init(document.getElementById(chartId));
        var series = [];
        ba_ids.forEach(function (ba_id) {
            series.push({
                name: ba_id,
                type: 'line',
                data: data[ba_id].map(item => item[1]),  // 各バッテリーのデータを使用
                tooltip: {
                    valueFormatter: function (value) {
                        return value.toFixed(3);
                    }
                }
            });
        });
        charts[chartId].setOption({
            title: {
                text: yAxisTitle + ' Over Time',
                left: 'center',
                top: '5%',
                textStyle: {
                    fontSize: 16,
                    padding: [10, 0, 0, 0]
                }
            },
            tooltip: {
                trigger: 'axis',
                formatter: function (params) {
                    let result = params[0].axisValueLabel + '<br/>';
                    params.forEach(item => {
                        result += item.marker + ' ' + item.seriesName + ': ' + item.data.toFixed(3) + '<br/>';
                    });
                    return result;
                }
            },
            legend: {
                data: ba_ids,
                top: '10%',
                right: 'center'
            },
            grid: {
                top: '20%'
            },
            xAxis: { type: 'category', data: data[ba_ids[0]].map(item => item[0]) },
            yAxis: {
                type: 'value',
                name: yAxisTitle,
                scale: true
            },
            series: series
        });
    } else {
        var series = [];
        ba_ids.forEach(function (ba_id) {
            series.push({
                data: data[ba_id].map(item => item[1])
            });
        });
        charts[chartId].setOption({
            xAxis: { data: data[ba_ids[0]].map(item => item[0]) },
            series: series
        });
    }
}

// 最新の平均値を表示するための関数
function updateLatestValues(latestData) {
    document.getElementById("latestVoltage").textContent = ` ${latestData.voltage.toFixed(2)} V`;
    document.getElementById("latestCurrent").textContent = ` ${latestData.current.toFixed(2)} A`;
    document.getElementById("latestSOC").textContent = ` ${(latestData.soc).toFixed(2)} %`;
    document.getElementById("latestTemp").textContent = ` ${latestData.temperature.toFixed(2)} °C`;
}

// 平均化処理
function calculateMovingAverage(data, windowSize) {
    let result = [];
    for (let i = 0; i < data.length - windowSize + 1; i++) {
        let sum = 0;
        for (let j = i; j < i + windowSize; j++) {
            sum += data[j][1];
        }
        result.push([data[i][0], sum / windowSize]);
    }
    return result;
}

createChart();
