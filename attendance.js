(() => {
  const PANEL_ID = "juno-attendance-panel";
  if (document.getElementById(PANEL_ID)) return;

  const TARGET_PCT = 75; // Standard 75% requirement

  // Create UI Panel
  const panel = document.createElement("div");
  panel.id = PANEL_ID;
  panel.innerHTML = `
    <div class="juno-attendance-header" id="juno-att-drag-handle">
      <div class="juno-attendance-title">
        Attendance Insights
      </div>
      <div class="juno-attendance-header-actions">
        <button class="juno-btn-icon" id="juno-att-btn-refresh" title="Refresh Attendance Data">↺</button>
        <button class="juno-btn-icon" id="juno-att-btn-minimize" title="Minimize / Expand">—</button>
      </div>
    </div>
    <div class="juno-attendance-body">
      <div class="juno-overall-card" id="juno-att-overall-card">
        <div class="juno-overall-header" id="juno-att-overall-title">
          Overall Attendance: Loading...
        </div>
        <div class="juno-overall-advice" id="juno-att-overall-advice">
          Analyzing attendance records...
        </div>
      </div>

      <div class="juno-subject-list" id="juno-att-subject-list">
        <div class="juno-empty-state">Looking for attendance table...</div>
      </div>
    </div>
  `;

  document.body.appendChild(panel);

  // Element references
  const dragHandle = document.getElementById("juno-att-drag-handle");
  const btnMinimize = document.getElementById("juno-att-btn-minimize");
  const btnRefresh = document.getElementById("juno-att-btn-refresh");
  const overallTitle = document.getElementById("juno-att-overall-title");
  const overallAdvice = document.getElementById("juno-att-overall-advice");
  const subjectList = document.getElementById("juno-att-subject-list");

  // Minimize / Expand
  btnMinimize.addEventListener("click", () => {
    panel.classList.toggle("minimized");
    btnMinimize.textContent = panel.classList.contains("minimized") ? "+" : "—";
  });

  // Manual refresh listener
  btnRefresh.addEventListener("click", () => {
    parseAndRenderAttendance();
  });

  // Draggable logic
  let isDragging = false, startX, startY, initialLeft, initialTop;
  dragHandle.addEventListener("mousedown", (e) => {
    if (e.target === btnMinimize || e.target === btnRefresh) return;
    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;
    const rect = panel.getBoundingClientRect();
    initialLeft = rect.left;
    initialTop = rect.top;
    panel.style.right = "auto";
    panel.style.left = `${initialLeft}px`;
    panel.style.top = `${initialTop}px`;
  });

  window.addEventListener("mousemove", (e) => {
    if (!isDragging) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    panel.style.left = `${Math.max(10, Math.min(window.innerWidth - 350, initialLeft + dx))}px`;
    panel.style.top = `${Math.max(10, Math.min(window.innerHeight - 80, initialTop + dy))}px`;
  });

  window.addEventListener("mouseup", () => {
    isDragging = false;
  });

  // Calculate bunk and attendance requirement against 75%
  function calculateAdvice(attended, total) {
    if (total === 0) {
      return {
        pct: "0.00",
        advice: "Attend classes to reach 75%",
        type: "warning"
      };
    }

    const pct = (attended / total) * 100;
    const P = TARGET_PCT / 100; // 0.75

    if (pct < TARGET_PCT) {
      // Must attend x consecutive classes without skipping
      const needed = Math.ceil((P * total - attended) / (1 - P));
      const count = Math.max(1, needed);
      return {
        pct: pct.toFixed(2),
        advice: `Attend at least ${count} more class${count > 1 ? "es" : ""} to reach 75%`,
        type: "danger"
      };
    } else {
      // Can bunk y classes while staying >= 75%
      const canSkip = Math.floor((attended - P * total) / P);
      if (canSkip === 0) {
        return {
          pct: pct.toFixed(2),
          advice: "You're right on edge, do not skip classes to stay above 75%",
          type: "warning"
        };
      } else {
        return {
          pct: pct.toFixed(2),
          advice: `You can bunk ${canSkip} class${canSkip > 1 ? "es" : ""} and still stay above 75%`,
          type: "safe"
        };
      }
    }
  }

  // Parse attendance DOM and render into panel
  function parseAndRenderAttendance() {
    const attendanceDiv = document.getElementById("attendanceDiv");
    if (!attendanceDiv) {
      overallTitle.textContent = "Attendance tab not opened";
      overallAdvice.textContent = "Please navigate to Attendance in the student portal.";
      overallAdvice.className = "juno-overall-advice warning";
      subjectList.innerHTML = `<div class="juno-empty-state">No attendance records found on this view.</div>`;
      return;
    }

    const table = attendanceDiv.querySelector("table");
    if (!table) {
      overallTitle.textContent = "Attendance Table Not Found";
      overallAdvice.textContent = "Click 'Refresh' once the table loads.";
      overallAdvice.className = "juno-overall-advice warning";
      subjectList.innerHTML = `<div class="juno-empty-state">Waiting for attendance table to load...</div>`;
      return;
    }

    const rows = table.querySelectorAll("tbody tr");
    const subjects = [];
    let overallAttended = 0;
    let overallTotal = 0;
    let explicitOverallPct = null;

    rows.forEach((tr) => {
      const tds = tr.querySelectorAll("td");
      const ths = tr.querySelectorAll("th");

      // Check for summary row (has th elements or Total)
      if (ths.length > 0) {
        ths.forEach((th) => {
          const match = th.innerText.match(/(\d+)\s*\/\s*(\d+)/);
          if (match) {
            overallAttended = parseInt(match[1], 10);
            overallTotal = parseInt(match[2], 10);
          }
          const num = parseFloat(th.innerText);
          if (!isNaN(num) && !th.innerText.includes("/")) {
            explicitOverallPct = num;
          }
        });
        return;
      }

      if (tds.length >= 3) {
        const code = tds[0].innerText.trim();
        const courseName = tds[1].innerText.trim();
        const countText = tds[2].innerText.trim();
        const pctText = tds[3] ? tds[3].innerText.trim().replace("%", "") : "";

        const match = countText.match(/(\d+)\s*\/\s*(\d+)/);
        if (match) {
          const attended = parseInt(match[1], 10);
          const total = parseInt(match[2], 10);
          subjects.push({
            code,
            name: courseName,
            attended,
            total,
            pctFromTable: pctText
          });
        }
      }
    });

    // Fallback overall calculation if summary row was not explicit
    if (overallTotal === 0 && subjects.length > 0) {
      subjects.forEach((s) => {
        overallAttended += s.attended;
        overallTotal += s.total;
      });
    }

    // Render Overall Card
    if (overallTotal > 0) {
      const overallCalc = calculateAdvice(overallAttended, overallTotal);
      const displayPct = explicitOverallPct !== null ? explicitOverallPct.toFixed(2) : overallCalc.pct;
      overallTitle.textContent = `Overall Attendance: ${displayPct}% (${overallAttended}/${overallTotal})`;
      overallAdvice.textContent = overallCalc.advice;
      overallAdvice.className = `juno-overall-advice ${overallCalc.type}`;
    } else {
      overallTitle.textContent = "Overall Attendance: Data Unavailable";
      overallAdvice.textContent = "Could not parse total sessions.";
      overallAdvice.className = "juno-overall-advice warning";
    }

    // Render Subjects
    if (subjects.length === 0) {
      subjectList.innerHTML = `<div class="juno-empty-state">No individual courses found in the table.</div>`;
      return;
    }

    let html = "";
    subjects.forEach((sub) => {
      const adviceObj = calculateAdvice(sub.attended, sub.total);
      html += `
        <div class="juno-subject-item">
          <div class="juno-subject-title">${sub.name}</div>
          <div class="juno-subject-stat-row">
            <div>
              <span class="juno-subject-percent ${adviceObj.type}">${adviceObj.pct}%</span>
              <span style="color: #64748b;">(${sub.attended}/${sub.total})</span>
            </div>
            <div class="juno-subject-advice ${adviceObj.type}">
              ${adviceObj.advice}
            </div>
          </div>
        </div>
      `;
    });

    subjectList.innerHTML = html;
  }

  // Observe #attendanceDiv for changes (e.g. semester change or refresh click)
  const observer = new MutationObserver(() => {
    parseAndRenderAttendance();
  });

  const checkAndObserve = () => {
    const target = document.getElementById("attendanceDiv") || document.body;
    observer.observe(target, { childList: true, subtree: true });
    parseAndRenderAttendance();
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", checkAndObserve);
  } else {
    setTimeout(checkAndObserve, 500);
  }
})();
