// SOCの推定と正解の両方のデータを描画するためにコードを修正します。
// 修正として、各バッテリーのデータに"soc_actual"という新しいデータフィールドを追加し、
// "drawDoubleLineChart"関数を用いてSOCの推定と実際の値を両方描画するようにします。

var device_name = "bms_multiple_battery";
var ba_ids = ["ba0", "ba1", "ba2", "ba3"];
var selectedBaId = "Ave";  // 初期値は Ave
var hosturl = "https://4bbamgyg6f.execute-api.ap-northeast-1.amazonaws.com/bms";
var apiurl = hosturl + "/datas/" + device_name;
var retryInterval = 10000;

function createChart() {
    reqGet();  // まず一度実行
    setInterval(function () {
        reqGet();  // 10秒ごとに再度データ取得
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
        success: function (data) {
            if (selectedBaId === "Ave") {
                drawChartsForAverage(data[device_name]);
            } else if (selectedBaId === "All") {
                drawChartsForAllBA(data[device_name]);
            } else {
                drawChartsForSelectedBA(data[device_name], selectedBaId);
            }
        },
        error: function (jqXHR, textStatus, errorThrown) {
            console.log("Error: " + textStatus + " " + errorThrown);
        }
    });
}

// 選択されたバッテリーIDに基づいてデータを描画
function drawChartsForSelectedBA(vals, ba_id) {
    var voltage_data = [], current_data = [], soc_estimated_data = [], soc_actual_data = [], temp_data = [];
    var r0_real_data = [], r0_fake_data = [], r1_real_data = [], r1_fake_data = [], tau1_real_data = [], tau1_fake_data = [];

    for (var i = 0; i < vals.length; i++) {
        voltage_data.push([vals[i].timestamp, vals[i][ba_id].voltage]);
        current_data.push([vals[i].timestamp, vals[i][ba_id].current]);
        soc_estimated_data.push([vals[i].timestamp, vals[i][ba_id].soc.fake]);
        soc_actual_data.push([vals[i].timestamp, vals[i][ba_id].soc.real]);
        temp_data.push([vals[i].timestamp, vals[i][ba_id].temperature]);
        r0_real_data.push([vals[i].timestamp, vals[i][ba_id].r0.real]);
        r0_fake_data.push([vals[i].timestamp, vals[i][ba_id].r0.fake]);
        r1_real_data.push([vals[i].timestamp, vals[i][ba_id].r1.real]);
        r1_fake_data.push([vals[i].timestamp, vals[i][ba_id].r1.fake]);
        tau1_real_data.push([vals[i].timestamp, vals[i][ba_id].tau1.real]);
        tau1_fake_data.push([vals[i].timestamp, vals[i][ba_id].tau1.fake]);
    }

    // 最新の平均値を更新
    if (vals.length > 0) {
        var latestData = {
            voltage: voltage_data[voltage_data.length - 1][1],
            current: current_data[current_data.length - 1][1],
            soc_estimated: soc_estimated_data[soc_estimated_data.length - 1][1],
            soc_actual: soc_actual_data[soc_actual_data.length - 1][1],
            temperature: temp_data[temp_data.length - 1][1]
        };
        updateLatestValues(latestData);  // 平均値を更新
    }

    drawChart("voltageChart", "Voltage (V)", voltage_data);
    drawChart("currentChart", "Current (A)", current_data);
    drawDoubleLineChart("socChart", "SOC (%)", soc_actual_data, soc_estimated_data);
    drawChart("tempChart", "Temperature (℃)", temp_data);

    // r0, r1, tau1 の real と fake をそれぞれのグラフに表示
    drawDoubleLineChart("r0Chart", "R0", r0_real_data, r0_fake_data);
    drawDoubleLineChart("r1Chart", "R1", r1_real_data, r1_fake_data);
    drawDoubleLineChart("tau1Chart", "Tau1", tau1_real_data, tau1_fake_data);
}

