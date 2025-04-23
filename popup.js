// Constants
const PARTNERS = ["X", "Y", "G"];
const SECTIONS = [
    { name: "市场与转化", ratio: 0.3, assignable: true },
    { name: "交付与执行", ratio: 0.3, assignable: true },
    { name: "IP支持", ratio: 0.1, assignable: true },
    { name: "运营与维护", ratio: 0.2, assignable: true },
    { name: "平台资产", ratio: 0.1, assignable: false }
];

const WEIGHTS_MAP = { "无": 0.0, "辅助": 0.3, "主导": 0.7 };

// DOM Elements
let pieChart = null;

// Initialize the extension
document.addEventListener('DOMContentLoaded', () => {
    initializeSections();
    initializeContributionTable();
    document.getElementById('calculateBtn').addEventListener('click', calculate);
    document.getElementById('exportBtn').addEventListener('click', exportToImage);
    document.getElementById('clearBtn').addEventListener('click', clearAllData);
    
    // 加载保存的数据
    loadSavedData();
});

// 在全局添加贡献值存储对象
let contributions = {};

// 保存数据到本地存储
function saveData() {
    const data = {
        total: document.getElementById('total').value,
        channel: document.getElementById('channel').value,
        external: document.getElementById('external').value,
        sections: {},
        contributions: {}
    };

    // 保存板块比例
    SECTIONS.forEach(section => {
        const input = document.querySelector(`input[data-section="${section.name}"]`);
        if (input) {
            data.sections[section.name] = input.value;
        }
    });

    // 保存贡献值
    SECTIONS.forEach(section => {
        if (section.assignable) {
            data.contributions[section.name] = {};
            PARTNERS.forEach(partner => {
                const select = contributions[section.name][partner];
                if (select) {
                    data.contributions[section.name][partner] = select.value;
                }
            });
        }
    });

    localStorage.setItem('profitDistributionData', JSON.stringify(data));
}

// 从本地存储加载数据
function loadSavedData() {
    const savedData = localStorage.getItem('profitDistributionData');
    if (savedData) {
        try {
            const data = JSON.parse(savedData);
            
            // 加载基础数据
            document.getElementById('total').value = data.total;
            document.getElementById('channel').value = data.channel;
            document.getElementById('external').value = data.external;

            // 加载板块比例
            Object.entries(data.sections).forEach(([name, value]) => {
                const input = document.querySelector(`input[data-section="${name}"]`);
                if (input) {
                    input.value = value;
                }
            });

            // 加载贡献值
            Object.entries(data.contributions).forEach(([sectionName, partnerData]) => {
                Object.entries(partnerData).forEach(([partner, value]) => {
                    const select = contributions[sectionName][partner];
                    if (select) {
                        select.value = value;
                    }
                });
            });
        } catch (error) {
            console.error('加载保存的数据时出错：', error);
        }
    }
}

// 清空所有数据
function clearAllData() {
    if (confirm('确定要清空所有数据吗？')) {
        // 清空输入框
        document.getElementById('total').value = '18000';
        document.getElementById('channel').value = '3800';
        document.getElementById('external').value = '3600';

        // 重置板块比例
        SECTIONS.forEach(section => {
            const input = document.querySelector(`input[data-section="${section.name}"]`);
            if (input) {
                input.value = section.ratio;
            }
        });

        // 重置贡献值
        SECTIONS.forEach(section => {
            if (section.assignable) {
                PARTNERS.forEach(partner => {
                    const select = contributions[section.name][partner];
                    if (select) {
                        select.value = '无';
                    }
                });
            }
        });

        // 清空结果
        document.getElementById('resultLog').textContent = '';
        if (pieChart) {
            pieChart.destroy();
            pieChart = null;
        }

        // 清空本地存储
        localStorage.removeItem('profitDistributionData');
    }
}

function initializeSections() {
    const container = document.getElementById('sectionsContainer');
    container.innerHTML = '';
    
    SECTIONS.forEach(section => {
        const div = document.createElement('div');
        div.className = 'input-group';
        
        const label = document.createElement('label');
        label.textContent = section.name;
        div.appendChild(label);
        
        const input = document.createElement('input');
        input.type = 'number';
        input.value = section.ratio;
        input.step = '0.01';
        input.min = '0';
        input.max = '100';
        input.className = 'ratio-input';
        input.dataset.section = section.name;
        div.appendChild(input);
        
        if (section.assignable) {
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.className = 'assign-checkbox';
            checkbox.dataset.section = section.name;
            checkbox.checked = true;
            div.appendChild(checkbox);
        }
        
        container.appendChild(div);
    });
}

