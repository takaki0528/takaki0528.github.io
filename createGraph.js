var device_name = "bms_multiple_battery";
var ba_ids = ["ba0", "ba1", "ba2", "ba3"];
var hosturl = "https://4bbamgyg6f.execute-api.ap-northeast-1.amazonaws.com/bms";
var apiurl = hosturl + "/datas/" + device_name;
var retryInterval = 60000;

function createChart() {
    reqGet();  // まず一度実行
    setInterval(function() {
        reqGet();  // 60秒ごとに再度データ取得
    }, retryInterval);
}

function reqGet() {
    console.log("reqGet() start");
    $.ajax({
        url: apiurl,
        method: "GET",
        success: function(data) {
            drawChartsForAllBA(data[device_name]);
        },
        error: function(jqXHR, textStatus, errorThrown) {
            console.log("Error: " + textStatus + " " + errorThrown);
        }
    });
}

function calculateMovingAverage(data, windowSize) {
    let result = [];
    for (let i = 0; i < data.length - windowSize + 1; i++) {
        let sum = 0;
        for (let j = i; j < i + windowSize; j++) {
            sum += data[j][1];  // データのy軸の値を加算
        }
        result.push([data[i][0], sum / windowSize]);  // 平均を計算
    }
    return result;
}

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

    // 平均化処理
    var windowSize = 60;  // ここで移動平均のウィンドウサイズを指定
    ba_ids.forEach(function(ba_id) {
        voltage_data[ba_id] = calculateMovingAverage(voltage_data[ba_id], windowSize);
        current_data[ba_id] = calculateMovingAverage(current_data[ba_id], windowSize);
        soc_data[ba_id] = calculateMovingAverage(soc_data[ba_id], windowSize);
        temp_data[ba_id] = calculateMovingAverage(temp_data[ba_id], windowSize);
    });

    // X軸とY軸を反転する処理を追加
    ba_ids.forEach(function(ba_id) {
        voltage_data[ba_id] = voltage_data[ba_id].reverse();
        current_data[ba_id] = current_data[ba_id].reverse();
        soc_data[ba_id] = soc_data[ba_id].reverse();
        temp_data[ba_id] = temp_data[ba_id].reverse();
    });

    drawChart("voltageChart", "Voltage (V)", voltage_data);
    drawChart("currentChart", "Current (A)", current_data);
    drawChart("socChart", "SOC (%)", soc_data);
    drawChart("tempChart", "Temperature (C)", temp_data);
}

function drawChart(chartId, yAxisTitle, data) {
    var series = [];
    ba_ids.forEach(function(ba_id) {
        series.push({
            name: ba_id,
            type: 'line',
            data: data[ba_id].map(item => item[1]),
            tooltip: {
                valueFormatter: function(value) {
                    return value.toFixed(3);  // 小数点第3位まで
                }
            }
        });
    });

    var chart = echarts.init(document.getElementById(chartId));
    chart.setOption({
        title: {
            text: yAxisTitle + ' Over Time',
            left: 'center',
            textStyle: {
                fontSize: 16,  // フォントサイズを調整
                padding: [10, 0, 0, 0]  // 上部に余白を追加
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
        legend: { data: ba_ids },
        xAxis: { type: 'category', data: data[ba_ids[0]].map(item => item[0]) },
        yAxis: {
            type: 'value',
            name: yAxisTitle,
            scale: true  // データに基づいて自動で範囲を設定
        },
        series: series
    });

    // ウィンドウリサイズ時にグラフをリサイズ
    window.addEventListener('resize', function() {
        chart.resize();
    });
}

createChart();
