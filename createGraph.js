var device_name = "bms_multiple_battery";
var ba_ids = ["ba0", "ba1", "ba2", "ba3"];
var selectedBaId = "ba0";  // 初期値は ba0
var hosturl = "https://4bbamgyg6f.execute-api.ap-northeast-1.amazonaws.com/bms";
var apiurl = hosturl + "/datas/" + device_name;
var retryInterval = 60000;

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
            drawChartsForSelectedBA(data[device_name], selectedBaId);
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
    var windowSize = 100;
    voltage_data = calculateMovingAverage(voltage_data, windowSize);
    current_data = calculateMovingAverage(current_data, windowSize);
    soc_data = calculateMovingAverage(soc_data, windowSize);
    temp_data = calculateMovingAverage(temp_data, windowSize);

    // X軸とY軸を反転する処理を追加
    voltage_data = voltage_data.reverse();
    current_data = current_data.reverse();
    soc_data = soc_data.reverse();
    temp_data = temp_data.reverse();

    drawChart("voltageChart", "Voltage (V)", voltage_data);
    drawChart("currentChart", "Current (A)", current_data);
    drawChart("socChart", "SOC (%)", soc_data);
    drawChart("tempChart", "Temperature (C)", temp_data);
}

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

function drawChart(chartId, yAxisTitle, data) {
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

createChart();
