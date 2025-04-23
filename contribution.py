import tkinter as tk
from tkinter import ttk, messagebox
from tkinter.scrolledtext import ScrolledText
from matplotlib.backends.backend_tkagg import FigureCanvasTkAgg
import matplotlib.pyplot as plt

partners = ["X", "Y", "G"]
sections = [
    {"name": "市场与转化", "ratio": 0.3, "assignable": True},      # 客户引流、成交
    {"name": "交付与执行", "ratio": 0.3, "assignable": True},      # 项目落地、内容/产品输出
    {"name": "IP支持", "ratio": 0.1, "assignable": True},     # 技术栈、版权、工具支持
    {"name": "运营与维护", "ratio": 0.2, "assignable": True},      # 客户服务、节奏推进
    {"name": "平台资产", "ratio": 0.1, "assignable": False}        # 公司未来发展预留
]

weights_map = {"无": 0.0, "辅助": 0.3, "主导": 0.7}
contributions = {}

def refresh_contribution_table():
    for widget in frame_table.winfo_children():
        widget.destroy()
    for j, partner in enumerate(partners):
        tk.Label(frame_table, text=partner, padx=6).grid(row=0, column=j+1)
    for i, sec in enumerate(sections):
        tk.Label(frame_table, text=sec["name"], anchor="w", padx=6).grid(row=i+1, column=0, sticky="w")
        for j, partner in enumerate(partners):
            cb = ttk.Combobox(frame_table, values=["无", "辅助", "主导"], width=6)
            cb.current(0)
            cb.grid(row=i+1, column=j+1)
            contributions.setdefault(partner, {})[sec["name"]] = cb

def toggle_assignable(section_index):
    sections[section_index]["assignable"] = not sections[section_index]["assignable"]

def calculate():
    try:
        total_amount = float(entry_total.get())
        channel_fee = float(entry_channel.get())
        external_cost = float(entry_external.get())
        net_profit = total_amount - channel_fee - external_cost

        logs = [
            f"🧾 项目总金额：¥{total_amount:.2f}",
            f"📦 渠道费用：¥{channel_fee:.2f}",
            f"📦 外包成本：¥{external_cost:.2f}",
            f"💰 净利润 = ¥{net_profit:.2f}"
        ]

        # 获取板块设置（用户设定的比例）
        assignable_sections = []
        fixed_sections = []
        total_custom_ratio = 0.0

        for s in sections:
            try:
                ratio = float(s["entry"].get())
            except:
                raise ValueError(f"板块『{s['name']}』比例格式错误")
            s["ratio"] = ratio
            total_custom_ratio += ratio
            if s["assignable"]:
                assignable_sections.append(s)
            else:
                fixed_sections.append(s)

        # 显示归一化提示（如总比例≠1）
        if abs(total_custom_ratio - 1.0) > 0.001:
            logs.append(f"⚠️ 板块比例总和为 {total_custom_ratio:.2f}，已自动归一化处理")
            # 计算归一化因子
            correction_factor = 1.0 / total_custom_ratio
            # 应用归一化并确保总和为1
            normalized_sum = 0.0
            for s in sections[:-1]:  # 除了最后一个板块
                s["ratio"] = s["ratio"] * correction_factor
                normalized_sum += s["ratio"]
                logs.append(f"  - {s['name']} 比例已自动归一化处理为 {s['ratio']:.2f}")
            # 最后一个板块通过差值确保总和为1
            sections[-1]["ratio"] = 1.0 - normalized_sum
            logs.append(f"  - {sections[-1]['name']} 比例已自动归一化处理为 {sections[-1]['ratio']:.2f}")

        # 重新计算总比例（归一化后）
        fixed_total = sum(s["ratio"] for s in fixed_sections)
        available_profit = net_profit * (1 - fixed_total)
        logs.append(f"🏢 固定板块比例：{fixed_total:.2f}，利润：¥{net_profit * fixed_total:.2f}")
        logs.append(f"👥 可分配利润：¥{available_profit:.2f}\n")

        # 回收无效板块利润
        effective_sections = []
        recycled_ratio = 0.0
        for sec in assignable_sections:
            total_weight = sum(weights_map[contributions[p][sec["name"]].get()] for p in partners)
            if total_weight == 0:
                recycled_ratio += sec["ratio"]
                logs.append(f"♻️ 板块【{sec['name']}】因贡献为0被回收")
            else:
                effective_sections.append(sec)

        effective_total_ratio = sum(s["ratio"] for s in effective_sections)
        if effective_total_ratio == 0:
            raise ValueError("所有板块贡献均为 0，无法进行利润分配")

        # 重分配比例修正
        for s in effective_sections:
            s["adjusted_ratio"] = (s["ratio"] + recycled_ratio * s["ratio"]/effective_total_ratio)/(1 - fixed_total)

        partner_total = {p: 0.0 for p in partners}
        logs.append("📌 板块分配明细：\n")

        for sec in effective_sections:
            sec_profit = round(available_profit * sec["adjusted_ratio"], 2)
            weights = {p: weights_map[contributions[p][sec["name"]].get()] for p in partners}
            total_w = sum(weights.values()) or 1
            logs.append(f"【{sec['name']}】总利润 ¥{sec_profit:.2f}（占可分配利润 {sec['adjusted_ratio']*100:.2f}%）")
            for p in partners:
                weight = weights[p]
                share = round(sec_profit * weight / total_w, 2)
                partner_total[p] += share
                logs.append(
                    f"  - {p}：{sec_profit} × {weight:.1f}/{total_w:.1f} = ¥{share:.2f}（贡献：{contributions[p][sec['name']].get()}）"
                )
            logs.append("")

        # 浮点误差修正
        sum_allocated = sum(partner_total.values())
        delta = round(available_profit - sum_allocated, 2)
        logs.append(f"🧮 总分配 = ¥{sum_allocated:.2f}，理论应分配 = ¥{available_profit:.2f}，误差 = ¥{delta:+.2f}")

        if abs(delta) >= 0.01:
            top_partner = max(partner_total, key=partner_total.get)
            before = partner_total[top_partner]
            partner_total[top_partner] += delta
            logs.append(f"⚠️ 已将误差 ¥{delta:+.2f} 分配给 {top_partner}（原分配 ¥{before:.2f} → 现分配 ¥{partner_total[top_partner]:.2f}）")

        logs.append("\n📊 总利润分配结果：")
        for p in partners:
            logs.append(f"  - {p}：¥{partner_total[p]:.2f}")

        # 更新日志 & 图表
        text_log.delete("1.0", tk.END)
        text_log.insert(tk.END, "\n".join(logs))
        draw_pie_chart(partner_total)

    except Exception as e:
        messagebox.showerror("错误", str(e))
        