function initializeContributionTable() {
    const table = document.createElement('table');
    const thead = document.createElement('thead');
    const tbody = document.createElement('tbody');
    
    // Create header row
    const headerRow = document.createElement('tr');
    headerRow.appendChild(document.createElement('th')); // Empty cell for section names
    PARTNERS.forEach(partner => {
        const th = document.createElement('th');
        th.textContent = partner;
        headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    
    // Create data rows - only for assignable sections
    SECTIONS.filter(section => section.assignable).forEach((section, sectionIndex) => {
        const row = document.createElement('tr');
        const sectionCell = document.createElement('td');
        sectionCell.textContent = section.name;
        row.appendChild(sectionCell);
        
        // 初始化该板块的贡献存储
        contributions[section.name] = {};
        
        PARTNERS.forEach((partner, partnerIndex) => {
            const cell = document.createElement('td');
            const select = document.createElement('select');
            Object.keys(WEIGHTS_MAP).forEach(weight => {
                const option = document.createElement('option');
                option.value = weight;
                option.textContent = weight;
                select.appendChild(option);
            });
            // Set default value to "无"
            select.value = "无";
            // 存储选择框引用
            contributions[section.name][partner] = select;
            // 添加change事件监听器
            select.addEventListener('change', () => {
                contributions[section.name][partner] = select;
            });
            cell.appendChild(select);
            row.appendChild(cell);
        });
        
        tbody.appendChild(row);
    });
    
    table.appendChild(thead);
    table.appendChild(tbody);
    
    const container = document.getElementById('contributionTable');
    container.innerHTML = ''; // Clear existing content
    container.appendChild(table);
}

function toggleAssignable(index) {
    SECTIONS[index].assignable = !SECTIONS[index].assignable;
}

function calculate() {
    try {
        const totalAmount = parseFloat(document.getElementById('total').value);
        const channelFee = parseFloat(document.getElementById('channel').value);
        const externalCost = parseFloat(document.getElementById('external').value);
        const netProfit = totalAmount - channelFee - externalCost;

        let logs = [
            `🧾 项目总金额：¥${totalAmount.toFixed(2)}`,
            `📦 渠道费用：¥${channelFee.toFixed(2)}`,
            `📦 外包成本：¥${externalCost.toFixed(2)}`,
            `💰 净利润 = ¥${netProfit.toFixed(2)}`
        ];

        // Update section ratios
        let totalCustomRatio = 0;
        SECTIONS.forEach(section => {
            const input = document.querySelector(`input[data-section="${section.name}"]`);
            if (!input) {
                throw new Error(`找不到板块 ${section.name} 的输入框`);
            }
            const ratio = parseFloat(input.value);
            section.ratio = ratio;
            totalCustomRatio += ratio;
        });

        // Normalize ratios if needed
        if (Math.abs(totalCustomRatio - 1.0) > 0.001) {
            logs.push(`⚠️ 板块比例总和为 ${totalCustomRatio.toFixed(2)}，已自动归一化处理`);
            const correctionFactor = 1.0 / totalCustomRatio;
            let normalizedSum = 0;
            
            SECTIONS.slice(0, -1).forEach(section => {
                section.ratio *= correctionFactor;
                normalizedSum += section.ratio;
                logs.push(`  - ${section.name} 比例已自动归一化处理为 ${section.ratio.toFixed(2)}`);
            });
            
            SECTIONS[SECTIONS.length - 1].ratio = 1.0 - normalizedSum;
            logs.push(`  - ${SECTIONS[SECTIONS.length - 1].name} 比例已自动归一化处理为 ${SECTIONS[SECTIONS.length - 1].ratio.toFixed(2)}`);
        }

        // Calculate fixed and available profit
        const fixedSections = SECTIONS.filter(s => !s.assignable);
        const assignableSections = SECTIONS.filter(s => s.assignable);
        const fixedTotal = fixedSections.reduce((sum, s) => sum + s.ratio, 0);
        const availableProfit = netProfit * (1 - fixedTotal);
        logs.push(`🏢 固定板块比例：${fixedTotal.toFixed(2)}，利润：¥${(netProfit * fixedTotal).toFixed(2)}`);
        logs.push(`👥 可分配利润：¥${availableProfit.toFixed(2)}\n`);

        // 回收无效板块利润
        let recycledRatio = 0;
        const effectiveSections = [];
        
        assignableSections.forEach(section => {
            let totalWeight = 0;
            PARTNERS.forEach(partner => {
                const select = contributions[section.name][partner];
                if (select) {
                    totalWeight += WEIGHTS_MAP[select.value];
                }
            });
            
            if (totalWeight === 0) {
                recycledRatio += section.ratio;
                logs.push(`♻️ 板块【${section.name}】因贡献为0被回收`);
            } else {
                effectiveSections.push(section);
            }
        });

        const effectiveTotalRatio = effectiveSections.reduce((sum, s) => sum + s.ratio, 0);
        if (effectiveTotalRatio === 0) {
            throw new Error("所有板块贡献均为 0，无法进行利润分配");
        }

        // 重分配比例修正
        effectiveSections.forEach(section => {
            section.adjustedRatio = (section.ratio + recycledRatio * section.ratio / effectiveTotalRatio) / (1 - fixedTotal);
        });

        // Calculate partner contributions
        const partnerTotal = {};
        PARTNERS.forEach(partner => partnerTotal[partner] = 0);

        logs.push("📌 板块分配明细：\n");
        effectiveSections.forEach(section => {
            const weights = {};
            let totalWeight = 0;
            
            PARTNERS.forEach(partner => {
                const select = contributions[section.name][partner];
                if (select) {
                    const weight = WEIGHTS_MAP[select.value];
                    weights[partner] = weight;
                    totalWeight += weight;
                }
            });

            const sectionProfit = availableProfit * section.adjustedRatio;
            logs.push(`【${section.name}】总利润 ¥${sectionProfit.toFixed(2)}（占可分配利润 ${(section.adjustedRatio * 100).toFixed(2)}%）`);
            
            PARTNERS.forEach(partner => {
                const weight = weights[partner] || 0;
                const share = sectionProfit * weight / totalWeight;
                partnerTotal[partner] += share;
                logs.push(`  - ${partner}：${sectionProfit.toFixed(2)} × ${weight.toFixed(1)}/${totalWeight.toFixed(1)} = ¥${share.toFixed(2)}（贡献：${Object.keys(WEIGHTS_MAP).find(key => WEIGHTS_MAP[key] === weight) || "无"}）`);
            });
            logs.push("");
        });

        // 浮点误差修正
        const sumAllocated = Object.values(partnerTotal).reduce((sum, val) => sum + val, 0);
        const delta = availableProfit - sumAllocated;
        logs.push(`🧮 总分配 = ¥${sumAllocated.toFixed(2)}，理论应分配 = ¥${availableProfit.toFixed(2)}，误差 = ¥${delta.toFixed(2)}`);

        if (Math.abs(delta) >= 0.01) {
            const topPartner = Object.entries(partnerTotal).reduce((a, b) => a[1] > b[1] ? a : b)[0];
            const before = partnerTotal[topPartner];
            partnerTotal[topPartner] += delta;
            logs.push(`⚠️ 已将误差 ¥${delta.toFixed(2)} 分配给 ${topPartner}（原分配 ¥${before.toFixed(2)} → 现分配 ¥${partnerTotal[topPartner].toFixed(2)}）`);
        }

        // Update logs with final results
        logs.push('\n📊 总利润分配结果：');
        PARTNERS.forEach(partner => {
            logs.push(`  - ${partner}：¥${partnerTotal[partner].toFixed(2)}`);
        });

        // Update UI
        document.getElementById('resultLog').textContent = logs.join('\n');
        drawPieChart(partnerTotal);

        // 在计算完成后保存数据
        saveData();

    } catch (error) {
        alert('错误: ' + error.message);
    }
}

function drawPieChart(resultDict) {
    const ctx = document.getElementById('pieChart').getContext('2d');
    
    if (pieChart) {
        pieChart.destroy();
    }
    
    pieChart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: Object.keys(resultDict),
            datasets: [{
                data: Object.values(resultDict),
                backgroundColor: [
                    'rgba(255, 99, 132, 0.8)',
                    'rgba(54, 162, 235, 0.8)',
                    'rgba(255, 206, 86, 0.8)',
                ],
                borderColor: [
                    'rgba(255, 99, 132, 1)',
                    'rgba(54, 162, 235, 1)',
                    'rgba(255, 206, 86, 1)',
                ],
                borderWidth: 1,
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'top',
                },
                title: {
                    display: true,
                    text: '利润分配比例'
                }
            }
        }
    });
}

