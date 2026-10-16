(() => {
  const PANEL_ID = "juno-autopilot-panel";
  if (document.getElementById(PANEL_ID)) return;

  // State
  let isAutoPilotRunning = false;

  // Toast helper (clean, no emojis)
  function showToast(message, duration = 3000) {
    let toast = document.getElementById("juno-toast-msg");
    if (!toast) {
      toast = document.createElement("div");
      toast.id = "juno-toast-msg";
      toast.className = "juno-toast";
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add("show");
    setTimeout(() => {
      toast.classList.remove("show");
    }, duration);
  }

  // Create UI Panel
  const panel = document.createElement("div");
  panel.id = PANEL_ID;
  panel.innerHTML = `
    <div class="juno-panel-header" id="juno-drag-handle">
      <div class="juno-panel-title">
        JUNO Feedback Auto-Pilot
      </div>
      <button class="juno-btn-icon" id="juno-btn-minimize" title="Minimize / Expand">—</button>
    </div>
    <div class="juno-panel-body">
      <div class="juno-status-badge" id="juno-status-badge">
        Detecting stage...
      </div>

      <div class="juno-form-group">
        <label for="juno-rating-select">Rating to Fill:</label>
        <select id="juno-rating-select" class="juno-select">
          <option value="0" selected>Excellent (5/5)</option>
          <option value="1">Very Good (4/5)</option>
          <option value="2">Good (3/5)</option>
          <option value="3">Satisfactory (2/5)</option>
          <option value="4">Not Satisfactory (1/5)</option>
          <option value="realistic">Realistic Mix (80% Excellent, 20% Very Good)</option>
        </select>
      </div>

      <div class="juno-form-group">
        <label for="juno-comment-text">Suggestions & Comments:</label>
        <select id="juno-comment-select" class="juno-select" style="margin-bottom: 4px;">
          <option value="NA" selected>Standard: "NA"</option>
          <option value="Teaching methodology is clear and concepts explained well.">Positive: "Teaching is clear..."</option>
          <option value="Satisfied with course delivery and doubt solving.">Positive: "Satisfied with course..."</option>
          <option value="Good classroom interaction and helpful faculty.">Positive: "Good interaction..."</option>
          <option value="custom">Custom text...</option>
        </select>
        <input type="text" id="juno-comment-custom" class="juno-input" placeholder="Type custom comment" style="display: none;" value="NA">
      </div>

      <button id="juno-btn-start-all" class="juno-btn juno-btn-primary">
        Auto-Fill & Complete All
      </button>

      <button id="juno-btn-fill-current" class="juno-btn juno-btn-secondary">
        Fill Current Stage Only
      </button>

      <button id="juno-btn-stop" class="juno-btn juno-btn-danger" style="display: none;">
        Stop Auto-Pilot
      </button>

      <div class="juno-progress-text" id="juno-progress-text">Ready to start</div>
    </div>
  `;

  document.body.appendChild(panel);

  // Cache element references
  const statusBadge = document.getElementById("juno-status-badge");
  const progressText = document.getElementById("juno-progress-text");
  const ratingSelect = document.getElementById("juno-rating-select");
  const commentSelect = document.getElementById("juno-comment-select");
  const commentCustom = document.getElementById("juno-comment-custom");
  const btnStartAll = document.getElementById("juno-btn-start-all");
  const btnFillCurrent = document.getElementById("juno-btn-fill-current");
  const btnStop = document.getElementById("juno-btn-stop");
  const btnMinimize = document.getElementById("juno-btn-minimize");
  const dragHandle = document.getElementById("juno-drag-handle");

  // Toggle custom comment input
  commentSelect.addEventListener("change", () => {
    if (commentSelect.value === "custom") {
      commentCustom.style.display = "block";
      commentCustom.focus();
    } else {
      commentCustom.style.display = "none";
    }
  });

  // Minimize / Expand
  btnMinimize.addEventListener("click", () => {
    panel.classList.toggle("minimized");
    btnMinimize.textContent = panel.classList.contains("minimized") ? "+" : "—";
  });

  // Draggable logic
  let isDragging = false, startX, startY, initialLeft, initialTop;
  dragHandle.addEventListener("mousedown", (e) => {
    if (e.target === btnMinimize) return;
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
    panel.style.left = `${Math.max(10, Math.min(window.innerWidth - 330, initialLeft + dx))}px`;
    panel.style.top = `${Math.max(10, Math.min(window.innerHeight - 80, initialTop + dy))}px`;
  });

  window.addEventListener("mouseup", () => {
    isDragging = false;
  });

  // Helper to get active comment text
  function getSelectedComment() {
    if (commentSelect.value === "custom") {
      return (commentCustom.value || "NA").trim();
    }
    return commentSelect.value;
  }

  // Helper to determine target radio index
  function getTargetRadioIndex(availableLength) {
    const setting = ratingSelect.value;
    if (setting === "realistic") {
      // 80% chance of Excellent (0), 20% chance of Very Good (1)
      const pick = Math.random() < 0.8 ? 0 : 1;
      return Math.min(pick, availableLength - 1);
    }
    const idx = parseInt(setting, 10);
    return Math.min(isNaN(idx) ? 0 : idx, availableLength - 1);
  }

  // Clean detection of current stage title
  function detectCurrentStageTitle() {
    const facultyDetailTable = document.getElementById("tblFacultyDetail");
    if (!facultyDetailTable) return "Feedback Form";

    const rows = facultyDetailTable.querySelectorAll("tr");
    let facultyName = "";
    let courseName = "";
    let headerType = "";

    rows.forEach((tr) => {
      const text = tr.innerText || "";
      if (text.includes("Institute Feedback")) headerType = "Institute Feedback";
      else if (text.includes("Programme Feedback") || text.includes("Department Feedback")) {
        headerType = "Department Feedback";
      }

      if (text.includes("Faculty Name")) {
        const parts = text.split("Faculty Name");
        if (parts[1]) facultyName = parts[1].trim();
      }
      if (text.includes("Course Name")) {
        const parts = text.split("Course Name");
        if (parts[1]) {
          courseName = parts[1].split("Course Code")[0].trim();
        }
      }
    });

    if (facultyName && courseName) {
      return `${facultyName} (${courseName})`;
    }
    if (facultyName) return facultyName;
    if (headerType) return headerType;

    return facultyDetailTable.innerText.split("\n")[0].trim() || "Feedback Form";
  }

  // Update current stage status in UI
  function updateStageStatus() {
    const feedbackContent = document.getElementById("divFeedbackContent");
    const planSelect = document.getElementById("cmbFeedbackPlans");

    if (feedbackContent && feedbackContent.textContent.includes("Thanks for your valuable time and feedback")) {
      statusBadge.className = "juno-status-badge completed";
      statusBadge.textContent = "All Feedbacks Completed & Submitted Successfully";
      progressText.textContent = "Finished";
      return "completed";
    }

    if (planSelect && (!planSelect.value || planSelect.value === "0")) {
      statusBadge.className = "juno-status-badge";
      statusBadge.textContent = "Please select a Feedback Plan above";
      progressText.textContent = "Waiting for plan selection";
      return "waiting_plan";
    }

    const stageTitle = detectCurrentStageTitle();
    statusBadge.className = "juno-status-badge";
    statusBadge.textContent = stageTitle;
    return "ready";
  }

  // Fill the currently visible stage
  function fillCurrentStage() {
    const comment = getSelectedComment();
    let ratingsCount = 0;
    let commentsCount = 0;

    // 1. Fill Radio ratings
    document.querySelectorAll("table.tblSchemaMatrix").forEach((table) => {
      const groups = new Map();
      table.querySelectorAll('input[type="radio"]').forEach((radio) => {
        if (!radio.name) return;
        if (!groups.has(radio.name)) groups.set(radio.name, []);
        groups.get(radio.name).push(radio);
      });

      groups.forEach((radios) => {
        if (radios.length === 0) return;
        const targetIndex = getTargetRadioIndex(radios.length);
        const targetRadio = radios[targetIndex] || radios[0];

        if (targetRadio) {
          targetRadio.checked = true;
          targetRadio.dispatchEvent(new Event("click", { bubbles: true }));
          targetRadio.dispatchEvent(new Event("input", { bubbles: true }));
          targetRadio.dispatchEvent(new Event("change", { bubbles: true }));
          ratingsCount++;
        }
      });

      // 2. Fill numeric select dropdowns (if present)
      table.querySelectorAll('select[id^="selectBox_"]').forEach((select) => {
        if (select.options.length > 1) {
          select.selectedIndex = select.options.length - 1;
          select.dispatchEvent(new Event("change", { bubbles: true }));
        }
      });
    });

    // 3. Fill all textareas (suggestions, mandatory fields, comments)
    document.querySelectorAll("textarea").forEach((textarea) => {
      if (textarea.offsetParent === null && !textarea.id.includes("Comment")) return;
      textarea.value = comment;
      textarea.dispatchEvent(new Event("input", { bubbles: true }));
      textarea.dispatchEvent(new Event("change", { bubbles: true }));
      commentsCount++;
    });

    return { ratingsCount, commentsCount };
  }

  // Single stage fill button
  btnFillCurrent.addEventListener("click", () => {
    const { ratingsCount, commentsCount } = fillCurrentStage();
    showToast(`Filled ${ratingsCount} ratings & ${commentsCount} comments.`);
    progressText.textContent = "Prefilled current stage";
  });

  // Stop Auto-Pilot
  function stopAutoPilot(msg = "Auto-Pilot stopped.") {
    isAutoPilotRunning = false;
    btnStartAll.style.display = "flex";
    btnFillCurrent.style.display = "flex";
    btnStop.style.display = "none";
    statusBadge.classList.remove("running");
    progressText.textContent = msg;
    showToast(msg);
  }

  btnStop.addEventListener("click", () => {
    stopAutoPilot("Auto-Pilot stopped by user.");
  });

  // Sleep utility
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  // Run full automation loop across all stages
  async function runAutoPilot() {
    if (isAutoPilotRunning) return;

    // Check if feedback plan needs to be selected
    const planSelect = document.getElementById("cmbFeedbackPlans");
    if (planSelect && (!planSelect.value || planSelect.value === "0")) {
      if (planSelect.options.length > 1) {
        planSelect.selectedIndex = 1;
        planSelect.dispatchEvent(new Event("change", { bubbles: true }));
        progressText.textContent = "Selected feedback plan. Loading form...";
        await sleep(1500);
      } else {
        alert("Please select a feedback plan from the dropdown first.");
        return;
      }
    }

    isAutoPilotRunning = true;
    btnStartAll.style.display = "none";
    btnFillCurrent.style.display = "none";
    btnStop.style.display = "flex";
    statusBadge.classList.add("running");

    let stageCounter = 1;
    const maxStages = 30; // Safety guard

    while (isAutoPilotRunning && stageCounter <= maxStages) {
      updateStageStatus();

      // Check if finished
      const feedbackContent = document.getElementById("divFeedbackContent");
      if (feedbackContent && feedbackContent.textContent.includes("Thanks for your valuable time and feedback")) {
        statusBadge.className = "juno-status-badge completed";
        statusBadge.textContent = "All Feedbacks Completed & Submitted Successfully";
        stopAutoPilot("All feedbacks finished & submitted.");
        return;
      }

      const saveBtn = document.getElementById("btnSaveFeedBack");
      if (!saveBtn) {
        progressText.textContent = "Waiting for next stage to render...";
        await sleep(600);
        if (!document.getElementById("btnSaveFeedBack")) {
          // Check if completion screen rendered
          if (feedbackContent && feedbackContent.textContent.includes("Thanks for your valuable time and feedback")) {
            statusBadge.className = "juno-status-badge completed";
            statusBadge.textContent = "All Feedbacks Completed & Submitted Successfully";
            stopAutoPilot("All stages submitted successfully.");
            return;
          }
          await sleep(600);
        }
        continue;
      }

      // 1. Fill current stage
      progressText.textContent = `Filling stage ${stageCounter}...`;
      fillCurrentStage();
      await sleep(350);

      if (!isAutoPilotRunning) break;

      // 2. Click Save and Next
      progressText.textContent = `Saving stage ${stageCounter} & loading next...`;
      saveBtn.click();
      stageCounter++;

      // 3. Wait for transition
      await sleep(800);

      // Verify if completion alert rendered after click
      if (feedbackContent && feedbackContent.textContent.includes("Thanks for your valuable time and feedback")) {
        statusBadge.className = "juno-status-badge completed";
        statusBadge.textContent = "All Feedbacks Completed & Submitted Successfully";
        stopAutoPilot("All stages completed and submitted.");
        return;
      }
    }

    if (stageCounter > maxStages) {
      stopAutoPilot("Reached safety limit. Please check status.");
    }
  }

  btnStartAll.addEventListener("click", () => {
    runAutoPilot();
  });

  // Watch for DOM changes to update stage title automatically
  const observer = new MutationObserver(() => {
    if (!isAutoPilotRunning) {
      updateStageStatus();
    }
  });

  const targetNode = document.getElementById("divFeedbackContent") || document.body;
  observer.observe(targetNode, { childList: true, subtree: true });

  // Initial stage check
  setTimeout(updateStageStatus, 800);
})();