// 平均データを描画
function drawChartsForAverage(vals) {
    var voltage_data = [], current_data = [], soc_estimated_data = [], soc_actual_data = [], temp_data = [];
    var r0_real_data = [], r0_fake_data = [], r1_real_data = [], r1_fake_data = [], tau1_real_data = [], tau1_fake_data = [];

    for (var i = 0; i < vals.length; i++) {
        var avg_voltage = 0, avg_current = 0, avg_soc_estimated = 0, avg_soc_actual = 0, avg_temp = 0;
        var avg_r0_real = 0, avg_r0_fake = 0, avg_r1_real = 0, avg_r1_fake = 0, avg_tau1_real = 0, avg_tau1_fake = 0;
        ba_ids.forEach(function (ba_id) {
            avg_voltage += vals[i][ba_id].voltage;
            avg_current += vals[i][ba_id].current;
            avg_soc_estimated += vals[i][ba_id].soc.fake;
            avg_soc_actual += vals[i][ba_id].soc.real;
            avg_temp += vals[i][ba_id].temperature;
            avg_r0_real += vals[i][ba_id].r0.real;
            avg_r0_fake += vals[i][ba_id].r0.fake;
            avg_r1_real += vals[i][ba_id].r1.real;
            avg_r1_fake += vals[i][ba_id].r1.fake;
            avg_tau1_real += vals[i][ba_id].tau1.real;
            avg_tau1_fake += vals[i][ba_id].tau1.fake;
        });
        avg_voltage /= ba_ids.length;
        avg_current /= ba_ids.length;
        avg_soc_estimated /= ba_ids.length;
        avg_soc_actual /= ba_ids.length;
        avg_temp /= ba_ids.length;
        avg_r0_real /= ba_ids.length;
        avg_r0_fake /= ba_ids.length;
        avg_r1_real /= ba_ids.length;
        avg_r1_fake /= ba_ids.length;
        avg_tau1_real /= ba_ids.length;
        avg_tau1_fake /= ba_ids.length;

        voltage_data.push([vals[i].timestamp, avg_voltage]);
        current_data.push([vals[i].timestamp, avg_current]);
        soc_estimated_data.push([vals[i].timestamp, avg_soc_estimated]);
        soc_actual_data.push([vals[i].timestamp, avg_soc_actual]);
        temp_data.push([vals[i].timestamp, avg_temp]);
        r0_real_data.push([vals[i].timestamp, avg_r0_real]);
        r0_fake_data.push([vals[i].timestamp, avg_r0_fake]);
        r1_real_data.push([vals[i].timestamp, avg_r1_real]);
        r1_fake_data.push([vals[i].timestamp, avg_r1_fake]);
        tau1_real_data.push([vals[i].timestamp, avg_tau1_real]);
        tau1_fake_data.push([vals[i].timestamp, avg_tau1_fake]);
    }

    // 最新の平均値を更新
    if (vals.length > 0) {
        var latestAverageData = {
            voltage: voltage_data[voltage_data.length - 1][1],
            current: current_data[current_data.length - 1][1],
            soc_estimated: soc_estimated_data[soc_estimated_data.length - 1][1],
            soc_actual: soc_actual_data[soc_actual_data.length - 1][1],
            temperature: temp_data[temp_data.length - 1][1]
        };
        updateLatestValues(latestAverageData);  // 平均値を更新
    }

    drawChart("voltageChart", "Average Voltage (V)", voltage_data);
    drawChart("currentChart", "Average Current (A)", current_data);
    drawDoubleLineChart("socChart", "Average SOC (%)", soc_actual_data, soc_estimated_data);
    drawChart("tempChart", "Average Temperature (℃)", temp_data);

    // r0, r1, tau1 の real と fake をそれぞれのグラフに表示
    drawDoubleLineChart("r0Chart", "Average R0", r0_real_data, r0_fake_data);
    drawDoubleLineChart("r1Chart", "Average R1", r1_real_data, r1_fake_data);
    drawDoubleLineChart("tau1Chart", "Average Tau1", tau1_real_data, tau1_fake_data);
}