function exportToImage() {
    try {
        // 获取当前时间戳
        const now = new Date();
        const timestamp = now.toLocaleString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        }).replace(/\//g, '-').replace(/:/g, '-');

        // 更新图表
        if (pieChart) {
            pieChart.update();
        }
        // 获取日志容器并确保其完整显示
        const resultLog = document.getElementById('resultLog');
        if (resultLog) {
            // 移除滚动条相关样式
            resultLog.style.overflow = 'visible';
            resultLog.style.maxHeight = 'none';
            resultLog.style.height = 'auto';
            resultLog.style.position = 'static'; // 确保元素不是fixed或absolute定位
            resultLog.style.transform = 'none'; // 移除任何transform
            // 确保父容器也不限制高度
            if (resultLog.parentElement) {
                resultLog.parentElement.style.overflow = 'visible';
                resultLog.parentElement.style.maxHeight = 'none';
                resultLog.parentElement.style.height = 'auto';
            }
            // 确保内容完整显示
            resultLog.scrollIntoView({ behavior: 'instant', block: 'end' });
        }

        // 稍微等待页面滚动和 DOM 更新
        setTimeout(() => {
            html2canvas(document.body, {
                scale: 2,
                backgroundColor: '#ffffff',
                logging: false,
                useCORS: true
            }).then(canvas => {
                const link = document.createElement('a');
                link.download = `页面截图_${timestamp}.png`;
                link.href = canvas.toDataURL('image/png');
                link.click();
            }).catch(error => {
                console.error('生成图片时出错：', error);
                alert('生成图片时出错：' + error.message);
            });
        }, 600); // 等待页面滚动渲染完成

    } catch (error) {
        console.error('导出图片时出错：', error);
        alert('导出图片时出错：' + error.message);
    }
}