def draw_pie_chart(result_dict):
    fig.clear()
    ax = fig.add_subplot(111)
    sizes = list(result_dict.values())
    labels = list(result_dict.keys())
    ax.pie(sizes, labels=labels, autopct='%1.1f%%', startangle=90)
    ax.set_title("💰 合伙人利润分配图")
    pie_canvas.draw()

# ========== GUI 开始 ========== #
root = tk.Tk()
root.title("合伙人利润分配工具（高级版）")

# 创建主框架
main_frame = tk.Frame(root)
main_frame.pack(padx=10, pady=5, fill="both", expand=True)

# 创建顶部框架
top_frame = tk.Frame(main_frame)
top_frame.pack(fill="x", expand=True)

# 左上：项目参数和板块设置
frame_left = tk.Frame(top_frame)
frame_left.pack(side="left", fill="both", expand=True, padx=5)

# 项目参数
frame_params = tk.LabelFrame(frame_left, text="🧾 项目参数")
frame_params.pack(fill="x", padx=5, pady=5)

tk.Label(frame_params, text="项目金额").grid(row=0, column=0, padx=5, pady=2)
entry_total = tk.Entry(frame_params)
entry_total.insert(0, "18000")
entry_total.grid(row=0, column=1, padx=5, pady=2)

tk.Label(frame_params, text="渠道费用").grid(row=1, column=0, padx=5, pady=2)
entry_channel = tk.Entry(frame_params)
entry_channel.insert(0, "3800")
entry_channel.grid(row=1, column=1, padx=5, pady=2)

tk.Label(frame_params, text="外包成本").grid(row=2, column=0, padx=5, pady=2)
entry_external = tk.Entry(frame_params)
entry_external.insert(0, "3600")
entry_external.grid(row=2, column=1, padx=5, pady=2)

# 板块设置
frame_sections = tk.LabelFrame(frame_left, text="🧱 板块设置（可编辑比例）")
frame_sections.pack(fill="x", padx=5, pady=5)

for i, sec in enumerate(sections):
    tk.Label(frame_sections, text=sec["name"]).grid(row=i, column=0, padx=5, pady=2)
    sec["entry"] = tk.Entry(frame_sections, width=6)
    sec["entry"].insert(0, str(sec["ratio"]))
    sec["entry"].grid(row=i, column=1, padx=5, pady=2)
    chk = tk.Checkbutton(frame_sections, text="参与分配", command=lambda idx=i: toggle_assignable(idx))
    chk.grid(row=i, column=2, padx=5, pady=2)
    if sec["assignable"]:
        chk.select()
    else:
        chk.deselect()

# 右上：合伙人贡献表
frame_right = tk.Frame(top_frame)
frame_right.pack(side="right", fill="both", expand=True, padx=5)

# 合伙人表格区域
frame_contrib = tk.LabelFrame(frame_right, text="👥 合伙人贡献表")
frame_contrib.pack(fill="both", expand=True, padx=5, pady=5)

frame_table = tk.Frame(frame_contrib)
frame_table.pack(padx=5, pady=5)

refresh_contribution_table()

# 底部：计算结果和图表
frame_bottom = tk.LabelFrame(main_frame, text="📊 计算结果")
frame_bottom.pack(fill="both", expand=True, padx=5, pady=5)

# 计算按钮
tk.Button(frame_bottom, text="📐 计算利润分配", command=calculate, bg="green", fg="white").pack(pady=5)

# 图表和日志区域
result_frame = tk.Frame(frame_bottom)
result_frame.pack(padx=5, pady=5, fill="both", expand=True)

fig = plt.Figure(figsize=(4.5, 3), dpi=100)
pie_canvas = FigureCanvasTkAgg(fig, master=result_frame)
pie_canvas.get_tk_widget().pack(side="left", padx=5)

text_log = ScrolledText(result_frame, width=60, height=20)
text_log.pack(side="right", padx=5, fill="both", expand=True)

root.mainloop()