// 全てのバッテリーのデータを描画
function drawChartsForAllBA(vals) {
    var voltage_data = {}, current_data = {}, soc_estimated_data = {}, soc_actual_data = {}, temp_data = {};
    var r0_real_data = {}, r0_fake_data = {}, r1_real_data = {}, r1_fake_data = {}, tau1_real_data = {}, tau1_fake_data = {};
    var xAxisData = new Set(); // Setで一意のtimestampを収集

    // 各バッテリーのデータを初期化
    ba_ids.forEach(function (ba_id) {
        voltage_data[ba_id] = [];
        current_data[ba_id] = [];
        soc_estimated_data[ba_id] = [];
        soc_actual_data[ba_id] = [];
        temp_data[ba_id] = [];
        r0_real_data[ba_id] = [];
        r0_fake_data[ba_id] = [];
        r1_real_data[ba_id] = [];
        r1_fake_data[ba_id] = [];
        tau1_real_data[ba_id] = [];
        tau1_fake_data[ba_id] = [];
    });

    // 各バッテリーのデータを収集
    for (var i = 0; i < vals.length; i++) {
        ba_ids.forEach(function (ba_id) {
            xAxisData.add(vals[i].timestamp);  // すべてのtimestampを収集
            voltage_data[ba_id].push([vals[i].timestamp, vals[i][ba_id].voltage]);
            current_data[ba_id].push([vals[i].timestamp, vals[i][ba_id].current]);
            soc_estimated_data[ba_id].push([vals[i].timestamp, vals[i][ba_id].soc.fake]);
            soc_actual_data[ba_id].push([vals[i].timestamp, vals[i][ba_id].soc.real]);
            temp_data[ba_id].push([vals[i].timestamp, vals[i][ba_id].temperature]);
            r0_real_data[ba_id].push([vals[i].timestamp, vals[i][ba_id].r0.real]);
            r0_fake_data[ba_id].push([vals[i].timestamp, vals[i][ba_id].r0.fake]);
            r1_real_data[ba_id].push([vals[i].timestamp, vals[i][ba_id].r1.real]);
            r1_fake_data[ba_id].push([vals[i].timestamp, vals[i][ba_id].r1.fake]);
            tau1_real_data[ba_id].push([vals[i].timestamp, vals[i][ba_id].tau1.real]);
            tau1_fake_data[ba_id].push([vals[i].timestamp, vals[i][ba_id].tau1.fake]);
        });
    }

    // xAxisDataをソートして配列に変換
    xAxisData = Array.from(xAxisData).sort();

    // 各データを描画
    drawChartForAll("voltageChart", "Voltage (V)", voltage_data, xAxisData);
    drawChartForAll("currentChart", "Current (A)", current_data, xAxisData);
    drawDoubleLineChartForAll("socChart", "SOC (%)", soc_actual_data, soc_estimated_data, xAxisData);
    drawChartForAll("tempChart", "Temperature (℃)", temp_data, xAxisData);

    // r0, r1, tau1 の real と fake をそれぞれのグラフに表示
    drawDoubleLineChartForAll("r0Chart", "R0", r0_real_data, r0_fake_data, xAxisData);
    drawDoubleLineChartForAll("r1Chart", "R1", r1_real_data, r1_fake_data, xAxisData);
    drawDoubleLineChartForAll("tau1Chart", "Tau1", tau1_real_data, tau1_fake_data, xAxisData);
}

// すべてのバッテリーのデータを描画するための関数
function drawChartForAll(chartId, yAxisTitle, data, xAxisData) {
    // 既存のグラフインスタンスがある場合は破棄
    if (echarts.getInstanceByDom(document.getElementById(chartId))) {
        echarts.dispose(document.getElementById(chartId));  // グラフをクリア
    }

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
        xAxis: {
            type: 'category',
            data: xAxisData  // 共通のtimestampを使用
        },
        yAxis: {
            type: 'value',
            name: yAxisTitle,
            scale: true
        },
        series: series
    });

    window.addEventListener('resize', function () {
        chart.resize();

    });
}

