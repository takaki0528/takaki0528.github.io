var device_name = "bms_multiple_battery";
var ba_ids = ["ba0", "ba1", "ba2", "ba3"];
var selectedBaId = "Ave";  // 初期値は ba0
var hosturl = "https://4bbamgyg6f.execute-api.ap-northeast-1.amazonaws.com/bms";
var apiurl = hosturl + "/datas/" + device_name;
var retryInterval = 60000;
var windowSize = 10;  // 平均化処理のウィンドウサイズ

function createChart() {
    reqGet();  // まず一度実行
    setInterval(function() {
        reqGet();  // 60秒ごとに再度データ取得
    }, retryInterval);
}

// 選択されたバッテリーIDを変更したときに呼び出される関数
function handleBatteryChange() {
    var selectElement = document.getElementById("batterySelect");
    selectedBaId = selectElement.value;  // 新しいバッテリーIDを取得
    reqGet();  // 新しいバッテリーのデータを取得して更新
}

function reqGet() {
    console.log("reqGet() start");
    $.ajax({
        url: apiurl,
        method: "GET",
        success: function(data) {
            if (selectedBaId === "Ave") {
                drawChartsForAverage(data[device_name]);
            } else if (selectedBaId === "All") {
                drawChartsForAllBA(data[device_name]);
            } else {
                drawChartsForSelectedBA(data[device_name], selectedBaId);
            }
        },
        error: function(jqXHR, textStatus, errorThrown) {
            console.log("Error: " + textStatus + " " + errorThrown);
        }
    });
}

// 選択されたバッテリーIDに基づいてデータを描画
function drawChartsForSelectedBA(vals, ba_id) {
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

    drawChart("voltageChart", "Voltage (V)", voltage_data);
    drawChart("currentChart", "Current (A)", current_data);
    drawChart("socChart", "SOC (%)", soc_data);
    drawChart("tempChart", "Temperature (C)", temp_data);
}

// 4つのバッテリーの平均データを描画
function drawChartsForAverage(vals) {
    var voltage_data = [], current_data = [], soc_data = [], temp_data = [];

    for (var i = 0; i < vals.length; i++) {
        var avg_voltage = 0, avg_current = 0, avg_soc = 0, avg_temp = 0;
        ba_ids.forEach(function(ba_id) {
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

    drawChart("voltageChart", "Average Voltage (V)", voltage_data);
    drawChart("currentChart", "Average Current (A)", current_data);
    drawChart("socChart", "Average SOC (%)", soc_data);
    drawChart("tempChart", "Average Temperature (C)", temp_data);
}

// すべてのバッテリーのデータを同時に描画
function drawChartsForAllBA(vals) {
    var voltage_data = {}, current_data = {}, soc_data = {}, temp_data = {};

    ba_ids.forEach(function(ba_id) {
        voltage_data[ba_id] = [];
        current_data[ba_id] = [];
        soc_data[ba_id] = [];
        temp_data[ba_id] = [];
    });

    for (var i = 0; i < vals.length; i++) {
        ba_ids.forEach(function(ba_id) {
            voltage_data[ba_id].push([vals[i].timestamp, vals[i][ba_id].voltage]);
            current_data[ba_id].push([vals[i].timestamp, vals[i][ba_id].current]);
            soc_data[ba_id].push([vals[i].timestamp, vals[i][ba_id].soc * 100]);
            temp_data[ba_id].push([vals[i].timestamp, vals[i][ba_id].temperature]);
        });
    }

    // 各データに平均化処理
    ba_ids.forEach(function(ba_id) {
        voltage_data[ba_id] = calculateMovingAverage(voltage_data[ba_id], windowSize);
        current_data[ba_id] = calculateMovingAverage(current_data[ba_id], windowSize);
        soc_data[ba_id] = calculateMovingAverage(soc_data[ba_id], windowSize);
        temp_data[ba_id] = calculateMovingAverage(temp_data[ba_id], windowSize);
    });

    drawChartForAll("voltageChart", "Voltage (V)", voltage_data);
    drawChartForAll("currentChart", "Current (A)", current_data);
    drawChartForAll("socChart", "SOC (%)", soc_data);
    drawChartForAll("tempChart", "Temperature (C)", temp_data);
}

// 全バッテリーのデータを同時に描画するための関数
function drawChartForAll(chartId, yAxisTitle, data) {
    // 既存のグラフインスタンスを破棄
    if (echarts.getInstanceByDom(document.getElementById(chartId))) {
        echarts.dispose(document.getElementById(chartId));  // グラフをクリア
    }

    var series = [];
    ba_ids.forEach(function(ba_id) {
        series.push({
            name: ba_id,
            type: 'line',
            data: data[ba_id].map(item => item[1]),
            tooltip: {
                valueFormatter: function(value) {
                    return value.toFixed(3);
                }
            }
        });
    });

    var chart = echarts.init(document.getElementById(chartId));
    chart.setOption({
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
            formatter: function(params) {
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

    window.addEventListener('resize', function() {
        chart.resize();
    });
}

// 単一のバッテリーや平均データを描画するための基本的な関数
function drawChart(chartId, yAxisTitle, data) {
    // 既存のグラフインスタンスがある場合は破棄
    if (echarts.getInstanceByDom(document.getElementById(chartId))) {
        echarts.dispose(document.getElementById(chartId));  // グラフをクリア
    }

    var chart = echarts.init(document.getElementById(chartId));
    chart.setOption({
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
            formatter: function(params) {
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
                valueFormatter: function(value) {
                    return value.toFixed(3);
                }
            }
        }]
    });

    window.addEventListener('resize', function() {
        chart.resize();
    });
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
