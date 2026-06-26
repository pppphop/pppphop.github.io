(function () {
  const AI_GRADER_URL = "https://quiz-ai-grader.washerockey.workers.dev/";
  const SUBJECTS = {
    "/military/": "军理",
    "/ethics/": "思修",
    "/os/": "OS",
    "/history/": "史纲"
  };

  function $(id) {
    return document.getElementById(id);
  }

  function subjectName() {
    const path = window.location.pathname;
    return Object.entries(SUBJECTS).find(([prefix]) => path.startsWith(prefix))?.[1] || "刷题";
  }

  function html(text) {
    return String(text || "").replace(/[&<>"']/g, (ch) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    }[ch]));
  }

  function currentQuestionSafe() {
    return typeof window.currentQuestion === "function" ? window.currentQuestion() : null;
  }

  function answerTextSafe(q) {
    if (!q) return "";
    if (typeof window.answerText === "function") return window.answerText(q);
    if (q.type === "fill" && Array.isArray(q.answers)) return q.answers.join(" ");
    return q.answer || "";
  }

  function currentInputValue() {
    return ($("answerInput") || $("textAnswer"))?.value || "";
  }

  function setFeedback(kind, content) {
    const feedback = $("feedback");
    if (!feedback) return;
    feedback.className = `feedback ${kind || ""}`.trim();
    feedback.innerHTML = content;
  }

  function stripJsonFence(text) {
    const raw = String(text || "").trim();
    const fenced = raw.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
    if (fenced) return fenced[1].trim();
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start >= 0 && end > start) return raw.slice(start, end + 1);
    return raw;
  }

  function parseAiPayload(data) {
    const value = data?.result || data?.raw || data;
    if (typeof value === "object" && value) return value;
    try {
      return JSON.parse(stripJsonFence(value));
    } catch {
      return { verdict: "AI 返回未能解析", passed: false, advice: String(value || "无返回内容") };
    }
  }

  function summarizeApiError(status, data) {
    const detail = data?.detail || data;
    const upstreamMessage =
      detail?.error?.message ||
      detail?.error ||
      detail?.message ||
      (typeof detail === "string" ? detail : "");
    const compactDetail = upstreamMessage || JSON.stringify(detail || {}).slice(0, 260);
    return `AI API error${status ? " " + status : ""}${compactDetail ? "：" + compactDetail : ""}`;
  }

  function normalizeAiResult(q, result) {
    const normalized = { ...(result || {}) };
    const minPoints = Number(q?.minPoints || 0);
    const matchedCount = Array.isArray(normalized.matchedPoints) ? normalized.matchedPoints.length : 0;
    const maxScore = Number(normalized.maxScore || 10);

    if (minPoints > 0 && matchedCount >= minPoints) {
      normalized.passed = true;
      normalized.score = maxScore;
      normalized.maxScore = maxScore;
      normalized.verdict = "正确";
      const note = `已命中 ${matchedCount} 点，达到本题“至少答 ${minPoints} 点”的要求，按题目规则记满分。`;
      normalized.advice = normalized.missingPoints?.length
        ? `${note} 其余要点可作为补充记忆：${normalized.missingPoints.join("；")}。`
        : note;
    }

    return normalized;
  }

  function list(items) {
    if (!Array.isArray(items) || !items.length) return "无";
    return items.map((item) => html(item)).join("；");
  }

  function renderAiResult(result, q) {
    const passed = Boolean(result.passed);
    const score = Number.isFinite(Number(result.score)) ? `${result.score}/${result.maxScore || 10}` : "未给分";
    const body = `
      <strong>AI 判定：${html(result.verdict || (passed ? "基本正确" : "需要修改"))}，${html(score)}</strong>
      <span class="answer">命中要点：${list(result.matchedPoints)}</span>
      <span class="answer">遗漏要点：${list(result.missingPoints)}</span>
      <span class="answer">可接受同义表述：${list(result.acceptedSynonyms)}</span>
      <span class="answer">建议：${html(result.advice || "继续按参考答案补齐要点。")}</span>
      <span class="answer">参考答案：${html(answerTextSafe(q))}</span>
    `;
    setFeedback(passed ? "good" : "bad", body);
  }

  function recordAiResult(q, value, result) {
    if (typeof window.markAnswered !== "function") return;
    const score = Number.isFinite(Number(result.score)) ? `${result.score}/${result.maxScore || 10}` : "";
    window.markAnswered(q, value, {
      correct: Boolean(result.passed),
      detail: `AI批改：${result.verdict || ""}${score ? "，" + score : ""}`
    });
    if (typeof window.renderStats === "function") window.renderStats();
  }

  async function gradeWithAi() {
    const q = currentQuestionSafe();
    if (!q) return;
    if (q.type !== "short" && q.type !== "essay") {
      setFeedback("", "AI 批改只用于简答题和论述题；选择、判断、填空继续使用本地判题。");
      return;
    }

    const value = currentInputValue().trim();
    if (!value) {
      setFeedback("bad", "先写下你的答案，再交给 AI 批改。");
      return;
    }

    const btn = $("aiGradeBtn");
    if (btn) {
      btn.disabled = true;
      btn.textContent = "AI 批改中...";
    }
    setFeedback("", "AI 正在批改，会按参考答案和要点宽严适中地判断。");

    try {
      const response = await fetch(AI_GRADER_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: subjectName(),
          type: q.type,
          question: q.prompt,
          studentAnswer: value,
          referenceAnswer: answerTextSafe(q),
          keyPoints: q.keyPoints || [],
          minPoints: q.minPoints || null
        })
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(summarizeApiError(data?.status || response.status, data));
      }
      const result = normalizeAiResult(q, parseAiPayload(data));
      renderAiResult(result, q);
      recordAiResult(q, value, result);
    } catch (error) {
      setFeedback("bad", `AI 批改失败：${html(error.message || error)}<span class="answer">本地判题仍可正常使用。</span>`);
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = "AI 批改";
      }
    }
  }

  function installButton() {
    if ($("aiGradeBtn")) return;
    const checkBtn = $("checkBtn");
    if (!checkBtn || !checkBtn.parentElement) return;
    const button = document.createElement("button");
    button.className = "plain-btn";
    button.type = "button";
    button.id = "aiGradeBtn";
    button.textContent = "AI 批改";
    button.addEventListener("click", gradeWithAi);
    checkBtn.insertAdjacentElement("afterend", button);
  }

  function installStyle() {
    if ($("quizAiStyle")) return;
    const style = document.createElement("style");
    style.id = "quizAiStyle";
    style.textContent = `
      #aiGradeBtn[disabled] {
        cursor: wait;
        opacity: 0.68;
      }
      .feedback strong {
        display: block;
        margin-bottom: 6px;
      }
    `;
    document.head.appendChild(style);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      installStyle();
      installButton();
    });
  } else {
    installStyle();
    installButton();
  }
})();
