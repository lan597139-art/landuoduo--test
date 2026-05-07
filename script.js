$(function () {
  // ========== 1. 初始化 ==========
  $("#quizBox").hide();
  $("#fixedProgress").hide();
  let userAnswers = {};    // 存储答案，key为题号，value为选中的选项值
  let totalQuestions = 0;

  // ========== 2. 开始按钮 ==========
  $("#btnStart").click(function () {
    $("#startBox").fadeOut(300, function() {
      $("#quizBox").fadeIn(300);
      $("#fixedProgress").slideDown(300);
      loadQuiz();
    });
  });

  // ========== 3. 加载题目 ==========
  function loadQuiz() {
    $.getJSON("quiz.json", function (questions) {
      totalQuestions = questions.length;
      let html = "";
      $.each(questions, function (i, q) {
        let no = i + 1;
        let optionsHtml = "";
        // 生成选项：label + text
        $.each(q.options, function (j, opt) {
          optionsHtml += `
            <div class="form-check">
              <input class="form-check-input" type="radio" name="q${no}" 
                     value="${opt.label}" id="q${no}opt${j}">
              <label class="form-check-label" for="q${no}opt${j}">
                ${opt.label}. ${opt.text}
              </label>
            </div>`;
        });
        html += `
          <div class="card mb-4" id="question${no}">
            <div class="card-body">
              <h5 class="card-title">题目 ${no} / ${totalQuestions}</h5>
              <p class="card-text">${q.text}</p>
              <div class="options-container">${optionsHtml}</div>
            </div>
          </div>`;
      });
      $("#quizListBox").html(html);
      // 监听选项变化，更新进度条
      $(".quiz-option").change(function () {
        checkAllAnswered();
      });
    });
  }

  // ========== 4. 进度条 ==========
  function checkAllAnswered() {
    let answered = 0;
    for (let i = 1; i <= totalQuestions; i++) {
      if ($(`input[name="q${i}"]:checked`).length > 0) answered++;
    }
    let progress = Math.round((answered / totalQuestions) * 100);
    $("#progressBar").css("width", `${progress}%`).text(`${progress}%`);
    if (answered === totalQuestions) {
      $("#btnCheckAnswer").prop("disabled", false);
    } else {
      $("#btnCheckAnswer").prop("disabled", true);
    }
  }

  // ========== 5. 提交计算 ==========
  $("#btnCheckAnswer").click(function () {
    $(this).prop('disabled', true);
    $('.quiz-option').prop('disabled', true);

    // 5.1 收集答案（按题号保存选项值）
    $.getJSON("quiz.json", function (questions) {
      $.each(questions, function (i, q) {
        let no = i + 1;
        let val = $(`input[name="q${no}"]:checked`).val();
        if (val) userAnswers[q.id] = val;
      });

      // 5.2 初始化计分池
      let S_pool = { O: 0, V: 0, D: 0, E: 0, T: 0 };
      let N_pool = { PN: 0, AN: 0, RN: 0, IN: 0, MN: 0, FN: 0 };
      let F_pool = { Single_S: 0, Dual_S: 0, Single_N: 0, Dual_N: 0, Chaotic: 0 };
      let Sigma_pool = { σ0: 0, σ1: 0, σ2_switch: 0, σ2_collapse: 0 };
      let Trigger_bills = [];
      let S_logic_pool = { O: 0, V: 0, D: 0, E: 0, T: 0 };
      let Gamma_neg = { A: 0, B: 0, C: 0, D: 0 };
      let Gamma_pos = { A: 0, B: 0, C: 0, D: 0 };
      let epsilon_scores = [];
      let epsilon_pools = { Load: 0, Stress: 0, Emotion: 0, Motive: 0 };

      // 5.3 遍历题目，根据ID前缀分发答案
      $.each(questions, function (i, q) {
        let id = q.id;
        let answer = userAnswers[id];
        if (!answer) return;  // 未作答跳过

        // ---- S_drive: S-C01~S-C06 映射引擎 ----
        if (id.startsWith("S-C")) {
          let mapping = { "A": "O", "B": "V", "C": "D", "D": "E", "E": "T" };
          if (mapping[answer]) S_pool[mapping[answer]] += 2;
        }
        // ---- S_drive: N-C01~N-C06 映射沙盒 ----
        else if (id.startsWith("N-C")) {
          let mapping = { "A": "PN", "B": "AN", "C": "RN", "D": "IN", "E": "MN", "F": "FN" };
          if (mapping[answer]) N_pool[mapping[answer]] += 2;
        }
        // ---- S_drive: C01~C04 映射引擎 ----
        else if (id.startsWith("C0")) {
          let mapping = { "A": "O", "B": "V", "C": "D", "D": "E", "E": "T" };
          if (mapping[answer]) S_pool[mapping[answer]] += 2;
        }
        // ---- S_drive: F01~F04 映射拓扑 ----
        else if (id.startsWith("F0")) {
          // F题组映射较复杂，直接硬编码映射表
          let fMap = {
            "F01": {
              "A": { Single_N: 2, Single_S: 2 },
              "B": { Single_N: 2, Dual_S: 2 },
              "C": { Dual_N: 2, Single_S: 2 },
              "D": { Dual_N: 2, Dual_S: 2 },
              "E": { Chaotic: 2 }
            },
            "F02": {
              "A": { Single_S: 2 },
              "B": { Dual_S: 2 },
              "C": { Dual_S: 1, Single_S: 1 },
              "D": { Dual_S: 2 },
              "E": { Chaotic: 2 }
            },
            "F03": {
              "A": { Single_N: 2 },
              "B": { Dual_N: 2 },
              "C": { Dual_N: 1, Chaotic: 1 },
              "D": { Dual_N: 1, Chaotic: 1 },
              "E": { Chaotic: 2 }
            },
            "F04": {
              "A": { Single_S: 2, Single_N: 2 },
              "B": { Dual_S: 2, Single_N: 2 },
              "C": { Single_S: 2, Dual_N: 2 },
              "D": { Dual_S: 2, Dual_N: 2 },
              "E": { Chaotic: 2 }
            }
          };
          if (fMap[id] && fMap[id][answer]) {
            let add = fMap[id][answer];
            for (let k in add) F_pool[k] += add[k];
          }
        }
        // ---- S_settlement: st- ----
        else if (id.startsWith("st-")) {
          let mapping = { "A": "σ0", "B": "σ1", "C": "σ2_switch", "D": "σ2_collapse" };
          if (mapping[answer]) {
            Sigma_pool[mapping[answer]] += 1;
            if (answer === "C" || answer === "D") {
              let billMap = {
                "st-O01": "结构失守",
                "st-V01": "锚定失守",
                "st-D01": "动力失守",
                "st-E01": "扩张失守",
                "st-T01": "超越失守"
              };
              Trigger_bills.push(billMap[id] || "");
            }
          }
        }
        // ---- S_logic: SL- ----
        else if (id.startsWith("SL-")) {
          let mapping = { "A": "V", "B": "D", "C": "O", "D": "E", "E": "T" };
          if (mapping[answer]) S_logic_pool[mapping[answer]] += 2;
        }
        // ---- Γ 负反馈: Γ-N ----
        else if (id.startsWith("Γ-N")) {
          let mapping = { "A": "A", "B": "B", "C": "C", "D": "D" };
          if (mapping[answer]) Gamma_neg[mapping[answer]]++;
        }
        // ---- Γ 正反馈: Γ-P ----
        else if (id.startsWith("Γ-P")) {
          let mapping = { "A": "A", "B": "B", "C": "C", "D": "D" };
          if (mapping[answer]) Gamma_pos[mapping[answer]]++;
        }
        // ---- ε: ε- ----
        else if (id.startsWith("ε-")) {
          let scoreMap = { "A": 1, "B": 2, "C": 3, "D": 4, "E": 5 };
          if (scoreMap[answer] !== undefined) {
            epsilon_scores.push({ id: id, score: scoreMap[answer] });
          }
        }
      });

      // ========== 6. 结算逻辑 ==========

      // --- ε能量计算 ---
      let loadPool = 0, stressPool = 0, emotionPool = 0, motivePool = 0;
      $.each(epsilon_scores, function (i, item) {
        let num = parseInt(item.id.replace("ε-", ""));
        if (num >= 1 && num <= 4) loadPool += item.score;
        else if (num >= 5 && num <= 8) stressPool += item.score;
        else if (num >= 9 && num <= 12) emotionPool += item.score;
        else if (num >= 13 && num <= 16) motivePool += item.score;
      });
      let epsTotal = loadPool + stressPool + emotionPool + motivePool;
      let epsZone = "";
      let epsText = "";
      if (epsTotal <= 28) epsZone = "红区";
      else if (epsTotal <= 44) epsZone = "橙区";
      else if (epsTotal <= 60) epsZone = "绿区";
      else if (epsTotal <= 72) epsZone = "蓝区";
      else epsZone = "紫区";

      // --- S_drive 极值提取 ---
      let S_sorted = Object.entries(S_pool).sort((a,b) => b[1]-a[1]);
      let S1 = S_sorted[0][0];
      let S2 = S_sorted.length >= 2 ? S_sorted[1][0] : null;
      let N_sorted = Object.entries(N_pool).sort((a,b) => b[1]-a[1]);
      let N1 = N_sorted[0][0];
      let N2 = N_sorted.length >= 2 ? N_sorted[1][0] : null;

      // --- 拓扑结算 ---
      let isDualS = (F_pool.Dual_S >= F_pool.Single_S) && (F_pool.Dual_S > F_pool.Chaotic);
      let isDualN = (F_pool.Dual_N >= F_pool.Single_N) && (F_pool.Dual_N > F_pool.Chaotic);
      let archetype = "";
      if (isDualS && isDualN) archetype = `${S1}+${S2} x ${N1}+${N2}`;
      else if (isDualS && !isDualN) archetype = `${S1}+${S2} x ${N1}`;
      else if (!isDualS && isDualN) archetype = `${S1} x ${N1}+${N2}`;
      else archetype = `${S1} x ${N1}`;

      // --- S_settlement 相变 ---
      let sigmaMax = Math.max(Sigma_pool["σ0"]||0, Sigma_pool["σ1"]||0, Sigma_pool["σ2_switch"]||0, Sigma_pool["σ2_collapse"]||0);
      let dominantSigma = "σ1";
      if (Sigma_pool["σ1"] === sigmaMax) dominantSigma = "σ1";
      else if (Sigma_pool["σ0"] === sigmaMax) dominantSigma = "σ0";
      else if (Sigma_pool["σ2_switch"] === sigmaMax) dominantSigma = "σ2_switch";
      else dominantSigma = "σ2_collapse";

      // --- S_logic L1 ---
      let L1_sorted = Object.entries(S_logic_pool).sort((a,b) => b[1]-a[1]);
      let L1 = L1_sorted[0][0];

      // --- Γ 代谢判定 ---
      function getMetabolismLabel(counts) {
        let maxCount = Math.max(counts.A, counts.B, counts.C, counts.D);
        let dom = "";
        if (counts.D === maxCount) dom = "空转主导";
        else if (counts.C === maxCount) dom = "内源主导";
        else if (counts.B === maxCount) dom = "灰度主导";
        else dom = "外源主导";
        let second = "";
        let sorted = Object.entries(counts).sort((a,b) => b[1]-a[1]);
        if (sorted.length > 1 && sorted[1][1] >= 3 && sorted[1][1] < maxCount) {
          let secKey = sorted[1][0];
          if (secKey === "C") second = "内源辅助";
          else if (secKey === "A") second = "外源辅助";
          else if (secKey === "B") second = "灰度辅助";
          else if (secKey === "D") second = "空转倾向";
        }
        return second ? `${dom} · ${second}` : dom;
      }
      let negMeta = getMetabolismLabel(Gamma_neg);
      let posMeta = getMetabolismLabel(Gamma_pos);

      // ========== 7. 字典文本（简化版） ==========
      let engineName = { O:"结构引擎", V:"锚定引擎", D:"动力引擎", E:"扩张引擎", T:"超越引擎" };
      let sandboxName = { PN:"身体/空间/资源", AN:"成长/能力/路径", RN:"关系/协作", IN:"群体/评价", MN:"意义/信念", FN:"机制/系统" };
      let engineDesc = {
        O: "你一生都在追求秩序对混乱的物理统治，致力于打造精密、可预测的闭环世界。",
        V: "你是动荡中的最后支点，重视安全底座与归属感。",
        D: "你拒绝平庸，在强碰撞中激发生命力，擅长打破僵局。",
        E: "你对存量版图毫无眷恋，嗅觉永远在未知的增量边界。",
        T: "你不住在现成的规则里，你住在逻辑之上的云端，直击第一性原理。"
      };
      let sandboxDesc = {
        FN: "你的力量落在抽象架构上，擅长将现实编码为隐形机制。",
        PN: "你的力量落在物理底盘上，是现实世界的建造者。"
      };

      // ========== 8. 生成报告 ==========
      let reportHtml = `
        <div class="report-container p-4">
          <h2>核心驱动力</h2>
          <p><strong>主引擎：${engineName[S1]}</strong>——${engineDesc[S1]}</p>
          ${S2 ? `<p><strong>副引擎：${engineName[S2]}</strong>——${engineDesc[S2]}</p>` : ""}
          
          <h2>力量主战场</h2>
          <p><strong>主战场：${sandboxName[N1]}</strong>——${sandboxDesc[N1]}</p>
          ${N2 ? `<p><strong>副战场：${sandboxName[N2]}</strong>——${sandboxDesc[N2]}</p>` : ""}
          
          <h2>思维风格</h2>
          <p>拓扑结构：${archetype}</p>
          
          <h2>压力弹性</h2>
          <p>主导相变状态：${dominantSigma}</p>
          
          <h2>危机归因</h2>
          <p>第一归因视角：${engineName[L1]}</p>
          
          <h2>代谢模式</h2>
          <p>负反馈：${negMeta}</p>
          <p>正反馈：${posMeta}</p>
          
          <h2>当前能量状态</h2>
          <p>总评分：${epsTotal}，工况：${epsZone}</p>
        </div>
      `;

      $("#resultBox").html(reportHtml);
      $('html, body').animate({ scrollTop: $("#resultBox").offset().top - 100 }, 1000);
    });
  });
});