// すべてのバッテリーに対して2本のラインを描画するための関数
function drawDoubleLineChartForAll(chartId, yAxisTitle, realData, fakeData, xAxisData) {
    // 既存のグラフインスタンスがある場合は破棄
    if (echarts.getInstanceByDom(document.getElementById(chartId))) {
        echarts.dispose(document.getElementById(chartId));  // グラフをクリア
    }

    var series = [];
    ba_ids.forEach(function (ba_id) {
        series.push({
            name: ba_id + ' Actual',
            type: 'line',
            data: realData[ba_id].map(item => item[1]),  // 各バッテリーの実データを使用
            tooltip: {
                valueFormatter: function (value) {
                    return value.toFixed(3);
                }
            }
        });
        series.push({
            name: ba_id + ' Estimated',
            type: 'line',
            data: fakeData[ba_id].map(item => item[1]),  // 各バッテリーの推定データを使用
            tooltip: {
                valueFormatter: function (value) {
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
            formatter: function (params) {
                let result = params[0].axisValueLabel + '<br/>';
                params.forEach(item => {
                    result += item.marker + ' ' + item.seriesName + ': ' + item.data.toFixed(3) + '<br/>';
                });
                return result;
            }
        },
        legend: {
            data: ba_ids.flatMap(ba_id => [ba_id + ' Actual', ba_id + ' Estimated']),
            top: '10%',
            right: 'center'
        },
        grid: {
            top: '20%'
        },
        xAxis: {
            type: 'category',
            data: xAxisData  // 共通のtimestampを使用
        },
        yAxis: {
            type: 'value',
            name: yAxisTitle,
            scale: true
        },
        series: series
    });

    window.addEventListener('resize', function () {
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

    window.addEventListener('resize', function () {
        chart.resize();
    });
}

// 2本のライン（real と fake、または actual と estimated）を描画するための関数
function drawDoubleLineChart(chartId, yAxisTitle, realData, fakeData) {
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
            formatter: function (params) {
                let result = params[0].axisValueLabel + '<br/>';
                params.forEach(item => {
                    result += item.marker + ' ' + item.seriesName + ': ' + item.data.toFixed(3) + '<br/>';
                });
                return result;
            }
        },
        legend: {
            data: ['Actual', 'Estimated'],
            top: '10%',
            right: 'center'
        },
        grid: {
            top: '20%'
        },
        xAxis: { type: 'category', data: realData.map(item => item[0]) },
        yAxis: {
            type: 'value',
            name: yAxisTitle,
            scale: true
        },
        series: [
            {
                name: 'Actual',
                type: 'line',
                data: realData.map(item => item[1]),
                tooltip: {
                    valueFormatter: function (value) {
                        return value.toFixed(3);
                    }
                }
            },
            {
                name: 'Estimated',
                type: 'line',
                data: fakeData.map(item => item[1]),
                tooltip: {
                    valueFormatter: function (value) {
                        return value.toFixed(3);
                    }
                }
            }
        ]
    });

    window.addEventListener('resize', function () {
        chart.resize();
    });
}


// 最新の値を表示するための関数
function updateLatestValues(latestData) {
    if (latestData) {
        document.getElementById("latestVoltage").textContent = latestData.voltage !== undefined ? ` ${latestData.voltage.toFixed(2)} (V)` : 'N/A (V)';
        document.getElementById("latestCurrent").textContent = latestData.current !== undefined ? ` ${latestData.current.toFixed(2)} (A)` : 'N/A (A)';
        document.getElementById("latestSOC").textContent = latestData.soc_estimated !== undefined ? ` ${latestData.soc_estimated.toFixed(2)} (%)` : 'N/A (%)';
        document.getElementById("latestTemp").textContent = latestData.temperature !== undefined ? ` ${latestData.temperature.toFixed(2)} (°C)` : 'N/A (°C)';
    } else {
        document.getElementById("latestVoltage").textContent = 'N/A (V)';
        document.getElementById("latestCurrent").textContent = 'N/A (A)';
        document.getElementById("latestSOC").textContent = 'N/A (%)';
        document.getElementById("latestTemp").textContent = 'N/A (°C)';
    }
}

createChart();
